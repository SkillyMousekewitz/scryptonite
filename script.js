/* style.css */
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap');

.paper {
    width: 8.5in;
    min-height: 11in;
    padding: 1in 1in 1in 1.5in; /* Standard 1.5" left margin for binding */
    margin: 0 auto;
    background: white;
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 12pt;
    line-height: 1.2;
    outline: none;
    white-space: pre-wrap;
}

/* Script Element Formatting */
#editor p { margin-bottom: 0; min-height: 1em; }

.scene-heading { text-transform: uppercase; margin-top: 25px !important; font-weight: bold; }
.action { margin-top: 12px !important; }
.character { text-transform: uppercase; width: 50%; margin-left: 2in !important; margin-top: 12px !important; }
.parenthetical { width: 30%; margin-left: 1.5in !important; }
.dialogue { width: 70%; margin-left: 1in !important; margin-bottom: 12px !important; }
.transition { text-transform: uppercase; margin-left: 4.5in !important; margin-top: 12px !important; }

/* Pagination Logic */
@media print {
    body { background: none; }
    .paper { box-shadow: none; margin: 0; }
    p { break-inside: avoid; } /* Prevents splitting a block across pages */
}
