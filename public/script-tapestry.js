// --- Global Variables ---
let binaryMessage = '';
let colorsForStitches = [];
let stitchImages = []; // NEW: Array to store p5.Image objects for each stitch
let stitchIndex = 0; // Tracks the next stitch to be drawn

let ellipseLength = 2.5; // Unused, can be removed
let ellipseWidth = 1.3;  // Unused, can be removed
let stitchSize = 100;

let knitSVGString; // Holds SVG content as strings
let purlSVGString;

let socket;

let lastScrollRow = -1;
let scrollBufferRows = 2;

// --- Preload SVG Content as Strings ---
function preload() {
  loadStrings('images/knit1.svg', knitSVGLoaded);
  loadStrings('images/purl1.svg', purlSVGLoaded);
}

function knitSVGLoaded(data) {
  knitSVGString = data.join('\n');
}

function purlSVGLoaded(data) {
  purlSVGString = data.join('\n');
}

// --- Setup ---
function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.style('z-index', '-1');
  noStroke();
  textSize(16);

  rectMode(CENTER);
  socket = io();

  socket.on('fullMessage', (msg) => {
    binaryMessage = msg.data;
    colorsForStitches = msg.colors || [];
    stitchImages = []; // Reset image cache for a new message
    background(255);
    stitchIndex = 0;
    lastScrollRow = -1;
    
    // NEW: Load all images dynamically when the full message arrives
    loadAllStitchImages(() => {
      resizeCanvasToFitContent();
      loop(); // Start drawing only after all initial images are loaded
    });
  });

  socket.on('append', (msg) => {
    let oldLength = binaryMessage.length;
    binaryMessage += msg.data;
    for (let i = 0; i < msg.data.length; i++) {
      colorsForStitches.push(msg.color);
    }
    
    // NEW: Append new images to the cache
    appendStitchImages(oldLength, () => {
      resizeCanvasToFitContent();
      loop(); // Continue drawing
    });
  });

  noLoop();
}

// --- NEW: Function to load all stitch images ---
function loadAllStitchImages(callback) {
  let loadedCount = 0;
  let totalStitches = binaryMessage.length;

  if (totalStitches === 0) {
    callback(); // Nothing to load
    return;
  }

  for (let i = 0; i < totalStitches; i++) {
    let svgContent = binaryMessage[i] === '0' ? knitSVGString : purlSVGString;
    let stitchP5Color = color(colorsForStitches[i]);
    let coloredSVGDataURL = getColoredSVGDataURL(svgContent, stitchP5Color);

    loadImage(coloredSVGDataURL, img => {
      stitchImages[i] = img; // Store image in the correct index
      loadedCount++;
      if (loadedCount === totalStitches) {
        callback(); // All images for the full message are loaded
      }
    });
  }
}

// --- NEW: Function to append new stitch images ---
function appendStitchImages(startIndex, callback) {
  let loadedCount = 0;
  let stitchesToAppend = binaryMessage.length - startIndex;

  if (stitchesToAppend === 0) {
    callback();
    return;
  }

  for (let i = startIndex; i < binaryMessage.length; i++) {
    let svgContent = binaryMessage[i] === '0' ? knitSVGString : purlSVGString;
    let stitchP5Color = color(colorsForStitches[i]);
    let coloredSVGDataURL = getColoredSVGDataURL(svgContent, stitchP5Color);

    loadImage(coloredSVGDataURL, img => {
      stitchImages[i] = img;
      loadedCount++;
      if (loadedCount === stitchesToAppend) {
        callback(); // All newly appended images are loaded
      }
    });
  }
}


// --- Draw Loop (Now draws from cache) ---
function draw() {
  // Only draw if the image for the current stitch index is already loaded
  if (stitchIndex < binaryMessage.length && stitchImages[stitchIndex]) {
    drawSingleStitch(stitchIndex);
    stitchIndex++;

    autoScrollIfNeeded();
  } else if (stitchIndex >= binaryMessage.length) {
    // If all stitches are drawn OR waiting for the next batch to load
    noLoop();
  }
  // If stitchImages[stitchIndex] is not yet loaded, loop will continue until it is,
  // or until noLoop() is called if all stitches have been processed.
}


// --- Resize Canvas ---
function resizeCanvasToFitContent() {
  let cols = floor(width / stitchSize);
  let rows = ceil(binaryMessage.length / cols);
  let newHeight = rows * stitchSize + 100;

  if (newHeight > height) {
    let currentCanvasContent = get();
    resizeCanvas(windowWidth, newHeight);
    image(currentCanvasContent, 0, 0);
  }
}

// --- Draw Single Stitch (Now uses cached images) ---
function drawSingleStitch(i) {
  let cols = floor(width / stitchSize);
  let row = floor(i / cols);
  let col = i % cols;
  
  let x = (row % 2 === 0)
    ? col * stitchSize + stitchSize / 2
    : (cols - 1 - col) * stitchSize + stitchSize / 2;

  let y = row * stitchSize + stitchSize / 2;

  // Retrieve the pre-loaded image from the cache
  let stitchImage = stitchImages[i];

  if (stitchImage) { // Make sure the image actually exists
    push();
    translate(x, y);
    // Directly draw the pre-loaded image
    image(stitchImage, -stitchSize / 2, -stitchSize / 2, stitchSize, stitchSize);
    pop();
  }
}

// --- Helper: Get Colored SVG Data URL (No Change) ---
function getColoredSVGDataURL(svgContent, mainColor) {
  let tempDiv = document.createElement('div');
  tempDiv.innerHTML = svgContent;
  let svgElement = tempDiv.querySelector('svg');

  if (!svgElement) {
    console.error("Could not parse SVG content.");
    return '';
  }

  let cls1Elements = svgElement.querySelectorAll('.cls-1');
  cls1Elements.forEach(el => {
    el.style.fill = mainColor.toString();
  });

  let cls2Elements = svgElement.querySelectorAll('.cls-2');
  cls2Elements.forEach(el => {
    el.style.fill = mainColor.toString();
  });

  let modifiedSVGString = new XMLSerializer().serializeToString(svgElement);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSVGString);
}

// --- drawKnit and drawPurl (Simplified) ---
// These functions are no longer needed if drawSingleStitch directly uses stitchImages.
// They were primarily used to trigger the loadImage.
// You can remove these if you're happy with the new `loadAllStitchImages` approach.
/*
function drawKnit(x, y, size, color) {
  // This function is effectively replaced by how drawSingleStitch now uses stitchImages
  // It's still here to match original structure but its body is empty for this new approach
}

function drawPurl(x, y, size, color) {
  // This function is effectively replaced by how drawSingleStitch now uses stitchImages
}
*/

// --- Auto-Scrolling ---
function autoScrollIfNeeded() {
  let cols = floor(width / stitchSize);
  let currentRow = floor((stitchIndex - 1) / cols);

  let visibleRowsInViewport = floor(windowHeight / stitchSize);
  let targetScrollY = (currentRow - (visibleRowsInViewport - scrollBufferRows)) * stitchSize;

  targetScrollY = max(0, targetScrollY);

  if (currentRow > lastScrollRow && window.scrollY < targetScrollY) {
    if (abs(window.scrollY - targetScrollY) > 5) {
       window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    }
    lastScrollRow = currentRow;
  }
}

function mousePressed() {
  console.log("clicked at:", mouseX, mouseY);
}