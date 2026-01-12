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
const editor = document.getElementById('main-editor');
const elements = ["scene-heading", "action", "character", "parenthetical", "dialogue", "transition"];
let currentUser = null;

// --- PAGE FACTORY ---
function checkPageOverflow(currentPage) {
    const PAGE_LIMIT = 960; // Approximate 11 inches in pixels
    if (currentPage.scrollHeight > PAGE_LIMIT) {
        let nextP = currentPage.nextElementSibling;
        if (!nextP || !nextP.classList.contains('paper-page')) {
            nextP = document.createElement('div');
            nextP.className = 'paper-page';
            nextP.contentEditable = true;
            currentPage.after(nextP);
        }
        nextP.prepend(currentPage.lastElementChild);
        return nextP;
    }
    return null;
}

// --- UI HELPERS ---
window.toggleLegend = () => {
    const leg = document.getElementById('legend-overlay');
    leg.style.display = (leg.style.display === 'flex') ? 'none' : 'flex';
};
window.toggleFocusMode = () => document.body.classList.toggle('focus-mode');

// --- AUTH & SYNC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        onSnapshot(doc(db, "scripts", user.uid), (snap) => {
            if (snap.exists() && !editor.contains(document.activeElement)) {
                const data = snap.data();
                editor.innerHTML = data.content || '<div class="paper-page" contenteditable="true"><div class="line scene-heading" data-type="scene-heading">INT. NEW PROJECT - DAY</div></div>';
                document.getElementById('beat-container').innerHTML = data.beats || "<b>BEAT SHEET:</b>";
                document.getElementById('char-container').innerHTML = data.chars || "<b>CHARACTERS:</b>";
                updateStats();
                updateNavigator();
            }
        });
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

// --- KEYBOARD ---
document.addEventListener('keydown', (e) => {
    const sel = window.getSelection();
    const line = sel.anchorNode?.parentElement?.closest('.line');
    const currentPage = sel.anchorNode?.parentElement?.closest('.paper-page');

    if (e.ctrlKey && (e.key === '/' || e.code === 'Slash')) { e.preventDefault(); window.toggleLegend(); return; }
    if (e.ctrlKey && e.key === '\\') { e.preventDefault(); window.toggleFocusMode(); return; }

    if (!line || !currentPage) return;

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
        checkPageOverflow(currentPage);
        saveToCloud();
        updateStats();
    }
});

// --- DATA ---
async function saveToCloud() {
    if (currentUser) {
        await setDoc(doc(db, "scripts", currentUser.uid), {
            content: editor.innerHTML,
            beats: document.getElementById('beat-container').innerHTML,
            chars: document.getElementById('char-container').innerHTML
        }, { merge: true });
    }
}

function updateStats() {
    document.getElementById('stat-pages').innerText = document.querySelectorAll('.paper-page').length;
    document.getElementById('stat-words').innerText = editor.innerText.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function updateNavigator() {
    const list = document.getElementById('scene-list');
    list.innerHTML = "";
    editor.querySelectorAll('.scene-heading').forEach(s => {
        const item = document.createElement('div');
        item.className = 'nav-item mb-1';
        item.innerText = s.innerText || "NEW SCENE";
        item.onclick = () => s.scrollIntoView({ behavior: 'smooth' });
        list.appendChild(item);
    });
}

// Sidebar Buttons
document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
document.getElementById('help-btn').onclick = window.toggleLegend;
document.getElementById('focus-btn').onclick = window.toggleFocusMode;
document.getElementById('pdf-btn').onclick = () => html2pdf().from(editor).save();
document.getElementById('legend-overlay').onclick = window.toggleLegend;
document.getElementById('beats-tab-btn').onclick = () => { document.getElementById('tab-beats').style.display = 'block'; document.getElementById('tab-chars').style.display = 'none'; };
document.getElementById('chars-tab-btn').onclick = () => { document.getElementById('tab-beats').style.display = 'none'; document.getElementById('tab-chars').style.display = 'block'; };

editor.addEventListener('input', () => { saveToCloud(); updateStats(); });
