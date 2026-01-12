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

// Correct target for the Page Factory model
const editor = document.getElementById('main-editor');
const elements = ["scene-heading", "action", "character", "parenthetical", "dialogue", "transition"];

// --- 1. THE PAGE FACTORY ENGINE ---
function checkPageOverflow(currentPage) {
    const PAGE_LIMIT = 960; // Standard 11-inch limit in pixels
    
    if (currentPage.scrollHeight > PAGE_LIMIT) {
        let nextP = currentPage.nextElementSibling;
        
        // If no page exists or next element isn't a paper-page, create one
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

// --- 2. AUTH & SYNC ENGINE ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        startSync(user.uid);
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

function startSync(uid) {
    onSnapshot(doc(db, "scripts", uid), (snap) => {
        // Only update if the user isn't currently typing to avoid cursor jumps
        if (snap.exists() && !editor.contains(document.activeElement)) {
            const data = snap.data();
            // Restore pages or create the first page if empty
            editor.innerHTML = data.content || '<div class="paper-page" contenteditable="true"><div class="line scene-heading" data-type="scene-heading">INT. NEW PROJECT - DAY</div></div>';
            document.getElementById('beat-container').innerHTML = data.beats || "<b>BEAT SHEET:</b>";
            document.getElementById('char-container').innerHTML = data.chars || "<b>CHARACTERS:</b>";
            updateStats();
            updateNavigator();
        }
    });
}

// --- 3. KEYBOARD ENGINE (GLOBAL LISTENER) ---
document.addEventListener('keydown', (e) => {
    const sel = window.getSelection();
    const line = sel.anchorNode?.parentElement?.closest('.line');
    const currentPage = sel.anchorNode?.parentElement?.closest('.paper-page');

    // Help & Focus Mode Shortcuts
    if (e.ctrlKey && (e.key === '/' || e.code === 'Slash')) { 
        e.preventDefault(); 
        window.toggleLegend(); 
        return; 
    }
    if (e.ctrlKey && e.key === '\\') { 
        e.preventDefault(); 
        window.toggleFocusMode(); 
        return; 
    }

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
        const currentType = line.dataset.type;
        const nextType = { "character": "dialogue", "scene-heading": "action", "dialogue": "action" }[currentType] || "action";
        
        const newLine = document.createElement('div');
        newLine.className = `line ${nextType}`;
        newLine.dataset.type = nextType;
        newLine.innerHTML = "&#8203;"; // Zero-width space for cursor focus

        // DIALOGUE GUARD: Keeps speaker and dialogue together
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

        const range = document.createRange();
        range.setStart(newLine.firstChild, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        // Check if current page is full and spawn new page if needed
        const jumpedPage = checkPageOverflow(currentPage);
        if (jumpedPage) {
            const newRange = document.createRange();
            newRange.setStart(jumpedPage.firstChild, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
        updateStats();
        saveToCloud();
    }
});

// --- 4. GLOBAL UI FUNCTIONS ---
// Functions must be attached to window to work with HTML onclick in modules
window.toggleLegend = () => {
    const leg = document.getElementById('legend-overlay');
    leg.style.display = (leg.style.display === 'flex') ? 'none' : 'flex';
};

window.toggleFocusMode = () => document.body.classList.toggle('focus-mode');

window.switchTab = (tab) => {
    document.getElementById('tab-beats').style.display = tab === 'beats' ? 'block' : 'none';
    document.getElementById('tab-chars').style.display = tab === 'chars' ? 'block' : 'none';
};

window.exportToPDF = () => {
    html2pdf().set({
        margin: [1, 0, 1, 0], // Enforces 1" top/bottom in PDF
        filename: 'script.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // Respects CSS Dialogue Guard
    }).from(editor).save();
};

// --- 5. DATA & UI UPDATES ---
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
    const pages = document.querySelectorAll('.paper-page').length;
    const words = editor.innerText.trim().split(/\s+/).filter(w => w.length > 0).length;
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

// Sidebar Button Listeners
document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
document.getElementById('help-btn').onclick = window.toggleLegend;
document.getElementById('focus-btn').onclick = window.toggleFocusMode;
document.getElementById('pdf-btn').onclick = window.exportToPDF;
document.getElementById('beats-tab-btn').onclick = () => window.switchTab('beats');
document.getElementById('chars-tab-btn').onclick = () => window.switchTab('chars');
document.getElementById('legend-overlay').onclick = window.toggleLegend;

editor.addEventListener('input', () => { saveToCloud(); updateStats(); });
