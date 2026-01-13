/**
 * script.js - Integrated Scriptwriting Engine
 */

const editor = document.getElementById('editor');
const suggestionMenu = document.getElementById('character-suggestions');
const modes = ['action', 'scene-heading', 'character', 'parenthetical', 'dialogue', 'transition'];
let selectedIndex = -1;

// --- 1. INITIALIZATION & STORAGE ---

window.addEventListener('DOMContentLoaded', () => {
    const savedContent = localStorage.getItem('script-draft');
    if (savedContent && savedContent.trim() !== "") {
        editor.innerHTML = savedContent;
    } else {
        // Start with a clean Scene Heading line and a zero-width space
        editor.innerHTML = '<p class="scene-heading">&#xfeff;</p>';
    }
});

// Auto-save whenever the user types
editor.addEventListener('input', () => {
    localStorage.setItem('script-draft', editor.innerHTML);
    handleAutocomplete();
});

// --- 2. KEYBOARD EVENT LISTENER (Tab, Enter, Arrows) ---

editor.addEventListener('keydown', function(e) {
    const items = suggestionMenu.querySelectorAll('.list-group-item');

    // A. Handle Autocomplete Keyboard Navigation
    if (suggestionMenu.style.display === 'block') {
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

    // B. Handle Robust Tab Cycling
    if (e.key === 'Tab') {
        e.preventDefault();
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        let currentElement = selection.anchorNode.parentElement.closest('p');
        
        // Force <p> if editor is empty or cursor is loose
        if (!currentElement || currentElement.id === 'editor') {
            document.execCommand('formatBlock', false, 'p');
            currentElement = selection.anchorNode.parentElement.closest('p');
        }

        let currentClass = modes.find(cls => currentElement.classList.contains(cls)) || 'action';
        let currentIndex = modes.indexOf(currentClass);

        currentIndex = e.shiftKey ? (currentIndex - 1 + modes.length) % modes.length : (currentIndex + 1) % modes.length;

        currentElement.className = modes[currentIndex];
        
        // Ensure line remains focusable if empty
        if (currentElement.innerHTML === "" || currentElement.innerHTML === "<br>") {
            currentElement.innerHTML = "&#xfeff;";
            placeCursorAtEnd(currentElement);
        }
    }

    // C. Smart Enter Logic
    if (e.key === 'Enter') {
        hideMenu();

        setTimeout(() => {
            const selection = window.getSelection();
            const newElement = selection.anchorNode.parentElement.closest('p');
            const prevElement = newElement.previousElementSibling;

            if (prevElement) {
                if (prevElement.classList.contains('character')) {
                    newElement.className = 'dialogue';
                } else if (prevElement.classList.contains('scene-heading')) {
                    newElement.className = 'action';
                } else if (prevElement.classList.contains('parenthetical')) {
                    newElement.className = 'dialogue';
                }
                
                if (newElement.innerHTML === "" || newElement.innerHTML === "<br>") {
                    newElement.innerHTML = "&#xfeff;";
                    placeCursorAtEnd(newElement);
                }
            }
        }, 10);
    }
});

// --- 3. AUTOCOMPLETE ENGINE ---

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

function getExistingCharacters() {
    const names = new Set();
    document.querySelectorAll('.character').forEach(el => {
        const name = el.innerText.trim().toUpperCase();
        if (name) names.add(name);
    });
    return Array.from(names);
}

// --- 4. UTILITIES & EXPORT ---

function placeCursorAtEnd(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    if (el.childNodes.length > 0) {
        range.setStart(el.childNodes[0], el.innerText.length);
    } else {
        range.selectNodeContents(el);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
}

function downloadScript() {
    const content = editor.innerHTML;
    const blob = new Blob([content], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'script.html';
    a.click();
}

// Global click to hide menu
document.addEventListener('click', (e) => {
    if (!suggestionMenu.contains(e.target)) hideMenu();
});

// Print cleanup: Remove empty paragraphs to avoid ghost pages
window.onbeforeprint = () => {
    const ps = editor.querySelectorAll('p');
    ps.forEach(p => {
        if (p.innerText.trim() === "" && p.innerHTML !== "&#xfeff;") {
            p.remove();
        }
    });
};

function clearScript() {
    if (confirm("Are you sure you want to clear the entire script? This cannot be undone.")) {
        editor.innerHTML = '<p class="scene-heading">&#xfeff;</p>';
        localStorage.removeItem('script-draft');
    }
}
