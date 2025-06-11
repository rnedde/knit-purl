let binaryMessage = '';
let colorsForStitches = [];
let stitchIndex = 0;

let ellipseLength = 2.5;
let ellipseWidth = 1.3;
let stitchSize = 30;

let socket;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.style('z-index', '-1');
  noStroke();
  textSize(16);
  // blendMode(DARKEST);

  rectMode(CENTER);
  socket = io(); // Socket.IO client

  socket.on('fullMessage', (msg) => {
    binaryMessage = msg.data;
    colorsForStitches = msg.colors || [];
    stitchIndex = 0;

    resizeCanvasToFitContent();
    loop();
  });

  socket.on('append', (msg) => {
    binaryMessage += msg.data;
    for (let i = 0; i < msg.data.length; i++) {
      colorsForStitches.push(msg.color);
    }
    resizeCanvasToFitContent();
    loop();
  });

  noLoop();
}

function draw() {
  if (stitchIndex < binaryMessage.length) {
    drawSingleStitch(stitchIndex);
    stitchIndex++;

    // Auto-scroll when stitches approach bottom of viewport
    autoScrollIfNeeded();
  } else {
    noLoop();
  }
}

function resizeCanvasToFitContent() {
  let cols = floor(windowWidth / stitchSize);
  let rows = ceil(binaryMessage.length / cols);
  let newHeight = rows * stitchSize + 100;

  let currentCanvas = get();

  resizeCanvas(windowWidth, newHeight);
  image(currentCanvas, 0, 0);
}

function darkenColor(rgb, factor = 0) {
  return rgb.map(c => {
    let val = Math.floor(c * factor);
    val = Math.min(255, Math.max(0, val));
    return val;
  });
}

function drawSingleStitch(i) {
  let cols = floor(width / stitchSize);
  let row = floor(i / cols);
  let col = i % cols;
  let x = (row % 2 === 0)
    ? col * stitchSize + stitchSize / 2
    : (cols - 1 - col) * stitchSize + stitchSize / 2;

  let y = row * stitchSize + stitchSize / 2;


  let stitchCol = colorsForStitches[i];
  // let stitchCol = binaryMessage[i] === '0'
  // ? knitCol
  // : darkenColor(knitCol, 0.7);

  if (binaryMessage[i] === '0') {
    drawKnit(x, y, stitchSize, stitchCol);
  } else {
    drawPurl(x, y, stitchSize, stitchCol);
  }
}

function drawKnit(x, y, size, color) {

  // *** Option 2: ***
  let r = size / 2;

  push();
  blendMode(DARKEST);
  fill(color);
  translate(x, y);
  rect(0, 0, size);
  pop();


  push();

  fill(color);
  translate(x, y);
  //create shadows
  let shadow = 'rgba(0, 0, 0, 0.25)';
  // fill(shadow);
  stroke(0);
  translate(0,-r);
  //left knit
  beginShape();
  vertex(-r, -r);
  vertex(0, 0);
  vertex(0, 2 * r);
  vertex(-r, r);
  endShape(CLOSE);

  //right knit

  beginShape();
  vertex(r, -r);
  vertex(0, 0);
  vertex(0, 2 * r);
  vertex(r, r);
  endShape(CLOSE);

  
  pop();



  // *** Option 1: *** 

  // let r = size / 2;
  // push();
  // fill(color);
  // translate(x, y);
  // push();
  // translate(-5, 0);
  // rotate(PI / 3);
  // ellipse(0, 0, r * ellipseLength, r * ellipseWidth);
  // pop();

  // translate(5, 0);
  // rotate(-PI / 3);
  // ellipse(0, 0, r * ellipseLength, r * ellipseWidth);
  // pop();
  // pop();

}




function drawPurl(x, y, size, color) {

  // *** Option 2: ***

  let r = size / 2;

  push();
  blendMode(DARKEST);
  fill(color);
  translate(x, y);
  rect(0, 0, size);
  pop();

  push();
  translate(x, y);
  fill(color);
  stroke(0);
  //left purl
  // beginShape();
  // vertex(-r, 0);
  // vertex(0, 0);
  // vertex(-r/2, r);
  // endShape(CLOSE);
  // //right purl
  // beginShape();
  // vertex(0, 0);
  // vertex(r, 0);
  // vertex(r/2, r);
  // endShape(CLOSE);
  // middle purl

  beginShape();
  vertex(-r, -r/3);
  vertex(0,-r);
  vertex(r, -r/3);
  vertex(r,0);
  vertex(-r,0);
  endShape(CLOSE);

  
  pop();


  // *** Option 1: ***
  // let r = size / 2;
  // push();
  // fill(color);
  // translate(x, y);
  // push();
  // translate(-5, 0);
  // rotate(PI / 1.2);
  // ellipse(0, 0, r * ellipseLength / 1.1, r * ellipseWidth);
  // pop();

  // translate(5, 0);
  // rotate(-PI / 1.2);
  // ellipse(0, 0, r * ellipseLength / 1.1, r * ellipseWidth);
  // pop();
  // pop();
}

function autoScrollIfNeeded() {
  // Find the bottom of the last drawn stitch
  let cols = floor(width / stitchSize);
  let row = floor(stitchIndex / cols);
  let stitchBottomY = row * stitchSize + 16 + stitchSize / 2; // approx bottom of stitch

  // Current scroll position + viewport height
  let scrollBottom = window.scrollY + window.innerHeight;

  // Scroll if stitchBottomY is below current viewport bottom minus some padding
  if (stitchBottomY > scrollBottom - 50) {
    // Scroll smoothly down a bit
    window.scrollBy({ top: stitchSize, behavior: 'smooth' });
  }
}

function mousePressed() {
  console.log("clicked at:", mouseX, mouseY);
}