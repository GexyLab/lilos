/**
 * The numerical analysis blocks of Logic Studio (category «Analisi numerica», types num.*), loaded
 * by the engine in each user's worker (and read in the kernel's main thread for the catalog:
 * nothing here runs at import). Same format as logicstudio-core/blocks.js.
 *
 * A function travels as text, in the syntax of the fn.* blocks (lib/shared/mathexpr.js, a parser
 * of our own: no eval, no libraries): a block takes it from its input «f», or from its setting
 * «Funzione» when nothing is linked to f. Angles are radians. Every numeric loop is bounded by a
 * count and a time budget (lib/numeric.js).
 *
 * The blocks are in lib/: formulas.js (sample, compose, simplify, gradient, extrema), data.js
 * (derivative of data, interpolation, fit, complex numbers), series.js (sequences, series, real-time
 * simulation of differential equations). What the other math packages have (derivatives, limits,
 * Taylor, integrals, ODEs, FFT…) is in logicstudio-functions, -integrals and -signals.
 */
import { blocks as formulas } from './lib/formulas.js';
import { blocks as data } from './lib/data.js';
import { blocks as series } from './lib/series.js';

export const blocks = [...formulas, ...data, ...series];
