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
        e.preventDefault(); // Prevent form submission or new line

        const message = hiddenUserInput.value.trim();
        if (message !== '') {
            const binary = textToBinary(message);
            socket.emit('append', binary);

            // Get all character spans (excluding the cursor)
            const charSpans = Array.from(displayText.querySelectorAll('span')).filter(span => span !== cursor);

            let completedAnimations = 0;
            const totalAnimations = charSpans.length;

            if (totalAnimations === 0) {
                // If there are no characters, just clear immediately
                displayText.innerHTML = '';
                displayText.appendChild(cursor);
                hiddenUserInput.value = '';
                showWarning(false);
                return;
            }

            // Define animation properties
            const animationDuration = 1000; // 1 second
            const staggerDelay = 50; // 50ms delay between each letter's animation start

            charSpans.forEach((charSpan, index) => {
                // Calculate the current position of the span relative to the viewport
                // We need this to set the initial transform correctly
                const rect = charSpan.getBoundingClientRect();
                const initialX = rect.left;
                const initialY = rect.top;

                // Set initial transform to its current position (no movement yet)
                charSpan.style.transform = `translate(0px, 0px)`; // Start from current position
                charSpan.style.opacity = '1';
                charSpan.style.transition = `transform ${animationDuration}ms ease-out, opacity ${animationDuration}ms ease-out`;

                // Trigger the animation after a staggered delay
                setTimeout(() => {
                    // Calculate the target position: bottom-left corner of the viewport
                    // We need to move it relative to its initial position.
                    // To move to bottom-left (0, window.innerHeight), we calculate the delta.
                    const targetX = 0 - initialX;
                    const targetY = window.innerHeight - initialY;

                    charSpan.style.transform = `translate(${targetX}px, ${targetY}px)`;
                    charSpan.style.opacity = '0';
                }, index * staggerDelay); // Staggered start

                // Listen for the end of the transition for each span
                charSpan.addEventListener('transitionend', function handler(event) {
                    // Ensure we're listening for the 'transform' transition (or opacity if you prefer)
                    if (event.propertyName === 'transform' || event.propertyName === 'opacity') {
                        completedAnimations++;
                        charSpan.removeEventListener('transitionend', handler); // Remove self

                        if (completedAnimations === totalAnimations) {
                            // All character animations are complete
                            displayText.innerHTML = ''; // Clear all text content
                            displayText.appendChild(cursor); // Re-append cursor
                            hiddenUserInput.value = ''; // Clear the input field for the next message
                            showWarning(false); // Hide warning
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