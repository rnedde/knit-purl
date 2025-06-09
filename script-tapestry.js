let binaryMessage = '';
let colorsForStitches = [];
let stitchIndex = 0;
let socket;

let ellipseLength = 2.5;
let ellipseWidth = 1.3;
let stitchSize = 30;

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight); // temporary size
    canvas.position(0, 0);
    canvas.style('z-index', '-1');
    noStroke();
    textSize(16);
  
    socket = new WebSocket('ws://localhost:8080');
  
    socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
  
      if (msg.type === 'fullMessage') {
        binaryMessage = msg.data;
        colorsForStitches = msg.colors || [];
        stitchIndex = 0;
  
        resizeCanvasToFitContent();
        loop();
      } else if (msg.type === 'append') {
        binaryMessage += msg.data;
        for (let i = 0; i < msg.data.length; i++) {
          colorsForStitches.push(msg.color);
        }
  
        resizeCanvasToFitContent();
        loop();
      }
    });
  
    noLoop();
  }
  

function draw() {
  if (stitchIndex < binaryMessage.length) {
    drawSingleStitch(stitchIndex);
    stitchIndex++;
  } else {
    noLoop();
  }
}

function resizeCanvasToFitContent() {
    let cols = floor(windowWidth / stitchSize);
    let rows = ceil(binaryMessage.length / cols);
    let newHeight = rows * stitchSize + 100;
  
    // Save current canvas content
    let currentCanvas = get();
  
    // Resize the canvas (this clears it)
    resizeCanvas(windowWidth, newHeight);
  
    // Restore previous drawing
    image(currentCanvas, 0, 0);
  }
  
  

// Helper function to darken an RGB color array by a certain factor
function darkenColor(rgb, factor = 0) {
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
    let y = row * stitchSize + 16;
  
    let x;
    if (row % 2 === 0) {
      x = col * stitchSize + stitchSize / 2;
    } else {
      x = (cols - 1 - col) * stitchSize + stitchSize / 2;
    }
  
    let knitCol = colorsForStitches[i];
  
    // Debug: Print colors for first few stitches to console
    if (i < 5) {
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
      fill(color);
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
    
    function drawPurl(x, y, size, color) {
      let r = size / 2;
    
      push();
      fill(color);
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