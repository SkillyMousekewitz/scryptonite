/**
 * script.js - Final Integrated Scriptwriting Engine
 */

// --- 1. CONFIGURATION & STATE ---
const editor = document.getElementById('editor');
const suggestionMenu = document.getElementById('character-suggestions');
const modes = ['action', 'scene-heading', 'character', 'parenthetical', 'dialogue', 'transition'];
let selectedIndex = -1;

// --- 2. INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    const savedContent = localStorage.getItem('script-draft');
    if (savedContent && savedContent.trim() !== "") {
        editor.innerHTML = savedContent;
        const firstPara = editor.querySelector('p');
        if (firstPara) updateHelpSidebar(getModeFromElement(firstPara));
    } else {
        editor.innerHTML = '<p class="scene-heading">&#xfeff;</p>';
        updateHelpSidebar('scene-heading');
    }
});

// Auto-save whenever the user types
editor.addEventListener('input', () => {
    localStorage.setItem('script-draft', editor.innerHTML);
    handleAutocomplete();
});

// --- 3. CORE KEYBOARD ENGINE (Tab, Enter, Arrows) ---
editor.addEventListener('keydown', function(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    let currentElement = selection.anchorNode.parentElement.closest('p');
    
    if (!currentElement || currentElement.id === 'editor') {
        document.execCommand('formatBlock', false, 'p');
        currentElement = selection.anchorNode.parentElement.closest('p');
    }

    // A. Autocomplete Navigation
    if (suggestionMenu.style.display === 'block') {
        const items = suggestionMenu.querySelectorAll('.list-group-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateActiveSuggestion(items);
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateActiveSuggestion(items);
            return;
        } else if (e.key === 'Enter' && selectedIndex > -1) {
            e.preventDefault();
            // Manually trigger the mousedown logic for the selected item
            items[selectedIndex].dispatchEvent(new Event('mousedown'));
            return;
        } else if (e.key === 'Escape') {
            hideMenu();
            return;
        }
    }

    // B. Robust Tab Cycling
    if (e.key === 'Tab') {
        e.preventDefault();

        let currentClass = getModeFromElement(currentElement);
        let currentIndex = modes.indexOf(currentClass);

        currentIndex = e.shiftKey ? (currentIndex - 1 + modes.length) % modes.length : (currentIndex + 1) % modes.length;

        currentElement.className = modes[currentIndex];
        
        if (currentElement.innerHTML === "" || currentElement.innerHTML === "<br>") {
            currentElement.innerHTML = "&#xfeff;";
            placeCursorAtEnd(currentElement);
        }

        updateHelpSidebar(modes[currentIndex]);
    }

    // C. Smart Enter Logic
    if (e.key === 'Enter') {
        // If menu is open but nothing selected, kill it to prevent focus hijacking
        if (suggestionMenu.style.display === 'block' && selectedIndex === -1) {
            hideMenu();
        }

        setTimeout(() => {
            const newSelection = window.getSelection();
            if (!newSelection.rangeCount) return;

            const newElement = newSelection.anchorNode.parentElement.closest('p');
            const prevElement = newElement ? newElement.previousElementSibling : null;

            if (prevElement && newElement) {
                if (prevElement.classList.contains('character')) newElement.className = 'dialogue';
                else if (prevElement.classList.contains('scene-heading')) newElement.className = 'action';
                else if (prevElement.classList.contains('parenthetical')) newElement.className = 'dialogue';
                else newElement.className = 'action';

                if (newElement.innerHTML === "" || newElement.innerHTML === "<br>") {
                    newElement.innerHTML = "&#xfeff;";
                    placeCursorAtEnd(newElement);
                }
                
                updateHelpSidebar(newElement.className);
            }
        }, 20); 
    }
});

// --- 4. AUTOCOMPLETE ENGINE ---
function handleAutocomplete() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const currentElement = selection.anchorNode.parentElement.closest('p');

    if (currentElement && currentElement.classList.contains('character')) {
        const query = currentElement.innerText.replace(/\uFEFF/g, "").trim().toUpperCase();
        const characters = getExistingCharacters();
        const matches = characters.filter(char => char.startsWith(query) && char !== query);

        if (matches.length > 0 && query.length > 0) {
            showSuggestions(matches, currentElement);
        } else {
            hideMenu();
        }
    } else {
        hideMenu();
    }
}

function showSuggestions(matches, targetEl) {
    suggestionMenu.innerHTML = '';
    const rect = targetEl.getBoundingClientRect();
    suggestionMenu.style.top = `${rect.bottom + window.scrollY}px`;
    suggestionMenu.style.left = `${rect.left + window.scrollX}px`;
    suggestionMenu.style.display = 'block';
    selectedIndex = -1;

    matches.forEach((name) => {
        const item = document.createElement('button');
        item.classList.add('list-group-item', 'list-group-item-action', 'py-1');
        item.innerText = name;
        // Use mousedown to prevent editor focus loss
        item.onmousedown = (e) => {
            e.preventDefault(); 
            targetEl.innerText = name;
            hideMenu();
            placeCursorAtEnd(targetEl);
        };
        suggestionMenu.appendChild(item);
    });
}

// --- 5. UI HELPERS ---
function updateHelpSidebar(activeMode) {
    const listItems = document.querySelectorAll('.list-group-item');
    listItems.forEach(item => {
        const normalizedMode = activeMode.replace('-', ' ');
        if (item.innerText.toLowerCase().includes(normalizedMode)) {
            item.classList.add('highlight-mode');
        } else {
            item.classList.remove('highlight-mode');
        }
    });
}

function updateActiveSuggestion(items) {
    items.forEach((item, index) => {
        if (index === selectedIndex) item.classList.add('active-suggestion');
        else item.classList.remove('active-suggestion');
    });
}

function hideMenu() {
    suggestionMenu.style.display = 'none';
    suggestionMenu.innerHTML = ''; 
    selectedIndex = -1;
}

function getModeFromElement(el) {
    return modes.find(cls => el.classList.contains(cls)) || 'action';
}

// --- 6. UTILITIES ---
function getExistingCharacters() {
    const names = new Set();
    document.querySelectorAll('.character').forEach(el => {
        const name = el.innerText.replace(/\uFEFF/g, "").trim().toUpperCase();
        if (name) names.add(name);
    });
    return Array.from(names);
}

function placeCursorAtEnd(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    if (el.childNodes.length > 0) {
        let node = el.childNodes[el.childNodes.length - 1];
        range.setStart(node, node.length || 0);
    } else {
        range.selectNodeContents(el);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
}

function downloadScript() {
    const blob = new Blob([editor.innerHTML], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'script.html';
    a.click();
}

function clearScript() {
    if (confirm("Clear entire script? This cannot be undone.")) {
        editor.innerHTML = '<p class="scene-heading">&#xfeff;</p>';
        localStorage.removeItem('script-draft');
        updateHelpSidebar('scene-heading');
    }
}

// Global click to hide menu
document.addEventListener('click', (e) => {
    if (!suggestionMenu.contains(e.target)) hideMenu();
});

// Print cleanup
window.onbeforeprint = () => {
    const ps = editor.querySelectorAll('p');
    ps.forEach(p => {
        if (p.innerText.trim() === "" && p.innerHTML !== "&#xfeff;") p.remove();
    });
};
