// --- Global Variables ---
let binaryMessage = '';
let colorsForStitches = [];
let stitchImages = [];
let stitchColorData = [];
let loopsSVGString;
let loopImages = [];
let loopColorData = [];
let stitchIndex = 0;
// let stitchSize = 100; // This will become dynamic
let knitSVGString;
let purlSVGString;
let socket;
let lastScrollRow = -1;
let scrollBufferRows = 2;

// New variables for dynamic sizing
const baseStitchSize = 100; // Your original stitch size reference
let currentStitchSize; // Will be calculated dynamically
let currentCols; // Will be calculated dynamically

// --- Preload SVG Content (No changes here) ---
function preload() {
  loadStrings('images/knit1.svg', knitSVGLoaded);
  loadStrings('images/purl1.svg', purlSVGLoaded);
  loadStrings('images/loops1.svg', loopsSVGLoaded);
}

function knitSVGLoaded(data) {
  knitSVGString = data.join('\n');
}

function purlSVGLoaded(data) {
  purlSVGString = data.join('\n');
}

function loopsSVGLoaded(data) {
  loopsSVGString = data.join('\n');
}

// --- Setup (MODIFIED to add noSmooth()) ---
function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.style('z-index', '-1');
  noStroke();
  textSize(16);

  rectMode(CENTER);
  socket = io();

  // Add this line to turn off anti-aliasing
  noSmooth(); 

  // Calculate initial stitch size and columns
  calculateDynamicStitchSize();

  socket.on('fullMessage', (msg) => {
    binaryMessage = msg.data;
    colorsForStitches = msg.colors || [];
    stitchImages = [];
    stitchColorData = [];
    loopImages = [];
    loopColorData = [];
    stitchIndex = 0;
    lastScrollRow = -1;

    calculateAllStitchColors();
    calculateAllLoopColors();

    loadAllStitchImages(() => {
      loadAllLoopImages(() => {
        resizeCanvasToFitContent();
        loop();
      });
    });
  });

  socket.on('append', (msg) => {
    let oldLength = binaryMessage.length;
    binaryMessage += msg.data;
    for (let i = 0; i < msg.data.length; i++) {
      colorsForStitches.push(msg.color);
    }

    calculateStitchColorsForAppend(oldLength);
    calculateLoopColorsForAppend(oldLength);

    appendStitchImages(oldLength, () => {
      appendLoopImages(oldLength, () => {
        resizeCanvasToFitContent();
        loop();
      });
    });
  });

  noLoop();
}

// All other functions remain unchanged from the previous version.
// This includes the `drawSingleStitchAndAttachedLoop` with `overlap = 1.0`
// and `getColoredSVGDataURL` with `el.style.stroke = 'none';`.

// New function to calculate stitchSize and cols
function calculateDynamicStitchSize() {
  // Determine desired columns based on current width and base stitch size
  // We want to ensure an integer number of columns that fills the width.
  // Instead of floor, we calculate exactly.
  currentCols = Math.floor(windowWidth / baseStitchSize);
  // Ensure at least 1 column
  if (currentCols === 0) currentCols = 1;

  currentStitchSize = windowWidth / currentCols;
}

// --- windowResized function (NEW) ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Recalculate stitch size and columns on window resize
  let oldCols = currentCols;
  calculateDynamicStitchSize();

  // Only re-process if the number of columns changed, or it's the very first resize
  // (to avoid unnecessary reloads if only height changes minimally).
  // Or, simply always reload to be safe and ensure perfect fit.
  // Given that `currentStitchSize` *always* changes with `windowWidth`,
  // we almost always need to reload images for clarity.
  // This might be a heavy operation for very frequent resizing.
  // For smoother resize, consider drawing existing images at new sizes,
  // then reloading in background. But for simplicity, we'll reload.

  if (binaryMessage.length > 0) { // Only reload if there's content to display
    stitchImages = []; // Clear old images
    loopImages = []; // Clear old images
    stitchIndex = 0; // Reset stitch index to redraw from start
    lastScrollRow = -1; // Reset scroll

    // Recalculate colors just in case (though they shouldn't change with size, it's safe)
    calculateAllStitchColors();
    calculateAllLoopColors();

    loadAllStitchImages(() => {
      loadAllLoopImages(() => {
        resizeCanvasToFitContent(); // Adjust canvas height based on new stitch sizes
        redraw(); // Redraw the canvas
      });
    });
  } else {
      resizeCanvasToFitContent(); // Just resize canvas height if no content
      redraw();
  }
}


