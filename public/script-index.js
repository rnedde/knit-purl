let knitColor = [255, 255, 255];
const socket = io(); // Connect to Socket.IO server
const hiddenUserInput = document.getElementById('hiddenUserInput');
const displayText = document.getElementById('displayText');
const cursor = document.getElementById('cursor');
const warningMessage = document.getElementById('warningMessage');

const MAX_CHAR_LENGTH = 200; // Define max length

socket.on('assignColor', (color) => {
    knitColor = color;
    document.body.style.backgroundColor = `rgb(${knitColor[0]}, ${knitColor[1]}, ${knitColor[2]})`;
});

// Function to update the displayed text and cursor
function updateDisplayText(text) {
    displayText.textContent = text;
    displayText.appendChild(cursor);
}

// Function to show/hide warning
function showWarning(show) {
    if (show) {
        warningMessage.classList.remove('hidden');
    } else {
        warningMessage.classList.add('hidden');
    }
}

// Focus the hidden input on load
window.addEventListener('load', () => {
    hiddenUserInput.focus();
    updateDisplayText(''); // Initialize with just the cursor
    showWarning(false); // Ensure warning is hidden on load
});

// Keep focus on the hidden input if user clicks elsewhere on the body
document.body.addEventListener('click', () => {
    hiddenUserInput.focus();
});

// Listen for input changes on the hidden input
hiddenUserInput.addEventListener('input', (e) => {
    let message = e.target.value;

    // Truncate message if it exceeds max length
    if (message.length > MAX_CHAR_LENGTH) {
        message = message.substring(0, MAX_CHAR_LENGTH);
        hiddenUserInput.value = message; // Update the input value to truncated text
        showWarning(true); // Show warning if truncated
    } else {
        showWarning(false); // Hide warning if within limits
    }

    updateDisplayText(message);
});

// Listen for Enter key press on the hidden input
hiddenUserInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission if it were a form, or new line

        const message = hiddenUserInput.value.trim();
        if (message !== '') {
            const binary = textToBinary(message);
            socket.emit('append', binary);
            hiddenUserInput.value = ''; // Clear the input
            updateDisplayText(''); // Clear the displayed text and show only cursor
            showWarning(false); // Hide warning after sending message
        }
    }
});

function textToBinary(str) {
    return str.split('')
        .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');
}