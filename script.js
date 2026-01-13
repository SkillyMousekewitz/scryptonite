/**
 * script.js - Final Stable Scriptwriting Engine
 */

// --- 1. SETTINGS & ELEMENTS ---
const editor = document.getElementById('editor');
const suggestionMenu = document.getElementById('character-suggestions');
const modes = ['action', 'scene-heading', 'character', 'parenthetical', 'dialogue', 'transition'];
let selectedIndex = -1;

// --- 2. STARTUP & AUTO-SAVE ---
window.addEventListener('DOMContentLoaded', () => {
    const savedContent = localStorage.getItem('script-draft');
    if (savedContent && savedContent.trim() !== "") {
        editor.innerHTML = savedContent;
    } else {
        // Starts the script with a Scene Heading line
        editor.innerHTML = '<p class="scene-heading">&#xfeff;</p>';
    }
    updateHelpSidebar(getModeFromElement(editor.querySelector('p')));
});

// Save work every time you type
editor.addEventListener('input', () => {
    localStorage.setItem('script-draft', editor.innerHTML);
    handleAutocomplete();
});

// --- 3. KEYBOARD ENGINE (The logic for Tab, Enter, and Arrows) ---
editor.addEventListener('keydown', function(e) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    let currentElement = selection.anchorNode.parentElement.closest('p');
    
    // Ensure we are typing inside a paragraph tag
    if (!currentElement || currentElement.id === 'editor') {
        document.execCommand('formatBlock', false, 'p');
        currentElement = selection.anchorNode.parentElement.closest('p');
    }

    // A. THE "FREEZE" PREVENTER
    // If Tab or Enter is pressed, we close the character menu immediately
    if (e.key === 'Tab' || e.key === 'Enter') {
        hideMenu();
    }

    // B. AUTOCOMPLETE NAVIGATION
    // Controls the arrow keys when the character list is visible
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
        }
    }

    // C. TAB CYCLING
    // Changes the line format (Action -> Scene -> Character, etc.)
    if (e.key === 'Tab') {
        e.preventDefault();

        let currentClass = getModeFromElement(currentElement);
        let currentIndex = modes.indexOf(currentClass);

        // Move forward with Tab, backward with Shift+Tab
        currentIndex = e.shiftKey ? (currentIndex - 1 + modes.length) % modes.length : (currentIndex + 1) % modes.length;

        currentElement.className = modes[currentIndex];
        
        // Fix for empty lines: keeps them active so you can keep tabbing
        if (currentElement.innerText.trim() === "") {
            currentElement.innerHTML = "&#xfeff;"; 
            placeCursorAtEnd(currentElement);
        }

        updateHelpSidebar(modes[currentIndex]);
        return; 
    }

    // D. SMART ENTER
    // Automatically sets the next line format (Character -> Dialogue)
    if (e.key === 'Enter') {
        setTimeout(() => {
            const newSelection = window.getSelection();
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
        }, 30); // 30ms delay prevents the "freeze" on faster computers
    }
});

// --- 4. CHARACTER AUTOCOMPLETE FUNCTIONS ---
function handleAutocomplete() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const currentElement = selection.anchorNode.parentElement.closest('p');

    if (currentElement && currentElement.classList.contains('character')) {
        // Clean the text to search for names correctly
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
        
        // Mousedown works better than "Click" in editors to prevent freezing
        item.onmousedown = (e) => {
            e.preventDefault(); 
            targetEl.innerText = name;
            hideMenu();
            placeCursorAtEnd(targetEl);
        };
        suggestionMenu.appendChild(item);
    });
}

// --- 5. UI & SIDEBAR HELPERS ---
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
    if (!el) return 'action';
    return modes.find(cls => el.classList.contains(cls)) || 'action';
}

// --- 6. UTILITIES (Formatting and File Management) ---
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

// Close menu if you click outside the editor
document.addEventListener('click', (e) => {
    if (!suggestionMenu.contains(e.target)) hideMenu();
});

// Final cleanup before printing
window.onbeforeprint = () => {
    const ps = editor.querySelectorAll('p');
    ps.forEach(p => {
        if (p.innerText.trim() === "" && p.innerHTML !== "&#xfeff;") p.remove();
    });
};