// --- Core Drawing Logic (No changes to `draw` itself, but relies on `currentStitchSize` and `currentCols`) ---
function draw() {
  clear();

  let stitchesToDraw = min(stitchIndex, binaryMessage.length);

  for (let i = 0; i < stitchesToDraw; i++) {
    if (stitchImages[i]) {
      drawSingleStitchAndAttachedLoop(i, stitchImages[i]);
    }
  }

  if (stitchIndex < binaryMessage.length) {
    if (stitchImages[stitchIndex]) {
      stitchIndex++;
    }
  } else {
    noLoop();
  }

  autoScrollIfNeeded();
}
// --- Draw Single Stitch AND the Attached Loop Below It (MODIFIED for increased overlap) ---
function drawSingleStitchAndAttachedLoop(i, imgToDraw) {
  let cols = currentCols;
  let currentRow = floor(i / cols);
  let currentCol = i % cols;

  let stitchX = (currentRow % 2 === 0)
    ? currentCol * currentStitchSize + currentStitchSize / 2
    : (cols - 1 - currentCol) * currentStitchSize + currentStitchSize / 2;

  let stitchY = currentRow * currentStitchSize + currentStitchSize / 2;

  // Increased overlap value from 0.5 to 1.0
  const overlap = 1.0; 

  if (imgToDraw) {
    push();
    translate(stitchX, stitchY);
    // Draw the image slightly larger to create an overlap with neighboring stitches.
    // Adjust position by half the overlap to keep it centered.
    image(imgToDraw, -currentStitchSize / 2 - overlap / 2, -currentStitchSize / 2 - overlap / 2, currentStitchSize + overlap, currentStitchSize + overlap);
    pop();
  }

  let loopRow = currentRow + 1;
  let loopX = stitchX;
  let loopY = loopRow * currentStitchSize + currentStitchSize / 2;

  if (i < loopImages.length && loopImages[i]) {
    let loopImage = loopImages[i];
    if (loopImage) {
      push();
      translate(loopX, loopY);
      // Draw the loop image slightly larger as well to cover gaps below.
      image(loopImage, -currentStitchSize / 2 - overlap / 2, -currentStitchSize / 2 - overlap / 2, currentStitchSize + overlap, currentStitchSize + overlap);
      pop();
    }
  }
}

// --- getColoredSVGDataURL function (MODIFIED to ensure no SVG strokes) ---
function getColoredSVGDataURL(svgContent, primaryFillColor, connectingColor) {
  let tempDiv = document.createElement('div');
  tempDiv.innerHTML = svgContent;
  let svgElement = tempDiv.querySelector('svg');

  if (!svgElement) {
    console.error("Could not parse SVG content.");
    return '';
  }

  svgElement.setAttribute('viewBox', `0 0 30 30`); // Keep original viewBox
  svgElement.setAttribute('width', currentStitchSize); // Set explicit width
  svgElement.setAttribute('height', currentStitchSize); // Set explicit height

  const isLoopsSVG = svgContent.includes('class="cls-1"') && svgContent.includes('class="cls-2"') && !svgContent.includes('class="cls-3"');


  if (isLoopsSVG) {
    // This branch is for loops.svg
    let cls1Elements = svgElement.querySelectorAll('.cls-1');
    cls1Elements.forEach(el => {
      el.style.fill = primaryFillColor.toString();
      el.style.stroke = 'none'; // <--- ADDED: Ensure no stroke for loops
    });

    // Explicitly set fill:none for .cls-2 elements in loops.svg
    let cls2Elements = svgElement.querySelectorAll('.cls-2');
    cls2Elements.forEach(el => {
      el.style.fill = 'none';
      el.style.stroke = 'none'; // <--- ADDED: Ensure no stroke for loops
    });

  } else {
    // This branch is for knit7.svg or purl7.svg (main stitches)

    let cls1Elements = svgElement.querySelectorAll('.cls-1');
    cls1Elements.forEach(el => {
      el.style.fill = primaryFillColor.toString();
      el.style.stroke = 'none'; // <--- ADDED: Ensure no stroke for stitches
    });

    let cls2Elements = svgElement.querySelectorAll('.cls-2');
    cls2Elements.forEach(el => {
      el.style.fill = connectingColor.toString();
      el.style.stroke = 'none'; // <--- ADDED: Ensure no stroke for stitches
    });

    let cls3Elements = svgElement.querySelectorAll('.cls-3');
    cls3Elements.forEach(el => {
      el.style.fill = primaryFillColor.toString();
      el.style.stroke = 'none'; // <--- ADDED: Ensure no stroke for stitches
    });
  }

  let modifiedSVGString = new XMLSerializer().serializeToString(svgElement);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSVGString);
}

