/**
 * Small text helpers shared by the apps (no SDK: isolated apps can use them too).
 */

/**
 * The text as a regular expression that matches it literally. Escapes the syntax characters and
 * '/', which is valid with and without the 'u' flag ('-' is not escaped: outside a class it is
 * literal, and '\-' is an error with 'u').
 */
export const escapeRegExp = text => String(text).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** A name as typed: spaces, tabs and new lines collapsed into one space, none at the ends. */
export const cleanName = text => String(text).replace(/\s+/g, ' ').trim();
