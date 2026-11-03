/**
 * The POSIX character classes ([[:digit:]]) as the inside of a JavaScript bracket expression:
 * shell patterns (pattern.js) and regular expressions of grep and sed (commands/regex.js).
 */
export const POSIX_CLASSES = {
  alpha: 'a-zA-Z', digit: '0-9', alnum: 'a-zA-Z0-9', upper: 'A-Z', lower: 'a-z', space: '\s', blank: ' \t',
  punct: '!-\/:-@\[-`{-~', xdigit: '0-9A-Fa-f', word: '\w', cntrl: '\x00-\x1f\x7f', print: '\x20-\x7e', graph: '\x21-\x7e',
};
