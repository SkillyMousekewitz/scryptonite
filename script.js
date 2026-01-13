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

// Initialization
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        onSnapshot(doc(db, "scripts", user.uid), (snap) => {
            if (snap.exists() && !editor.contains(document.activeElement)) {
                editor.innerHTML = snap.data().content || editor.innerHTML;
            }
        });
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

// Basic Functions
const save = async () => {
    if (currentUser) {
        await setDoc(doc(db, "scripts", currentUser.uid), { content: editor.innerHTML }, { merge: true });
    }
};

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
document.getElementById('help-btn').onclick = () => {
    const leg = document.getElementById('legend-overlay');
    leg.style.display = (leg.style.display === 'flex') ? 'none' : 'flex';
};
document.getElementById('legend-overlay').onclick = () => document.getElementById('legend-overlay').style.display = 'none';
document.getElementById('pdf-btn').onclick = () => html2pdf().from(editor).save();

// Typing Engine
document.addEventListener('keydown', (e) => {
    const sel = window.getSelection();
    const line = sel.anchorNode?.parentElement?.closest('.line');
    if (!line || e.key !== 'Enter') return;

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
    save();
});

editor.addEventListener('input', save);
