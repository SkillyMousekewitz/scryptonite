import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCMJ8mkBdyhLDbC6RmaVK9zWl-XSms6RoA",
    authDomain: "scryptonite-6a340.firebaseapp.com",
    projectId: "scryptonite-6a340",
    storageBucket: "scryptonite-6a340.firebasestorage.app",
    messagingSenderId: "875468928578",
    appId: "1:875468928578:web:524ae574d4c84593a49fdb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
let currentUser = null;

const container = document.getElementById('script-container');
const elements = ["scene-heading", "action", "character", "parenthetical", "dialogue", "transition"];

// --- AUTH LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        startSync(user.uid);
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- KEYBOARD ENGINE ---
container.addEventListener('keydown', (e) => {
    const sel = window.getSelection();
    const line = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement.closest('.line') : sel.anchorNode?.closest?.('.line');
    
    // Commands
    if (e.ctrlKey && (e.key === '/' || e.code === 'Slash')) { e.preventDefault(); toggleLegend(); return; }
    if (e.ctrlKey && e.key === '\\') { e.preventDefault(); toggleFocusMode(); return; }

    if (!line) return;

    if (e.key === 'Tab') {
        e.preventDefault();
        let idx = (elements.indexOf(line.dataset.type) + (e.shiftKey ? -1 : 1) + elements.length) % elements.length;
        line.className = `line ${elements[idx]}`;
        line.dataset.type = elements[idx];
        updateNavigator();
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        const nextType = { "character": "dialogue", "scene-heading": "action", "dialogue": "action" }[line.dataset.type] || "action";
        const newLine = document.createElement('div');
        newLine.className = `line ${nextType}`;
        newLine.dataset.type = nextType;
        newLine.innerHTML = "&#8203;";
        line.after(newLine);
        const range = document.createRange();
        range.setStart(newLine.firstChild, 0);
        range.collapse(true);
        sel.removeAllRanges(); sel.addRange(range);
        updateStats();
    }
});

// --- UI & SYNC ---
container.addEventListener('input', () => { saveToCloud(); updateStats(); });

async function saveToCloud() {
    if (currentUser) {
        await setDoc(doc(db, "scripts", currentUser.uid), {
            content: container.innerHTML,
            beats: document.getElementById('beat-container').innerHTML,
            chars: document.getElementById('char-container').innerHTML
        }, { merge: true });
    }
}

function startSync(uid) {
    onSnapshot(doc(db, "scripts", uid), (snap) => {
        if (snap.exists() && document.activeElement !== container) {
            const data = snap.data();
            container.innerHTML = data.content || '<div class="line scene-heading" data-type="scene-heading">INT. NEW PROJECT - DAY</div>';
            document.getElementById('beat-container').innerHTML = data.beats || "<b>BEAT SHEET:</b>";
            document.getElementById('char-container').innerHTML = data.chars || "<b>CHARACTERS:</b>";
            updateStats();
            updateNavigator();
        }
    });
}

function updateStats() {
    document.getElementById('stat-pages').innerText = Math.max(1, Math.ceil(container.scrollHeight / 1056));
    document.getElementById('stat-words').innerText = container.innerText.trim().split(/\s+/).length;
}

function updateNavigator() {
    const list = document.getElementById('scene-list');
    list.innerHTML = "";
    container.querySelectorAll('.scene-heading').forEach(s => {
        const item = document.createElement('div');
        item.className = 'nav-item mb-1';
        item.innerText = s.innerText || "NEW SCENE";
        item.onclick = () => s.scrollIntoView({ behavior: 'smooth' });
        list.appendChild(item);
    });
}

// --- GLOBAL HELPERS ---
window.toggleLegend = () => {
    const leg = document.getElementById('legend-overlay');
    leg.style.display = leg.style.display === 'flex' ? 'none' : 'flex';
};
window.toggleFocusMode = () => document.body.classList.toggle('focus-mode');
window.switchTab = (tab) => {
    document.getElementById('tab-beats').style.display = tab === 'beats' ? 'block' : 'none';
    document.getElementById('tab-chars').style.display = tab === 'chars' ? 'block' : 'none';
};

// --- PDF EXPORT ---
window.exportToPDF = () => {
    const opt = {
        margin: [1, 0, 1, 0],
        filename: 'script.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(container).save();
};

// Event Listeners for UI
document.getElementById('help-btn').onclick = window.toggleLegend;
document.getElementById('focus-btn').onclick = window.toggleFocusMode;
document.getElementById('pdf-btn').onclick = window.exportToPDF;
document.getElementById('legend-overlay').onclick = window.toggleLegend;
document.getElementById('beats-tab-btn').onclick = () => window.switchTab('beats');
document.getElementById('chars-tab-btn').onclick = () => window.switchTab('chars');
