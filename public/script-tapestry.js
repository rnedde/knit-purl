// --- Global Variables ---
let binaryMessage = '';
let colorsForStitches = []; // This still holds the original base colors
let stitchImages = []; // Stores just the p5.Image objects
// NEW: Array to store calculated color data for each stitch {belowColor: p5.Color, aboveColor: p5.Color}
let stitchColorData = [];
let stitchIndex = 0; // Tracks the next stitch to be drawn

let stitchSize = 100;

let knitSVGString;
let purlSVGString;

let socket;

let lastScrollRow = -1;
let scrollBufferRows = 2;


// --- Preload SVG Content as Strings ---
function preload() {
  loadStrings('images/knit6.svg', knitSVGLoaded);
  loadStrings('images/purl6.svg', purlSVGLoaded);
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
    colorsForStitches = msg.colors || []; // The initial base colors
    stitchImages = []; // Reset image cache
    stitchColorData = []; // Reset color data cache
    stitchIndex = 0;
    lastScrollRow = -1;

    // NEW: First calculate all color data, then load images
    calculateAllStitchColors();
    loadAllStitchImages(() => {
      resizeCanvasToFitContent();
      loop();
    });
  });

  socket.on('append', (msg) => {
    let oldLength = binaryMessage.length;
    binaryMessage += msg.data;
    for (let i = 0; i < msg.data.length; i++) {
      colorsForStitches.push(msg.color);
    }

    // NEW: Calculate color data for new stitches, then load new images
    calculateStitchColorsForAppend(oldLength);
    appendStitchImages(oldLength, () => {
      resizeCanvasToFitContent();
      loop();
    });
  });

  noLoop();
}