// All other functions (global variables, preload, setup, windowResized, draw,
// resizeCanvasToFitContent, calculateAllStitchColors, calculateStitchColorsForAppend,
// calculateAllLoopColors, calculateLoopColorsForAppend, loadAllStitchImages,
// appendStitchImages, loadAllLoopImages, appendLoopImages, autoScrollIfNeeded)
// remain exactly as they were in the previous version.
// All other functions (global variables, preload, setup, windowResized, draw,
// resizeCanvasToFitContent, calculateAllStitchColors, calculateStitchColorsForAppend,
// calculateAllLoopColors, calculateLoopColorsForAppend, loadAllStitchImages,
// appendStitchImages, loadAllLoopImages, appendLoopImages, getColoredSVGDataURL,
// autoScrollIfNeeded) remain exactly as they were in the previous version.


// --- Resize Canvas (MODIFIED to use currentStitchSize and currentCols) ---
function resizeCanvasToFitContent() {
  let cols = currentCols; // Use the global currentCols
  let rows = ceil(binaryMessage.length / cols);
  let newHeight = (rows + 1) * currentStitchSize + 100; // Use currentStitchSize

  if (newHeight > height) {
    // get() can be expensive, consider only resizing if height is actually larger
    // For large canvases, this might be a bottleneck
    // If not resizing from smaller to larger, we can just resize directly
    resizeCanvas(windowWidth, newHeight);
  } else if (newHeight < height) { // Also shrink if content gets smaller
      resizeCanvas(windowWidth, newHeight);
  }
}

// --- Calculate Colors (MODIFIED for robustness - Keep all the robustness changes from last time) ---
function calculateAllStitchColors() {
  let cols = currentCols; // Use the global currentCols
  stitchColorData = new Array(binaryMessage.length).fill(null);

  for (let i = 0; i < binaryMessage.length; i++) {
    let currentBelowColor = color(colorsForStitches[i]);
    // Ensure currentBelowColor is a valid p5.Color object with a toString method
    if (!currentBelowColor || typeof currentBelowColor.toString !== 'function') {
      console.warn(`[calculateAllStitchColors] Invalid belowColor from colorsForStitches[${i}]: ${colorsForStitches[i]}. Using default.`);
      currentBelowColor = color(200); // Fallback to a solid gray
    }

    let currentAboveColor;

    let currentRow = floor(i / cols);
    let currentCanonicalCol = i % cols;

    let currentVisualCol;
    if (currentRow % 2 === 0) {
      currentVisualCol = currentCanonicalCol;
    } else {
      currentVisualCol = (cols - 1) - currentCanonicalCol;
    }

    if (currentRow === 0) {
      currentAboveColor = currentBelowColor;
    } else {
      let rowAbove = currentRow - 1;
      let visualColAbove = currentVisualCol;

      let indexAbove;
      if (rowAbove % 2 === 0) {
        indexAbove = rowAbove * cols + visualColAbove;
      } else {
        indexAbove = rowAbove * cols + (cols - 1 - visualColAbove);
      }

      // Check if stitchColorData[indexAbove] and its belowColor property exist and are valid
      if (indexAbove >= 0 && indexAbove < binaryMessage.length &&
          stitchColorData[indexAbove] && stitchColorData[indexAbove].belowColor &&
          typeof stitchColorData[indexAbove].belowColor.toString === 'function') {
        currentAboveColor = stitchColorData[indexAbove].belowColor;
      } else {
        console.warn(`[calculateAllStitchColors] Stitch above index ${i} (visual col ${currentVisualCol}, indexAbove ${indexAbove}) color data not ready or invalid. Using current belowColor as fallback.`);
        currentAboveColor = currentBelowColor; // currentBelowColor should be valid here due to the check above
      }
    }
    stitchColorData[i] = { belowColor: currentBelowColor, aboveColor: currentAboveColor };
  }
}

