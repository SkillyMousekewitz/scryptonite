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
let currentUser = null;

// --- PAGE FACTORY ---
function checkPageOverflow(currentPage) {
    const PAGE_LIMIT = 960; 
    if (currentPage.scrollHeight > PAGE_LIMIT) {
        let nextP = document.createElement('div');
        nextP.className = 'paper-page';
        nextP.contentEditable = true;
        currentPage.after(nextP);
        nextP.prepend(currentPage.lastElementChild);
        return nextP;
    }
    return null;
}

// --- AUTH & SYNC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        onSnapshot(doc(db, "scripts", user.uid), (snap) => {
            if (snap.exists() && !editor.contains(document.activeElement)) {
                editor.innerHTML = snap.data().content || '<div class="paper-page" contenteditable="true"><div class="line scene-heading" data-type="scene-heading">INT. NEW PROJECT - DAY</div></div>';
            }
        });
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

// --- GLOBAL ATTACHMENTS FOR BUTTONS ---
window.toggleFocusMode = () => document.body.classList.toggle('focus-mode');
window.exportToPDF = () => html2pdf().from(editor).save();
window.signOutUser = () => signOut(auth);

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('focus-btn').onclick = window.toggleFocusMode;
document.getElementById('pdf-btn').onclick = window.exportToPDF;
document.getElementById('logout-btn').onclick = window.signOutUser;

// --- KEYBOARD ENGINE ---
document.addEventListener('keydown', (e) => {
    const sel = window.getSelection();
    const currentPage = sel.anchorNode?.parentElement?.closest('.paper-page');
    const line = sel.anchorNode?.parentElement?.closest('.line');

    if (!currentPage || !line) return;

    if (e.key === 'Enter') {
        e.preventDefault();
        const newLine = document.createElement('div');
        newLine.className = 'line action';
        newLine.innerHTML = '&#8203;';
        line.after(newLine);
        
        const range = document.createRange();
        range.setStart(newLine.firstChild, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        checkPageOverflow(currentPage);
        saveToCloud();
    }
});

async function saveToCloud() {
    if (currentUser) {
        await setDoc(doc(db, "scripts", currentUser.uid), { content: editor.innerHTML }, { merge: true });
    }
}
