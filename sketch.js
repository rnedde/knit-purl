let socket;
let stitchArray = [];
let cols;
let cellSize = 30;

let ellipseLength = 2.1;
let ellipseWidth = 1;

let stitchQueue = [];
let lastAddTime = 0;
let addInterval = 2; // ms between adding stitches

let clientColor;

function setup() {
    background(200, 70, 70);
    createCanvas(windowWidth, windowHeight);
    textFont('monospace');
    textSize(20);
    textAlign(CENTER, CENTER);
    fill(255, 100, 100);
    stroke(200, 80, 80);
    blendMode(LIGHTEST);
    strokeWeight(1);

    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
        console.log('Connected to WebSocket server');
    };

    socket.onmessage = (event) => {
        let msg = JSON.parse(event.data);
        if (msg.type === 'init') {
            stitchArray = msg.data;
        } else if (msg.type === 'update') {
            stitchQueue.push(...msg.data);
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    // Handle form submission
    let form = select('form');
    form.elt.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent page refresh

        let userInputEl = select('#userInput');
        let userInput = userInputEl.value();
        if (userInput.trim() !== '') {
            socket.send(JSON.stringify({
                type: 'newMessage',
                data: userInput,
                color: [red(clientColor), green(clientColor), blue(clientColor)]
            }));
            
            userInputEl.value('');
        }
    });

    // Generate a unique color for this client
    clientColor = color(random(100, 255), random(100, 255), random(100, 255));
}

function draw() {
    background(200, 70, 70);

    // Add stitches from the queue at intervals
    if (stitchQueue.length > 0 && millis() - lastAddTime > addInterval) {
        stitchArray.push(stitchQueue.shift());
        lastAddTime = millis();

        // Resize canvas height if needed
        cols = floor(width / cellSize);
        let totalRows = ceil(stitchArray.length / cols);
        let desiredHeight = totalRows * cellSize + 100;
        if (desiredHeight > height) {
            resizeCanvas(windowWidth, desiredHeight);
        }
    }

    // Draw all stitches
    cols = floor(width / cellSize);
    for (let i = 0; i < stitchArray.length; i++) {
        let x = (i % cols) * cellSize + cellSize / 2;
        let y = floor(i / cols) * cellSize + cellSize / 2;

        if (stitchArray[i] === 'k') {
            drawKnit(x, y, cellSize);
        } else {
            drawPurl(x, y, cellSize);
        }
    }
}

function addMessage(text) {
    for (let i = 0; i < text.length; i++) {
        let charBinary = text.charCodeAt(i).toString(2).padStart(8, '0');
        for (let bit of charBinary) {
            stitchArray.push(bit === '0' ? 'k' : 'p');
        }
    }
}

function drawKnit(x, y, size) {
    let r = size / 2;

    push();
    translate(x, y);
    push();
    translate(-5, 0);
    rotate(PI / 3);
    ellipse(0, 0, r * ellipseLength, r * ellipseWidth);
    pop();

    translate(5, 0);
    rotate(-PI / 3);
    ellipse(0, 0, r * ellipseLength, r * ellipseWidth);
    pop();
}

function drawPurl(x, y, size) {
    let r = size / 2;

    push();
    fill(240, 90, 90);
    translate(x, y);
    push();
    translate(-5, 0);
    rotate(PI / 1.2);
    ellipse(0, 0, r * ellipseLength / 1.1, r * ellipseWidth);
    pop();

    translate(5, 0);
    rotate(-PI / 1.2);
    ellipse(0, 0, r * ellipseLength / 1.1, r * ellipseWidth);
    pop();
}


function windowResized() {
    resizeCanvas(windowWidth, height);
}