function calculateStitchColorsForAppend(startIndex) {
  let cols = currentCols; // Use the global currentCols
  stitchColorData.length = binaryMessage.length; // Ensure array is sized for new messages

  for (let i = startIndex; i < binaryMessage.length; i++) {
    let currentBelowColor = color(colorsForStitches[i]);
    if (!currentBelowColor || typeof currentBelowColor.toString !== 'function') {
      console.warn(`[calculateStitchColorsForAppend] Invalid belowColor from colorsForStitches[${i}]: ${colorsForStitches[i]}. Using default.`);
      currentBelowColor = color(200);
    }

    let currentAboveColor;

    let currentRow = floor(i / cols);
    let currentCanonicalCol = i % cols;

    let currentVisualCol;
    if (currentRow % 2 === 0) {
      currentVisualCol = currentCanonicalCol;
    } else {
      currentVisualCol = (cols - 1) - currentCanonicalCol;
    }

    if (currentRow === 0) {
      currentAboveColor = currentBelowColor;
    } else {
      let rowAbove = currentRow - 1;
      let visualColAbove = currentVisualCol;

      let indexAbove;
      if (rowAbove % 2 === 0) {
        indexAbove = rowAbove * cols + visualColAbove;
      } else {
        indexAbove = rowAbove * cols + (cols - 1 - visualColAbove);
      }

      if (indexAbove >= 0 && indexAbove < binaryMessage.length &&
          stitchColorData[indexAbove] && stitchColorData[indexAbove].belowColor &&
          typeof stitchColorData[indexAbove].belowColor.toString === 'function') {
        currentAboveColor = stitchColorData[indexAbove].belowColor;
      } else {
        console.warn(`[calculateStitchColorsForAppend] Stitch above index ${i} (visual col ${currentVisualCol}, indexAbove ${indexAbove}) color data not ready or invalid. Using current belowColor as fallback.`);
        currentAboveColor = currentBelowColor;
      }
    }
    stitchColorData[i] = { belowColor: currentBelowColor, aboveColor: currentAboveColor };
  }
}

function calculateAllLoopColors() {
  let cols = currentCols; // Use the global currentCols
  loopColorData = new Array(binaryMessage.length).fill(null);

  for (let i = 0; i < binaryMessage.length; i++) {
    let loopColor;
    // Check if stitchColorData[i] exists AND its belowColor property exists and is a valid p5.Color
    if (stitchColorData[i] && stitchColorData[i].belowColor && typeof stitchColorData[i].belowColor.toString === 'function') {
      loopColor = stitchColorData[i].belowColor;
    } else {
      console.warn(`[calculateAllLoopColors] Stitch color data for index ${i} not ready or invalid for loop color. Using default.`);
      loopColor = color(200);
    }
    loopColorData[i] = { loopColor: loopColor };
  }
}

function calculateLoopColorsForAppend(startIndex) {
  let cols = currentCols; // Use the global currentCols
  loopColorData.length = binaryMessage.length;

  for (let i = startIndex; i < binaryMessage.length; i++) {
    let loopColor;
    if (stitchColorData[i] && stitchColorData[i].belowColor && typeof stitchColorData[i].belowColor.toString === 'function') {
      loopColor = stitchColorData[i].belowColor;
    } else {
      console.warn(`[calculateLoopColorsForAppend] Stitch color data for index ${i} not ready or invalid for loop color. Using default.`);
      loopColor = color(200);
    }
    loopColorData[i] = { loopColor: loopColor };
  }
}


