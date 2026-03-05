/**
 * Utility to convert OKLCH colors to RGB for libraries that don't support modern CSS (like html2canvas)
 */
export function convertOklchToRgb(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;
  
  // We need to append it to the body to get computed styles, but hidden
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '-9999px';
  clone.style.visibility = 'hidden';
  document.body.appendChild(clone);

  const allElements = clone.querySelectorAll('*');
  const originalElements = element.querySelectorAll('*');

  // Helper to convert any color string to RGB using canvas
  const toRgb = (color: string): string => {
    if (!color || color === 'transparent' || color === 'none') return color;
    return resolveOklchInString(color);
  };

  // Iterate and apply computed colors
  [clone, ...Array.from(allElements)].forEach((el, i) => {
    const originalEl = i === 0 ? element : originalElements[i - 1];
    if (!originalEl) return;

    const computedStyle = window.getComputedStyle(originalEl);
    const htmlEl = el as HTMLElement;

    // Iterate over all computed properties to find any oklch or var
    // This is more thorough than a fixed list of properties
    for (let j = 0; j < computedStyle.length; j++) {
      const prop = computedStyle[j];
      const value = computedStyle.getPropertyValue(prop);
      
      if (value && (value.includes('oklch') || value.includes('var'))) {
        try {
          const converted = toRgb(value);
          if (converted !== value) {
            htmlEl.style.setProperty(prop, converted, 'important');
          }
        } catch (e) {
          // Skip properties that fail to convert
        }
      }
    }
  });

  // Remove from body but keep the clone for processing
  document.body.removeChild(clone);
  clone.style.position = '';
  clone.style.left = '';
  clone.style.top = '';
  clone.style.visibility = '';
  
  return clone;
}

/**
 * Resolves oklch colors in a string (like a CSS rule or a complex value)
 */
export function resolveOklchInString(str: string): string {
  if (!str || !str.includes('oklch')) return str;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return str;

  return str.replace(/oklch\([^)]+\)/g, (match) => {
    try {
      ctx.fillStyle = match;
      const resolved = ctx.fillStyle;
      return resolved || match;
    } catch (e) {
      return match;
    }
  });
}
