const editor = document.getElementById('editor');
// The order here is the order they will cycle through when you hit TAB
const modes = ['action', 'scene-heading', 'character', 'parenthetical', 'dialogue', 'transition'];

editor.addEventListener('keydown', function(e) {
    // 1. Specifically catch the Tab key
    if (e.key === 'Tab') {
        e.preventDefault(); // This stops the focus from jumping to the buttons

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        // 2. Find the paragraph element the cursor is inside
        let currentElement = selection.anchorNode.parentElement.closest('p');
        
        // If they are on a line that isn't a <p> (like the start of the editor), wrap it
        if (!currentElement || currentElement.id === 'editor') {
            document.execCommand('formatBlock', false, 'p');
            currentElement = selection.anchorNode.parentElement.closest('p');
        }

        // 3. Determine the next style in the cycle
        let currentClass = modes.find(cls => currentElement.classList.contains(cls)) || 'action';
        let currentIndex = modes.indexOf(currentClass);

        if (e.shiftKey) {
            // Cycle backward
            currentIndex = (currentIndex - 1 + modes.length) % modes.length;
        } else {
            // Cycle forward
            currentIndex = (currentIndex + 1) % modes.length;
        }

        // 4. Apply the new class and remove old ones
        currentElement.className = ''; // Clear existing
        currentElement.classList.add(modes[currentIndex]);
    }
    
    // Auto-formatting for Enter Key
    if (e.key === 'Enter') {
        // We use a tiny timeout to let the browser create the new line first
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
            }
        }, 10);
    }

    const suggestionMenu = document.getElementById('character-suggestions');

// Function to get all unique character names in the script
function getExistingCharacters() {
    const characterElements = document.querySelectorAll('.character');
    const names = new Set();
    characterElements.forEach(el => {
        const name = el.innerText.trim().toUpperCase();
        if (name) names.add(name);
    });
    return Array.from(names);
}

editor.addEventListener('input', (e) => {
    const selection = window.getSelection();
    const currentElement = selection.anchorNode.parentElement.closest('p');

    // Only show suggestions if we are in a 'character' block
    if (currentElement && currentElement.classList.contains('character')) {
        const query = currentElement.innerText.trim().toUpperCase();
        const characters = getExistingCharacters();
        const matches = characters.filter(char => char.startsWith(query) && char !== query);

        if (matches.length > 0 && query.length > 0) {
            showSuggestions(matches, currentElement);
        } else {
            suggestionMenu.style.display = 'none';
        }
    } else {
        suggestionMenu.style.display = 'none';
    }
});

function showSuggestions(matches, targetEl) {
    suggestionMenu.innerHTML = '';
    
    // Position the menu below the current line
    const rect = targetEl.getBoundingClientRect();
    suggestionMenu.style.top = `${rect.bottom + window.scrollY}px`;
    suggestionMenu.style.left = `${rect.left + window.scrollX}px`;
    suggestionMenu.style.display = 'block';

    matches.forEach(name => {
        const item = document.createElement('button');
        item.classList.add('list-group-item', 'list-group-item-action', 'py-1');
        item.innerText = name;
        item.onclick = () => {
            targetEl.innerText = name;
            suggestionMenu.style.display = 'none';
            // Move cursor to end of the name
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(targetEl.childNodes[0], name.length);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        };
        suggestionMenu.appendChild(item);
    });
}

// Close menu if clicking elsewhere
document.addEventListener('click', () => suggestionMenu.style.display = 'none');
});
