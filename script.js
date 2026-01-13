// script.js
const editor = document.getElementById('editor');
const modes = ['action', 'scene-heading', 'character', 'parenthetical', 'dialogue', 'transition'];

editor.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        
        // Get the current line (paragraph)
        const selection = window.getSelection();
        const currentElement = selection.anchorNode.parentElement;
        
        if (currentElement.id === 'editor') return; // Don't style the container

        // Find current mode index
        let currentClass = modes.find(cls => currentElement.classList.contains(cls)) || 'action';
        let currentIndex = modes.indexOf(currentClass);

        // Cycle index: Shift+Tab goes backward, Tab goes forward
        if (e.shiftKey) {
            currentIndex = (currentIndex - 1 + modes.length) % modes.length;
        } else {
            currentIndex = (currentIndex + 1) % modes.length;
        }

        // Apply new class
        currentElement.className = modes[currentIndex];
    }

    // Auto-switch: When pressing Enter after Character, automatically go to Dialogue
    if (e.key === 'Enter') {
        setTimeout(() => {
            const selection = window.getSelection();
            const newElement = selection.anchorNode.parentElement;
            const prevElement = newElement.previousElementSibling;

            if (prevElement && prevElement.classList.contains('character')) {
                newElement.className = 'dialogue';
            } else if (prevElement && prevElement.classList.contains('scene-heading')) {
                newElement.className = 'action';
            }
        }, 0);
    }
});
