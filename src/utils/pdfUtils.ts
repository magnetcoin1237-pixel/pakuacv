import { jsPDF } from 'jspdf';

/**
 * Finds the best Y-coordinate for a page break by looking for blank horizontal lines.
 * This prevents cutting through text or elements.
 */
export async function findBestPageBreak(
  canvas: HTMLCanvasElement,
  startY: number,
  pageHeight: number,
  lookBackLimit: number = 100 // pixels to look back from the bottom
): Promise<number> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return startY + pageHeight;

  const width = canvas.width;
  const targetY = Math.min(startY + pageHeight, canvas.height);
  
  if (targetY === canvas.height) return targetY;

  // Scan backwards from targetY to find a blank line
  for (let y = targetY; y > targetY - lookBackLimit; y--) {
    if (y <= startY) break;

    const imageData = ctx.getImageData(0, y, width, 1).data;
    let isBlank = true;
    
    // Check if the entire row is "blank" (white/transparent)
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];
      
      // If any pixel is not white and not transparent
      if (a > 10 && (r < 250 || g < 250 || b < 250)) {
        isBlank = false;
        break;
      }
    }
    
    if (isBlank) {
      return y;
    }
  }
  
  // If no blank line found, just return the targetY
  return targetY;
}

/**
 * Generates a multi-page PDF from a canvas with smart page breaks and margins.
 */
export async function generateSmartPdf(
  canvas: HTMLCanvasElement,
  filename: string
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  // Define margins in mm
  const topMargin = 15;
  const bottomMargin = 15;
  const leftMargin = 0; // The canvas already has its own padding usually, but we can add if needed
  
  // Available height for content on each page
  const availableHeightMm = pdfHeight - topMargin - bottomMargin;
  
  // Convert mm to pixels for canvas calculations
  const pxToMm = pdfWidth / canvas.width;
  const availableHeightPx = availableHeightMm / pxToMm;
  
  let currentY = 0;
  let isFirstPage = true;

  while (currentY < canvas.height) {
    if (!isFirstPage) {
      pdf.addPage();
    }
    
    // Find the best break point for this page within the available height
    const breakY = await findBestPageBreak(
      canvas, 
      currentY, 
      Math.floor(availableHeightPx), 
      Math.floor(availableHeightPx * 0.2) // Look back up to 20% of page height
    );
    
    const sliceHeight = breakY - currentY;
    
    // Create a temporary canvas for this page's slice
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    
    const pageCtx = pageCanvas.getContext('2d');
    if (pageCtx) {
      pageCtx.drawImage(
        canvas,
        0, currentY, canvas.width, sliceHeight, // source
        0, 0, canvas.width, sliceHeight // destination
      );
      
      const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 1.0);
      const displayHeight = sliceHeight * pxToMm;
      
      // Add image with top margin
      pdf.addImage(pageDataUrl, 'JPEG', leftMargin, topMargin, pdfWidth, displayHeight);
    }
    
    currentY = breakY;
    isFirstPage = false;
    
    // Safety break to prevent infinite loops
    if (sliceHeight <= 0) break;
  }

  pdf.save(filename);
}
