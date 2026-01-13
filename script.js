const editor = document.getElementById('editor');
const menu = document.getElementById('suggestions');
const modes = ['action', 'scene-heading', 'character', 'parenthetical', 'dialogue', 'transition'];

// 1. Setup on Load
window.onload = () => {
    const saved = localStorage.getItem('script-work');
    if (saved) editor.innerHTML = saved;
    updateSidebar();
};

// 2. The Main Keyboard Handler
editor.addEventListener('keydown', function(e) {
    // If the character menu is open, and we hit escape, close it.
    if (e.key === 'Escape') hideMenu();

    if (e.key === 'Tab') {
        e.preventDefault(); // Stop browser from jumping to buttons
        hideMenu();         // Nuke the autocomplete menu so it doesn't freeze focus
        
        let sel = window.getSelection();
        let curr = sel.anchorNode.parentElement.closest('p');
        if (!curr) return;

        // Cycle Logic
        let currClass = modes.find(m => curr.classList.contains(m)) || 'action';
        let idx = modes.indexOf(currClass);
        let next = e.shiftKey ? (idx - 1 + modes.length) % modes.length : (idx + 1) % modes.length;

        curr.className = modes[next];
        
        // Refresh focus to prevent "Freezing"
        editor.focus();
        updateSidebar();
    }

    if (e.key === 'Enter') {
        hideMenu();
        setTimeout(() => {
            let curr = window.getSelection().anchorNode.parentElement.closest('p');
            let prev = curr.previousElementSibling;
            if (prev && curr) {
                if (prev.classList.contains('character')) curr.className = 'dialogue';
                else if (prev.classList.contains('scene-heading')) curr.className = 'action';
                else if (prev.classList.contains('parenthetical')) curr.className = 'dialogue';
                else curr.className = 'action';
                updateSidebar();
            }
        }, 10);
    }
});

// 3. Autocomplete Engine
editor.addEventListener('input', () => {
    localStorage.setItem('script-work', editor.innerHTML);
    let sel = window.getSelection();
    let curr = sel.anchorNode.parentElement.closest('p');
    
    if (curr && curr.classList.contains('character')) {
        let name = curr.innerText.replace(/\uFEFF/g, "").trim().toUpperCase();
        let allNames = Array.from(new Set(Array.from(document.querySelectorAll('.character')).map(el => el.innerText.trim().toUpperCase())));
        let matches = allNames.filter(n => n.startsWith(name) && n !== name);
        
        if (matches.length > 0 && name.length > 0) {
            showMenu(matches, curr);
        } else {
            hideMenu();
        }
    } else {
        hideMenu();
    }
});

function showMenu(list, el) {
    menu.innerHTML = '';
    let rect = el.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.top = (rect.bottom + window.scrollY) + 'px';
    menu.style.left = (rect.left + window.scrollX) + 'px';

    list.forEach(m => {
        let b = document.createElement('button');
        b.className = 'list-group-item list-group-item-action py-1';
        b.innerText = m;
        // Mousedown is the key—it fires BEFORE the editor loses focus
        b.onmousedown = (e) => {
            e.preventDefault();
            el.innerText = m;
            hideMenu();
            editor.focus();
            // Move cursor to end
            let range = document.createRange();
            let sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        };
        menu.appendChild(b);
    });
}

function hideMenu() { menu.style.display = 'none'; }

function updateSidebar() {
    let curr = window.getSelection().anchorNode ? window.getSelection().anchorNode.parentElement.closest('p') : null;
    let mode = curr ? (modes.find(m => curr.classList.contains(m)) || 'action') : 'action';
    
    document.querySelectorAll('#help-list li').forEach(li => {
        li.classList.toggle('active-mode', li.innerText.toLowerCase().includes(mode.replace('-', ' ')));
    });
}

// 4. Global Actions
function downloadScript() {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([editor.innerHTML], {type:'text/html'}));
    a.download = 'myscript.html'; a.click();
}

function clearScript() {
    if(confirm("Delete everything?")) {
        editor.innerHTML = '<p class="scene-heading">&#xfeff;</p>';
        localStorage.clear();
        updateSidebar();
    }
}
