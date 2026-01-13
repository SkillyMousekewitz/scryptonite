const editor = document.getElementById('editor');
const modes = ['action', 'scene-heading', 'character', 'parenthetical', 'dialogue', 'transition'];

// 1. Load saved content on startup
window.addEventListener('DOMContentLoaded', () => {
    const savedContent = localStorage.getItem('script-draft');
    if (savedContent) {
        editor.innerHTML = savedContent;
    }
});

// 2. Auto-save whenever the user types
editor.addEventListener('input', () => {
    localStorage.setItem('script-draft', editor.innerHTML);
});

// 3. The Tab-Cycling Logic
editor.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const selection = window.getSelection();
        let currentElement = selection.anchorNode.nodeType === 3 
            ? selection.anchorNode.parentElement 
            : selection.anchorNode;

        if (currentElement.id === 'editor') return;

        let currentClass = modes.find(cls => currentElement.classList.contains(cls)) || 'action';
        let currentIndex = modes.indexOf(currentClass);

        if (e.shiftKey) {
            currentIndex = (currentIndex - 1 + modes.length) % modes.length;
        } else {
            currentIndex = (currentIndex + 1) % modes.length;
        }

        currentElement.className = modes[currentIndex];
    }

    // Smart Enter: Follow Character with Dialogue
    if (e.key === 'Enter') {
        setTimeout(() => {
            const selection = window.getSelection();
            const newElement = selection.anchorNode.parentElement;
            const prevElement = newElement.previousElementSibling;

            if (prevElement && prevElement.classList.contains('character')) {
                newElement.className = 'dialogue';
            }
        }, 0);
    }
});

// 4. Export Function
function downloadScript() {
    const content = editor.innerHTML;
    const blob = new Blob([content], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-script.html';
    a.click();
}
