let binaryMessage = '';
let ellipseLength = 2.5;
let ellipseWidth = 1.3;
let stitchSize = 30;
let stitchIndex = 0;

let socket;

let knitColor = [255, 150, 200]; // default before server assigns
let colorsForStitches = []; // store colors for each stitch so the colors persist


function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.style('z-index', '-1');
  textSize(16);

  noStroke();

  // Bind existing HTML elements
  const userInput = document.getElementById('userInput');
  const submitBtn = document.getElementById('submitBtn');

  // Connect to the WebSocket server
  socket = new WebSocket('ws://localhost:8080');

  socket.addEventListener('open', () => {
    console.log('Connected to server');
  });

  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
  
    if (msg.type === 'assignColor') {
      knitColor = msg.data; // this client’s knit color (an RGB array)
      purlColor = [knitColor[0] * 0.8, knitColor[1] * 0.7, knitColor[2] * 0.6]; // optional darker purl
    }
    else if (msg.type === 'fullMessage') {
        binaryMessage = msg.data;
        colorsForStitches = msg.colors; // use actual historical colors from server
        stitchIndex = 0;
        background(255);
        loop();
      }
    else if (msg.type === 'append') {
      // Append new stitches and colors to arrays
      binaryMessage += msg.data;
  
      // For each new stitch, assign the color from the sender (msg.color)
      for(let i = 0; i < msg.data.length; i++) {
        colorsForStitches.push(msg.color);
      }
  
      loop();
    }
  });

  submitBtn.addEventListener('click', function (e) {
    e.preventDefault();
    const message = userInput.value;
    const newBinary = textToBinary(message);
  
    socket.send(JSON.stringify({ type: 'append', data: newBinary }));
  
    userInput.value = '';
  });

  noLoop(); // stop draw() until submission
}

function draw() {
  if (stitchIndex < binaryMessage.length) {
    drawSingleStitch(stitchIndex);
    stitchIndex++;
  } else {
    noLoop(); // stop when all stitches are drawn
  }
}

function textToBinary(str) {
  return str.split('')
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
}


// Helper function to darken an RGB color array by a certain factor
function darkenColor(rgb, factor = 0.7) {
  // Clamp and floor to integers 0-255
  return rgb.map(c => {
    let val = Math.floor(c * factor);
    if (val < 0) val = 0;
    if (val > 255) val = 255;
    return val;
  });
}

function drawSingleStitch(i) {
  let cols = floor(width / stitchSize);
  let row = floor(i / cols);
  let col = i % cols;
  let y = row * stitchSize + 100;

  let x;
  if (row % 2 === 0) {
    x = col * stitchSize + stitchSize / 2;
  } else {
    x = (cols - 1 - col) * stitchSize + stitchSize / 2;
  }

  let knitCol = colorsForStitches[i];

  // Debug: Print colors for first few stitches to console
  if (i < 5) {
    console.log(`Original color: ${knitCol}`);
    console.log(`Darkened color: ${darkenColor(knitCol, 0.7)}`);
  }

  let stitchCol = binaryMessage[i] === '0'
    ? knitCol
    : darkenColor(knitCol, 0.7);

  if (binaryMessage[i] === '0') {
    drawKnit(x, y, stitchSize, stitchCol);
  } else {
    drawPurl(x, y, stitchSize, stitchCol);
  }
}

  

function drawKnit(x, y, size, color) {
    let r = size / 2;
    push();
    fill(color[0], color[1], color[2]);
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
    pop();
  }
  
  function drawPurl(x, y, size, color) {
    let r = size / 2;
  
    push();
    fill(color[0], color[1], color[2]);
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
    pop();
  }
  