// --- Image Loading Functions (MODIFIED to use currentStitchSize) ---
function loadAllStitchImages(callback) {
  let loadedCount = 0;
  let totalStitches = binaryMessage.length;

  if (totalStitches === 0) {
    callback();
    return;
  }

  stitchImages = new Array(totalStitches).fill(null);

  for (let i = 0; i < totalStitches; i++) {
    const { belowColor, aboveColor } = stitchColorData[i];

    let svgContent = binaryMessage[i] === '0' ? knitSVGString : purlSVGString;
    let coloredSVGDataURL = getColoredSVGDataURL(svgContent, belowColor, aboveColor);

    ((idx) => {
      loadImage(coloredSVGDataURL, img => {
        stitchImages[idx] = img;
        loadedCount++;
        if (loadedCount === totalStitches) {
          callback();
        }
      });
    })(i);
  }
}

function appendStitchImages(startIndex, callback) {
  let loadedCount = 0;
  let stitchesToAppend = binaryMessage.length - startIndex;

  if (stitchesToAppend === 0) {
    callback();
    return;
  }

  stitchImages.length = binaryMessage.length;

  for (let i = startIndex; i < binaryMessage.length; i++) {
    const { belowColor, aboveColor } = stitchColorData[i];

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

function loadAllLoopImages(callback) {
  let loadedCount = 0;
  let totalLoops = binaryMessage.length;

  if (totalLoops === 0) {
    callback();
    return;
  }

  loopImages = new Array(totalLoops).fill(null);

  for (let i = 0; i < totalLoops; i++) {
    const loopColor = loopColorData[i].loopColor;

    let coloredLoopURL = getColoredSVGDataURL(loopsSVGString, loopColor, null);

    ((idx) => {
      loadImage(coloredLoopURL, img => {
        loopImages[idx] = img;
        loadedCount++;
        if (loadedCount === totalLoops) {
          callback();
        }
      });
    })(i);
  }
}

function appendLoopImages(startIndex, callback) {
  let loadedCount = 0;
  let loopsToAppend = binaryMessage.length - startIndex;

  if (loopsToAppend === 0) {
    callback();
    return;
  }

  loopImages.length = binaryMessage.length;

  for (let i = startIndex; i < binaryMessage.length; i++) {
    const loopColor = loopColorData[i].loopColor;

    let coloredLoopURL = getColoredSVGDataURL(loopsSVGString, loopColor, null);

    ((idx) => {
      loadImage(coloredLoopURL, img => {
        loopImages[idx] = img;
        loadedCount++;
        if (loadedCount === loopsToAppend) {
          callback();
        }
      });
    })(i);
  }
}

/**
 * Helper function to modify SVG colors and return a Data URL.
 * It intelligently applies colors based on whether the SVG is a main stitch or a loop.
 *
 * @param {string} svgContent The SVG content as a string.
 * @param {p5.Color} primaryFillColor The main color for the current stitch's body OR the loop's fill.
 * @param {p5.Color | null} connectingColor The color for the top/connecting part (only for main stitches).
 * @returns {string} A Data URL representing the modified SVG.
 */
function getColoredSVGDataURL(svgContent, primaryFillColor, connectingColor) {
  let tempDiv = document.createElement('div');
  tempDiv.innerHTML = svgContent;
  let svgElement = tempDiv.querySelector('svg');

  if (!svgElement) {
    console.error("Could not parse SVG content.");
    return '';
  }

  // Set the viewBox to match the dynamic stitch size, maintaining aspect ratio
  // The original SVGs are 30x30, so we'll scale them to currentStitchSize
  svgElement.setAttribute('viewBox', `0 0 30 30`); // Keep original viewBox
  svgElement.setAttribute('width', currentStitchSize); // Set explicit width
  svgElement.setAttribute('height', currentStitchSize); // Set explicit height

  // Adjusted the check for loopsSVG to include cls-2.
  // The loops.svg content you provided has both cls-1 (polygon) and cls-2 (path).
  // The original check `!svgContent.includes('class="cls-2"')` would incorrectly identify loops.svg
  // as a main stitch if it contains cls-2.
  // A safer check is to see if it *only* contains cls-1 and cls-2, and doesn't contain cls-3
  // which is characteristic of the main stitches.
  const isLoopsSVG = svgContent.includes('class="cls-1"') && svgContent.includes('class="cls-2"') && !svgContent.includes('class="cls-3"');


  if (isLoopsSVG) {
    // This branch is for loops.svg
    let cls1Elements = svgElement.querySelectorAll('.cls-1');
    cls1Elements.forEach(el => {
      // primaryFillColor is loopColor for loopsSVG
      el.style.fill = primaryFillColor.toString();
    });

    // Explicitly set fill:none for .cls-2 elements in loops.svg
    // These are intended to be stroke-only.
    let cls2Elements = svgElement.querySelectorAll('.cls-2');
    cls2Elements.forEach(el => {
      el.style.fill = 'none'; // Force no fill
    });

  } else {
    // This branch is for knit7.svg or purl7.svg (main stitches)

    // cls-1 is the main body/base of the stitch. It should take the current stitch's color (belowColor).
    let cls1Elements = svgElement.querySelectorAll('.cls-1');
    cls1Elements.forEach(el => {
      el.style.fill = primaryFillColor.toString(); // primaryFillColor is belowColor
    });

    // cls-2 was the "below" part, which is now visually "above" due to inversion.
    // It should now take the connectingColor (which is aboveColor).
    let cls2Elements = svgElement.querySelectorAll('.cls-2');
    cls2Elements.forEach(el => {
      el.style.fill = connectingColor.toString(); // Changed from primaryFillColor to connectingColor
    });

    // cls-3 was the "above" part, which is now visually "below" due to inversion.
    // It should now take the primaryFillColor (which is belowColor).
    let cls3Elements = svgElement.querySelectorAll('.cls-3');
    cls3Elements.forEach(el => {
      el.style.fill = primaryFillColor.toString(); // Changed from connectingColor to primaryFillColor
    });
  }

  let modifiedSVGString = new XMLSerializer().serializeToString(svgElement);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(modifiedSVGString);
}


// --- Auto-Scrolling (MODIFIED to use currentStitchSize and currentCols) ---
function autoScrollIfNeeded() {
  let cols = currentCols; // Use the global currentCols
  let currentRow = floor((stitchIndex - 1) / cols);

  let visibleRowsInViewport = floor(windowHeight / currentStitchSize); // Use currentStitchSize
  let targetScrollY = (currentRow - (visibleRowsInViewport - scrollBufferRows)) * currentStitchSize; // Use currentStitchSize

  targetScrollY = max(0, targetScrollY);

  if (currentRow > lastScrollRow && window.scrollY < targetScrollY) {
    if (abs(window.scrollY - targetScrollY) > 5) {
      window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    }
    lastScrollRow = currentRow;
  }
}
// ... (Your existing global variables and preload/setup functions) ...

document.addEventListener('keydown', (event) => {
  // Check if the pressed key is 's' (case-insensitive)
  if (event.key === 's' || event.key === 'S') {
      event.preventDefault(); // Prevent any default browser action for 's' key

      // Get the full body element to capture
      const bodyElement = document.body;

      // Use html2canvas to capture the body
      html2canvas(bodyElement, {
          // Options for html2canvas
          scale: 2, // Increase scale for higher resolution image
          logging: false, // Turn off logging for cleaner console
          useCORS: true, // Important for images loaded from different origins (if any)
          // Set the background color to white for the screenshot
          backgroundColor: '#000000', // Forces a white background
      }).then(canvas => {
          // Create a temporary link element
          const link = document.createElement('a');
          link.download = 'tapestry_screenshot.png'; // Set the download filename
          link.href = canvas.toDataURL('image/png'); // Get the image data as PNG
          document.body.appendChild(link); // Append link to body (required for Firefox)
          link.click(); // Programmatically click the link to trigger download
          document.body.removeChild(link); // Remove the link after download
      }).catch(err => {
          console.error("Error capturing screenshot:", err);
      });
  }
});

// ... (Rest of your script-tapestry.js functions) ...