// --- Core Drawing Logic ---
function draw() {
  // Only draw if the image for the current stitch index is already loaded
  if (stitchIndex < binaryMessage.length && stitchImages[stitchIndex]) {
    drawSingleStitch(stitchIndex);
    stitchIndex++;
    autoScrollIfNeeded();
  } else if (stitchIndex >= binaryMessage.length) {
    noLoop();
  }
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

// --- NEW: Calculate all stitch colors synchronously ---
function calculateAllStitchColors() {
  let cols = floor(width / stitchSize);
  stitchColorData = new Array(binaryMessage.length).fill(null);

  for (let i = 0; i < binaryMessage.length; i++) {
    let currentBelowColor = color(colorsForStitches[i]);
    let currentAboveColor;

    let currentRow = floor(i / cols);
    let currentCanonicalCol = i % cols; // This is the 0-indexed column if all rows were LTR

    // --- NEW: Calculate the visual column of the current stitch ---
    let currentVisualCol;
    if (currentRow % 2 === 0) { // Even rows (0, 2, 4...) are drawn left-to-right
      currentVisualCol = currentCanonicalCol;
    } else { // Odd rows (1, 3, 5...) are drawn right-to-left
      currentVisualCol = (cols - 1) - currentCanonicalCol;
    }

    if (currentRow === 0) {
      currentAboveColor = currentBelowColor; // First row uses its own belowColor for above
    } else {
      let rowAbove = currentRow - 1;
      let visualColAbove = currentVisualCol; // The stitch above is in the same visual column

      // --- NEW: Calculate the indexAbove based on the visual column and the rowAbove's parity ---
      let indexAbove;
      if (rowAbove % 2 === 0) { // If the row above is even (drawn LTR)
        indexAbove = rowAbove * cols + visualColAbove;
      } else { // If the row above is odd (drawn RTL)
        indexAbove = rowAbove * cols + (cols - 1 - visualColAbove);
      }

      if (indexAbove >= 0 && indexAbove < binaryMessage.length && stitchColorData[indexAbove]) {
        currentAboveColor = stitchColorData[indexAbove].belowColor;
      } else {
        // This warning should now be much rarer, possibly only for edge cases or invalid data
        console.warn(`[calculateAllStitchColors] Stitch above index ${i} (visual col ${currentVisualCol}, indexAbove ${indexAbove}) not found or color data not ready. Using current belowColor as fallback.`);
        currentAboveColor = currentBelowColor;
      }
    }
    stitchColorData[i] = { belowColor: currentBelowColor, aboveColor: currentAboveColor };
  }
}

// --- NEW: Calculate colors for appended stitches synchronously (apply the same logic) ---
function calculateStitchColorsForAppend(startIndex) {
  let cols = floor(width / stitchSize);
  stitchColorData.length = binaryMessage.length; // Extend the stitchColorData array for new stitches

  for (let i = startIndex; i < binaryMessage.length; i++) {
    let currentBelowColor = color(colorsForStitches[i]);
    let currentAboveColor;

    let currentRow = floor(i / cols);
    let currentCanonicalCol = i % cols;

    // --- NEW: Calculate the visual column of the current stitch ---
    let currentVisualCol;
    if (currentRow % 2 === 0) { // Even rows (0, 2, 4...) are drawn left-to-right
      currentVisualCol = currentCanonicalCol;
    } else { // Odd rows (1, 3, 5...) are drawn right-to-left
      currentVisualCol = (cols - 1) - currentCanonicalCol;
    }

    if (currentRow === 0) {
      currentAboveColor = currentBelowColor;
    } else {
      let rowAbove = currentRow - 1;
      let visualColAbove = currentVisualCol; // The stitch above is in the same visual column

      // --- NEW: Calculate the indexAbove based on the visual column and the rowAbove's parity ---
      let indexAbove;
      if (rowAbove % 2 === 0) { // If the row above is even (drawn LTR)
        indexAbove = rowAbove * cols + visualColAbove;
      } else { // If the row above is odd (drawn RTL)
        indexAbove = rowAbove * cols + (cols - 1 - visualColAbove);
      }

      if (indexAbove >= 0 && indexAbove < binaryMessage.length && stitchColorData[indexAbove]) {
        currentAboveColor = stitchColorData[indexAbove].belowColor;
      } else {
        console.warn(`[calculateStitchColorsForAppend] Stitch above index ${i} (visual col ${currentVisualCol}, indexAbove ${indexAbove}) color data not ready. Using current belowColor as fallback.`);
        currentAboveColor = currentBelowColor;
      }
    }
    stitchColorData[i] = { belowColor: currentBelowColor, aboveColor: currentAboveColor };
  }
}

// --- Modified: Load all stitch images using calculated colors ---
function loadAllStitchImages(callback) {
  let loadedCount = 0;
  let totalStitches = binaryMessage.length;

  if (totalStitches === 0) {
    callback();
    return;
  }

  stitchImages = new Array(totalStitches).fill(null); // Ensure array is sized

  for (let i = 0; i < totalStitches; i++) {
    // Retrieve the already calculated colors
    const { belowColor, aboveColor } = stitchColorData[i];

    let svgContent = binaryMessage[i] === '0' ? knitSVGString : purlSVGString;
    let coloredSVGDataURL = getColoredSVGDataURL(svgContent, belowColor, aboveColor);

    // Use a closure to capture 'i' correctly for the async loadImage callback
    ((idx) => {
      loadImage(coloredSVGDataURL, img => {
        stitchImages[idx] = img; // Store just the image object
        loadedCount++;
        if (loadedCount === totalStitches) {
          callback();
        }
      });
    })(i); // Pass current i to closure
  }
}

// --- Modified: Append new stitch images using calculated colors ---
function appendStitchImages(startIndex, callback) {
  let loadedCount = 0;
  let stitchesToAppend = binaryMessage.length - startIndex;

  if (stitchesToAppend === 0) {
    callback();
    return;
  }

  // Extend the stitchImages array for new stitches
  stitchImages.length = binaryMessage.length;

  for (let i = startIndex; i < binaryMessage.length; i++) {
    const { belowColor, aboveColor } = stitchColorData[i]; // Use already calculated colors

    let svgContent = binaryMessage[i] === '0' ? knitSVGString : purlSVGString;
    let coloredSVGDataURL = getColoredSVGDataURL(svgContent, belowColor, aboveColor);

    ((idx) => {
      loadImage(coloredSVGDataURL, img => {
        stitchImages[idx] = img;
        loadedCount++;
        if (loadedCount === stitchesToAppend) {
          callback();
        }
      });
    })(i);
  }
}


// --- Draw Single Stitch (Uses cached images directly) ---
function drawSingleStitch(i) {
  let cols = floor(width / stitchSize);
  let row = floor(i / cols);
  let col = i % cols;

  let x = (row % 2 === 0)
    ? col * stitchSize + stitchSize / 2
    : (cols - 1 - col) * stitchSize + stitchSize / 2;

  let y = row * stitchSize + stitchSize / 2;

  let stitchImage = stitchImages[i]; // Get the stored p5.Image object

  if (stitchImage) { // Make sure the image actually exists
    push();
    translate(x, y);
    image(stitchImage, -stitchSize / 2, -stitchSize / 2, stitchSize, stitchSize);
    pop();
  }
}

/**
 * Helper function to modify SVG colors and return a Data URL.
 * @param {string} svgContent The SVG content as a string.
 * @param {p5.Color} belowColor The color from `colorsForStitches` (intended for the base/main part of the current stitch).
 * @param {p5.Color} aboveColor The color derived from the stitch above (intended for the top/connecting part).
 * @returns {string} A Data URL representing the modified SVG.
 */
function getColoredSVGDataURL(svgContent, belowColor, aboveColor) {
  let tempDiv = document.createElement('div');
  tempDiv.innerHTML = svgContent;
  let svgElement = tempDiv.querySelector('svg');

  if (!svgElement) {
    console.error("Could not parse SVG content.");
    return '';
  }

  // --- REVERTING THE SWAP ---
  // Applying belowColor to .cls-1 (the 'below' visual part)
  let cls1Elements = svgElement.querySelectorAll('.cls-2');
  cls1Elements.forEach(el => {
    el.style.fill = belowColor.toString(); // .cls-1 gets belowColor
  });

  // Applying aboveColor to .cls-2 (the 'above' visual part)
  let cls2Elements = svgElement.querySelectorAll('.cls-3');
  cls2Elements.forEach(el => {
    el.style.fill = aboveColor.toString(); // .cls-2 gets aboveColor
  });

  // The rest of the function remains the same
  let modifiedSVGString = new XMLSerializer().serializeToString(svgElement);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSVGString);
}


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