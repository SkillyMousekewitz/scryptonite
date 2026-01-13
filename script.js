/**
 * script.js - Integrated Scriptwriting Engine
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
        // Sync sidebar to the first paragraph's mode
        const firstPara = editor.querySelector('p');
        if (firstPara) updateHelpSidebar(getModeFromElement(firstPara));
    } else {
        // Start fresh with a Scene Heading
        editor.innerHTML = '<p class="scene-heading">&#xfeff;</p>';
        updateHelpSidebar('scene-heading');
    }
});

// --- 3. CORE KEYBOARD ENGINE (Tab, Enter, Arrows) ---
editor.addEventListener('keydown', function(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    let currentElement = selection.anchorNode.parentElement.closest('p');
    
    // Safety check: ensure we are inside a paragraph
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
            items[selectedIndex].click();
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

        // Cycle forward (Tab) or backward (Shift+Tab)
        currentIndex = e.shiftKey ? (currentIndex - 1 + modes.length) % modes.length : (currentIndex + 1) % modes.length;

        currentElement.className = modes[currentIndex];
        
        // Handle empty lines so they remain focusable
        if (currentElement.innerHTML === "" || currentElement.innerHTML === "<br>") {
            currentElement.innerHTML = "&#xfeff;";
            placeCursorAtEnd(currentElement);
        }

        updateHelpSidebar(modes[currentIndex]);
    }

    // C. Smart Enter Logic
    if (e.key === 'Enter') {
        hideMenu();

        setTimeout(() => {
            const newSelection = window.getSelection();
            const newElement = newSelection.anchorNode.parentElement.closest('p');
            const prevElement = newElement.previousElementSibling;

            if (prevElement && newElement) {
                // Formatting rules based on previous line
                if (prevElement.classList.contains('character')) newElement.className = 'dialogue';
                else if (prevElement.classList.contains('scene-heading')) newElement.className = 'action';
                else if (prevElement.classList.contains('parenthetical')) newElement.className = 'dialogue';
                else newElement.className = 'action';

                // Keep line alive if empty
                if (newElement.innerHTML === "" || newElement.innerHTML === "<br>") {
                    newElement.innerHTML = "&#xfeff;";
                    placeCursorAtEnd(newElement);
                }
                
                updateHelpSidebar(newElement.className);
            }
        }, 10);
    }
});

// --- 4. AUTOCOMPLETE & INPUT LOGIC ---
editor.addEventListener('input', () => {
    localStorage.setItem('script-draft', editor.innerHTML);
    handleAutocomplete();
});

function handleAutocomplete() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const currentElement = selection.anchorNode.parentElement.closest('p');

    if (currentElement && currentElement.classList.contains('character')) {
        const query = currentElement.innerText.trim().toUpperCase();
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
        item.onclick = () => {
            targetEl.innerText = name;
            hideMenu();
            placeCursorAtEnd(targetEl);
        };
        suggestionMenu.appendChild(item);
    });
}

// --- 5. SIDEBAR & UI HELPERS ---
function updateHelpSidebar(activeMode) {
    const listItems = document.querySelectorAll('.list-group-item');
    listItems.forEach(item => {
        // Normalizes "scene-heading" to "scene heading" for matching
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
    selectedIndex = -1;
}

function getModeFromElement(el) {
    return modes.find(cls => el.classList.contains(cls)) || 'action';
}

// --- 6. UTILITIES & EXPORTS ---
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
        range.setStart(el.childNodes[0], el.childNodes[0].length || 0);
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

// Hide autocomplete when clicking away
document.addEventListener('click', (e) => {
    if (!suggestionMenu.contains(e.target)) hideMenu();
});

// Print Cleanup
window.onbeforeprint = () => {
    const ps = editor.querySelectorAll('p');
    ps.forEach(p => {
        if (p.innerText.trim() === "" && p.innerHTML !== "&#xfeff;") p.remove();
    });
};
