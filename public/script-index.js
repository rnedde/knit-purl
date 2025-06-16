let knitColor = [255, 255, 255];
const socket = io(); // Connect to Socket.IO server
const hiddenUserInput = document.getElementById('hiddenUserInput');
const displayText = document.getElementById('displayText');
const cursor = document.getElementById('cursor');
const warningMessage = document.getElementById('warningMessage');

const MAX_CHAR_LENGTH = 50; // Define max length

socket.on('assignColor', (color) => {
    knitColor = color;
    document.body.style.backgroundColor = `rgb(${knitColor[0]}, ${knitColor[1]}, ${knitColor[2]})`;
});

// Function to update the displayed text and cursor
function updateDisplayText(text) {
    // Clear any existing text and remove previous character spans
    displayText.innerHTML = '';

    // Create a span for each character
    text.split('').forEach(char => {
        const charSpan = document.createElement('span');
        charSpan.textContent = char;
        // Basic styling for the individual spans to ensure they are inline-block
        // and can be individually positioned for animation.
        charSpan.style.display = 'inline-block';
        charSpan.style.position = 'relative'; // Important for calculating individual positions later
        charSpan.style.willChange = 'transform, opacity'; // Optimize for animation performance
        displayText.appendChild(charSpan);
    });

    displayText.appendChild(cursor); // Always append the cursor
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
    cursor.style.visibility = 'visible'; // Ensure cursor is visible on load
    cursor.style.opacity = '1'; // Ensure opacity is 1
    // Set up transition for cursor's smooth reappearance
    cursor.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
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
    // Reset cursor position to end of text and make visible when typing again
    cursor.style.transform = 'translate(0, 0)';
    cursor.style.visibility = 'visible';
    cursor.style.opacity = '1';
});

// Listen for Enter key press on the hidden input
hiddenUserInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission or new line

        const message = hiddenUserInput.value.trim();
        if (message !== '') {
            // Hide the cursor immediately (visibility off)
            cursor.style.visibility = 'hidden';
            // Also reset its transform to prevent snapping from a previous centered position
            cursor.style.transform = 'translate(0, 0)';

            const charSpans = Array.from(displayText.querySelectorAll('span')).filter(span => span !== cursor);

            let completedAnimations = 0;
            const totalAnimations = charSpans.length;

            if (totalAnimations === 0) {
                // If there are no characters, just send and then show cursor
                const binary = textToBinary(message);
                socket.emit('append', binary);

                displayText.innerHTML = '';
                hiddenUserInput.value = '';
                showWarning(false);
                // Use requestAnimationFrame to ensure layout is updated before centering
                requestAnimationFrame(() => {
                    centerAndShowCursor();
                });
                return;
            }

            // Define animation properties for characters
            const animationDuration = 1000; // 1 second
            const staggerDelay = 50; // 50ms delay between each letter's animation start

            charSpans.forEach((charSpan, index) => {
                const rect = charSpan.getBoundingClientRect();
                const initialX = rect.left;
                const initialY = rect.top;

                charSpan.style.transform = `translate(0px, 0px)`;
                charSpan.style.opacity = '1';
                charSpan.style.transition = `transform ${animationDuration}ms ease-out, opacity ${animationDuration}ms ease-out`;

                setTimeout(() => {
                    const targetX = 0 - initialX;
                    const targetY = window.innerHeight - initialY;

                    charSpan.style.transform = `translate(${targetX}px, ${targetY}px)`;
                    charSpan.style.opacity = '0';
                }, index * staggerDelay);

                charSpan.addEventListener('transitionend', function handler(event) {
                    if (event.propertyName === 'transform' || event.propertyName === 'opacity') {
                        completedAnimations++;
                        charSpan.removeEventListener('transitionend', handler);

                        if (completedAnimations === totalAnimations) {
                            // All character animations are complete, now send the message
                            const binary = textToBinary(message);
                            socket.emit('append', binary);

                            displayText.innerHTML = ''; // Clear all text content
                            hiddenUserInput.value = ''; // Clear the input field for the next message
                            showWarning(false); // Hide warning

                            // Use requestAnimationFrame to ensure layout is updated before centering
                            requestAnimationFrame(() => {
                                centerAndShowCursor();
                            });
                        }
                    }
                });
            });
        }
    }
});

function textToBinary(str) {
    return str.split('')
        .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');
}

// Function to center and show the cursor
function centerAndShowCursor() {
    // Ensure cursor is in the DOM
    displayText.appendChild(cursor);

    // It's crucial that displayText has its final dimensions before getBoundingClientRect
    // This `requestAnimationFrame` (or a tiny setTimeout) ensures a repaint has happened.

    // Calculate center position relative to the viewport/displayText
    const displayRect = displayText.getBoundingClientRect();
    const cursorRect = cursor.getBoundingClientRect();

    const targetX = (displayRect.width / 2) - (cursorRect.width / 2);
    const targetY = (displayRect.height / 2) - (cursorRect.height / 2);

    // Apply visibility and transform immediately, then opacity for fade-in
    cursor.style.visibility = 'visible';
    cursor.style.transform = `translate(${targetX}px, ${targetY}px)`;
    cursor.style.opacity = '1'; // This will cause a fade-in effect if transition is set
}