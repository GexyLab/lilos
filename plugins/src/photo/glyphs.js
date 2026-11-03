import { svg, icon } from '@lilos/sdk';

/** Symbols the SDK does not have (same drawing rules as its icons: 24×24, stroke). */
const GLYPHS = {
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8.5a6.5 6.5 0 0 1-6.5 6.5h-.8a6 6 0 0 1-4.6-2.2L3.6 15a1.5 1.5 0 0 1 2.3-1.9L8 15.5"/>',
  brush: '<path d="M19.5 3.5l1 1-8.8 9.8-2-2z"/><path d="M9.7 12.3c-2.2-.4-4.2 1-4.2 3.4 0 1.6-.8 2.6-2 3.3 3.8 1.1 8.4.3 8.2-4.7"/>',
  text: '<path d="M5 6V4.5h14V6M12 4.5V20M9 20h6"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M2 6h14a2 2 0 0 1 2 2v14"/>',
  resize: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
  convert: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  actual: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M11 9l2-1.5V16"/>',
};

/** An SDK icon, or one of the app's own. */
export const glyph = name => (GLYPHS[name] ? svg('0 0 24 24', 'ico', GLYPHS[name]) : icon(name));
