const editor = document.getElementById('editor');
const suggestionMenu = document.getElementById('character-suggestions');
const modes = ['action', 'scene-heading', 'character', 'parenthetical', 'dialogue', 'transition'];
let selectedIndex = -1;

// --- Initialize ---
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('script-draft');
    if (saved) editor.innerHTML = saved;
    updateSidebar(modes.find(m => editor.querySelector('p').classList.contains(m)) || 'action');
});

editor.addEventListener('input', () => {
    localStorage.setItem('script-draft', editor.innerHTML);
    handleAutocomplete();
});

// --- Keyboard Logic ---
editor.addEventListener('keydown', function(e) {
    const selection = window.getSelection();
    let currentLine = selection.anchorNode.parentElement.closest('p');

    // 1. Force Menu Close on Tab/Enter to prevent freezing
    if (e.key === 'Tab' || e.key === 'Enter') {
        suggestionMenu.style.display = 'none';
    }

    // 2. Tab Cycling
    if (e.key === 'Tab') {
        e.preventDefault();
        if (!currentLine) return;

        let currentClass = modes.find(m => currentLine.classList.contains(m)) || 'action';
        let nextIndex = e.shiftKey ? (modes.indexOf(currentClass) - 1 + modes.length) % modes.length : (modes.indexOf(currentClass) + 1) % modes.length;

        currentLine.className = modes[nextIndex];
        updateSidebar(modes[nextIndex]);
        
        if (currentLine.innerText.trim() === "") {
            currentLine.innerHTML = "&#xfeff;";
            placeCursorEnd(currentLine);
        }
    }

    // 3. Smart Enter
    if (e.key === 'Enter') {
        setTimeout(() => {
            const newLine = window.getSelection().anchorNode.parentElement.closest('p');
            const prevLine = newLine.previousElementSibling;
            if (prevLine && newLine) {
                if (prevLine.classList.contains('character')) newLine.className = 'dialogue';
                else if (prevLine.classList.contains('scene-heading')) newLine.className = 'action';
                else if (prevLine.classList.contains('parenthetical')) newLine.className = 'dialogue';
                else newLine.className = 'action';
                
                if (newLine.innerText.trim() === "") newLine.innerHTML = "&#xfeff;";
                placeCursorEnd(newLine);
                updateSidebar(newLine.className);
            }
        }, 20);
    }
});

// --- Helpers ---
function handleAutocomplete() {
    const selection = window.getSelection();
    const line = selection.anchorNode.parentElement.closest('p');
    if (line && line.classList.contains('character')) {
        const query = line.innerText.replace(/\uFEFF/g, "").trim().toUpperCase();
        const names = Array.from(new Set(Array.from(document.querySelectorAll('.character')).map(el => el.innerText.trim().toUpperCase()))).filter(n => n.startsWith(query) && n !== query);
        if (names.length > 0 && query.length > 0) showMenu(names, line); else hideMenu();
    } else hideMenu();
}

function showMenu(names, el) {
    suggestionMenu.innerHTML = '';
    const rect = el.getBoundingClientRect();
    suggestionMenu.style.cssText = `display:block; top:${rect.bottom + window.scrollY}px; left:${rect.left + window.scrollX}px;`;
    names.forEach(n => {
        const btn = document.createElement('button');
        btn.className = 'list-group-item list-group-item-action py-1';
        btn.innerText = n;
        btn.onmousedown = (e) => { e.preventDefault(); el.innerText = n; hideMenu(); placeCursorEnd(el); };
        suggestionMenu.appendChild(btn);
    });
}

function hideMenu() { suggestionMenu.style.display = 'none'; }

function updateSidebar(mode) {
    document.querySelectorAll('#help-list li').forEach(li => {
        li.classList.toggle('highlight-mode', li.innerText.toLowerCase().includes(mode.replace('-', ' ')));
    });
}

function placeCursorEnd(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
}

function downloadScript() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([editor.innerHTML], {type:'text/html'}));
    a.download = 'script.html'; a.click();
}

function clearScript() { if(confirm("Clear?")) { editor.innerHTML='<p class="scene-heading">&#xfeff;</p>'; localStorage.clear(); } }
