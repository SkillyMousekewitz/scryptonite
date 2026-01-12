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

const editor = document.getElementById('main-editor');
const elements = ["scene-heading", "action", "character", "parenthetical", "dialogue", "transition"];

// --- 1. THE PAGE FACTORY ENGINE ---
function checkPageOverflow(currentPage) {
    const PAGE_LIMIT = 960; // Standard 11-inch height limit in pixels
    
    if (currentPage.scrollHeight > PAGE_LIMIT) {
        let nextP = currentPage.nextElementSibling;
        if (!nextP || !nextP.classList.contains('paper-page')) {
            nextP = document.createElement('div');
            nextP.className = 'paper-page';
            nextP.contentEditable = true;
            currentPage.after(nextP);
        }

        const lastElement = currentPage.lastElementChild;
        
        // Move the overflowing element (or dialogue-group) to the next page
        nextP.prepend(lastElement);
        return nextP;
    }
    return null;
}

// --- 2. AUTH LOGIC ---
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

// --- 3. KEYBOARD & INPUT ENGINE ---
document.addEventListener('keydown', (e) => {
    const sel = window.getSelection();
    // Locate the line and the specific page it belongs to
    const line = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement.closest('.line') : sel.anchorNode?.closest?.('.line');
    const currentPage = sel.anchorNode?.parentElement?.closest('.paper-page');
    
    if (!line || !currentPage) return;

    // Help & Focus Shortcuts
    if (e.ctrlKey && (e.key === '/' || e.code === 'Slash')) { e.preventDefault(); toggleLegend(); return; }
    if (e.ctrlKey && e.key === '\\') { e.preventDefault(); toggleFocusMode(); return; }

    if (e.key === 'Tab') {
        e.preventDefault();
        let idx = (elements.indexOf(line.dataset.type) + (e.shiftKey ? -1 : 1) + elements.length) % elements.length;
        line.className = `line ${elements[idx]}`;
        line.dataset.type = elements[idx];
        updateNavigator();
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        
        const currentType = line.dataset.type;
        const nextType = { "character": "dialogue", "scene-heading": "action", "dialogue": "action" }[currentType] || "action";
        
        const newLine = document.createElement('div');
        newLine.className = `line ${nextType}`;
        newLine.dataset.type = nextType;
        newLine.innerHTML = "&#8203;"; // Cursor anchor

        // DIALOGUE GUARD: If starting dialogue, wrap in a group
        if (currentType === 'character') {
            const group = document.createElement('div');
            group.className = 'dialogue-group';
            line.after(group);
            group.appendChild(line);
            group.appendChild(newLine);
        } else if (line.parentElement.classList.contains('dialogue-group')) {
            line.after(newLine);
        } else {
            line.after(newLine);
        }

        // Set cursor to new line
        const range = document.createRange();
        range.setStart(newLine.firstChild, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        // TRIGGER PAGE FACTORY
        const jumpedPage = checkPageOverflow(currentPage);
        if (jumpedPage) {
            const newRange = document.createRange();
            newRange.setStart(jumpedPage.firstChild, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
        updateStats();
    }
});

editor.addEventListener('input', (e) => {
    if (e.target.closest('.paper-page')) {
        saveToCloud();
        updateStats();
    }
});

// --- 4. CLOUD & STATS ---
async function saveToCloud() {
    if (currentUser) {
        await setDoc(doc(db, "scripts", currentUser.uid), {
            content: editor.innerHTML,
            beats: document.getElementById('beat-container').innerHTML,
            chars: document.getElementById('char-container').innerHTML
        }, { merge: true });
    }
}

function startSync(uid) {
    onSnapshot(doc(db, "scripts", uid), (snap) => {
        if (snap.exists() && !editor.contains(document.activeElement)) {
            const data = snap.data();
            editor.innerHTML = data.content || '<div class="paper-page" contenteditable="true"><div class="line scene-heading" data-type="scene-heading">INT. NEW PROJECT - DAY</div></div>';
            document.getElementById('beat-container').innerHTML = data.beats || "<b>BEAT SHEET:</b>";
            document.getElementById('char-container').innerHTML = data.chars || "<b>CHARACTERS:</b>";
            updateStats();
            updateNavigator();
        }
    });
}

function updateStats() {
    const pages = document.querySelectorAll('.paper-page').length;
    const words = editor.innerText.trim().split(/\s+/).length;
    document.getElementById('stat-pages').innerText = pages;
    document.getElementById('stat-words').innerText = words;
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

// --- 5. UI HELPERS ---
window.toggleLegend = () => {
    const leg = document.getElementById('legend-overlay');
    leg.style.display = leg.style.display === 'flex' ? 'none' : 'flex';
};

window.toggleFocusMode = () => document.body.classList.toggle('focus-mode');

window.switchTab = (tab) => {
    document.getElementById('tab-beats').style.display = tab === 'beats' ? 'block' : 'none';
    document.getElementById('tab-chars').style.display = tab === 'chars' ? 'block' : 'none';
};

window.exportToPDF = () => {
    const opt = {
        margin: [1, 0, 1, 0],
        filename: 'script.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(editor).save();
};

// Sidebar Listeners
document.getElementById('help-btn').onclick = window.toggleLegend;
document.getElementById('focus-btn').onclick = window.toggleFocusMode;
document.getElementById('pdf-btn').onclick = window.exportToPDF;
document.getElementById('beats-tab-btn').onclick = () => window.switchTab('beats');
document.getElementById('chars-tab-btn').onclick = () => window.switchTab('chars');
document.getElementById('legend-overlay').onclick = window.toggleLegend;
