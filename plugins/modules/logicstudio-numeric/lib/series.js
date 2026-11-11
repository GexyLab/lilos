/**
 * Numerical analysis blocks: sequences and series, and the real-time simulation of differential
 * equations (stepping them while the program runs). The formulas are in the syntax of
 * lib/shared/mathexpr.js (angles in radians).
 */
import * as N from './numeric.js';
import { parse, compile } from './shared/mathexpr.js';
import {
  L, num, text, tidy, intIn, real, bound, need, numbersOf, goodName, pure, pick, F_IN, exprField, varField, treeOf, functionOf,
  category,
} from './common.js';

const MAX_TERMS = 100000;
const seqVar = { ...varField, default: 'n' };

/** The equations of a block: its «f» (or the setting) split at «;», plus the ones of the added inputs. */
function equationsOf(inputs, c) {
  const list = [];
  const first = inputs.f !== undefined && text(inputs.f).trim() !== '' ? text(inputs.f) : text(c.config.expr);
  for (const part of first.split(';')) if (part.trim()) list.push(part.trim());
  for (const p of c.added.inputs) if (p.value !== undefined && text(p.value).trim() !== '') for (const part of text(p.value).split(';')) if (part.trim()) list.push(part.trim());
  return list;
}

/** "y' = -k*y" gives "-k*y": the left side is optional. */
const rightSide = e => e.replace(/^\s*[A-Za-z_][A-Za-z0-9_]*'*\s*=(?!=)\s*/, '');

/** { names, tName, F(t, y), y0 } from the equations of a block. */
function systemOf(inputs, c) {
  const names = text(c.config.variables || 'y').split(/[\s,;]+/).filter(Boolean);
  const tName = text(c.config.timeVar).trim() || 't';
  if (!names.length || names.length > 16) throw new Error('Servono da 1 a 16 variabili');
  for (const nm of [tName, ...names]) if (!goodName(nm)) throw new Error(`Nome di variabile non valido: «${nm}»`);
  if (new Set([tName, ...names]).size !== names.length + 1) throw new Error('Due variabili hanno lo stesso nome');
  const eqs = equationsOf(inputs, c);
  if (eqs.length > 16) throw new Error('Al massimo 16 equazioni');
  if (eqs.length !== names.length) throw new Error(`Servono ${names.length} equazioni (una per variabile: ${names.join(', ')}) ma ce ne sono ${eqs.length}`);
  const params = {};
  if (inputs.params && typeof inputs.params === 'object') {
    for (const [k, v] of Object.entries(inputs.params)) {
      if (!goodName(k)) throw new Error(`Nome di parametro non valido: «${k}»`);
      params[k] = need(v, `Il parametro «${k}»`);
    }
  }
  const fns = eqs.map(e => compile(parse(rightSide(e)), [tName, ...names], params));
  const F = (t, y) => fns.map(fn => fn(t, ...y));
  // starting values
  let y0 = inputs.y0 !== undefined && inputs.y0 !== null && inputs.y0 !== '' ? inputs.y0 : c.config.initial;
  y0 = numbersOf(y0, 'Valore iniziale');
  if (y0.length !== names.length) throw new Error(`Servono ${names.length} valori iniziali (uno per variabile) ma ce ne sono ${y0.length}`);
  return { names, tName, F, y0 };
}

export const blocks = [
  pure({
    type: 'num.sequence', icon: 'list', label: L('Sequence aₙ', 'Successione aₙ'),
    inputs: [F_IN, { name: 'from', type: 'number', label: L('from n', 'da n') }, { name: 'to', type: 'number', label: L('to n', 'a n') }],
    outputs: [
      { name: 'terms', type: 'list', label: L('terms', 'termini') },
      { name: 'n', type: 'list', label: L('n list', 'lista delle n') },
      { name: 'points', type: 'list', label: L('points {x, y}', 'punti {x, y}') },
      { name: 'last', type: 'number', label: L('last term', 'ultimo termine') },
    ],
    config: [
      exprField('1/n^2'), seqVar,
      { key: 'mode', type: 'select', default: 'explicit', options: [{ value: 'explicit', label: L('Explicit: aₙ = f(n)', 'Esplicita: aₙ = f(n)') }, { value: 'recursive', label: L('Recursive: aₙ = f(n, a, b), a = aₙ₋₁, b = aₙ₋₂', 'Ricorsiva: aₙ = f(n, a, b), a = aₙ₋₁, b = aₙ₋₂') }], label: L('Kind', 'Tipo') },
      { key: 'first', type: 'text', default: '1', label: L('First term (recursive)', 'Primo termine (ricorsiva)'), when: { mode: 'recursive' } },
      { key: 'second', type: 'text', default: '', label: L('Second term (recursive, optional)', 'Secondo termine (ricorsiva, facoltativo)'), when: { mode: 'recursive' } },
      { key: 'from', type: 'number', default: 1, label: L('From n (when not linked)', 'Da n (se non è collegato)') },
      { key: 'to', type: 'number', default: 10, label: L('To n (when not linked)', 'A n (se non è collegato)') },
    ],
    compute(inputs, c) {
      const from = Math.round(real(pick(inputs, c, 'from'), 'n iniziale')), to = Math.round(real(pick(inputs, c, 'to'), 'n finale'));
      if (to < from) throw new Error('n finale è minore di n iniziale');
      if (to - from + 1 > MAX_TERMS) throw new Error(`Troppi termini (più di ${MAX_TERMS})`);
      const tree = treeOf(inputs, c);
      const v = String(c.config.variable ?? 'n').trim() || 'n';
      if (!goodName(v)) throw new Error(`Nome di variabile non valido: «${v}»`);
      const tick = N.budget();
      const n = [], terms = [];
      const clean = y => (Number.isFinite(y) ? tidy(y) : null);
      if (c.config.mode === 'recursive') {
        if (v === 'a' || v === 'b') throw new Error('La variabile non può chiamarsi a né b: sono i due termini precedenti');
        const fn = functionOf(tree, [v, 'a', 'b']);
        const first = real(c.config.first, 'Primo termine');
        const hasSecond = text(c.config.second).trim() !== '';
        let prev = first, prev2 = 0;
        n.push(from); terms.push(clean(prev));
        for (let k = from + 1; k <= to; k++) {
          tick();
          const next = k === from + 1 && hasSecond ? real(c.config.second, 'Secondo termine') : fn(k, prev, prev2);
          prev2 = prev; prev = next;
          n.push(k); terms.push(clean(next));
        }
      } else {
        const fn = functionOf(tree, [v]);
        for (let k = from; k <= to; k++) { tick(); n.push(k); terms.push(clean(fn(k))); }
      }
      return { terms, n, points: n.map((x, i) => ({ x, y: terms[i] })), last: terms[terms.length - 1] };
    },
  }),

  pure({
    type: 'num.series', icon: 'matrix', label: L('Series Σ · Product Π', 'Serie Σ · Produttoria Π'),
    inputs: [F_IN, { name: 'from', type: 'number', label: L('from n', 'da n') }, { name: 'to', type: 'number', label: L('to n', 'a n') }],
    outputs: [
      { name: 'value', type: 'number', label: L('value', 'valore') },
      { name: 'converges', type: 'bool', label: L('converges', 'converge') },
      { name: 'partial', type: 'list', label: L('partial sums', 'somme parziali') },
      { name: 'terms', type: 'number', label: L('terms used', 'termini usati') },
    ],
    config: [
      exprField('1/n^2'), seqVar,
      { key: 'kind', type: 'select', default: 'sum', options: [{ value: 'sum', label: L('Sum Σ', 'Somma Σ') }, { value: 'product', label: L('Product Π', 'Produttoria Π') }], label: L('Operation', 'Operazione') },
      { key: 'from', type: 'text', default: '1', label: L('From n (when not linked)', 'Da n (se non è collegato)') },
      { key: 'to', type: 'text', default: 'inf', label: L('To n, also inf (when not linked)', 'A n, anche inf (se non è collegato)') },
      { key: 'maxTerms', type: 'number', default: 100000, min: 10, max: 2000000, label: L('Most terms', 'Termini al massimo') },
      { key: 'keep', type: 'number', default: 200, min: 2, max: 5000, label: L('Partial sums kept', 'Somme parziali tenute') },
    ],
    compute(inputs, c) {
      const from = Math.round(bound(pick(inputs, c, 'from'), 'n iniziale'));
      const to = bound(pick(inputs, c, 'to'), 'n finale', true);
      if (to < from) throw new Error('n finale è minore di n iniziale');
      const v = String(c.config.variable ?? 'n').trim() || 'n';
      if (!goodName(v)) throw new Error(`Nome di variabile non valido: «${v}»`);
      const fn = functionOf(treeOf(inputs, c), [v]);
      const r = N.seriesSum(fn, from, Number.isFinite(to) ? Math.round(to) : Infinity, {
        maxTerms: intIn(c.config.maxTerms, 10, 2000000, 'Termini al massimo'), keep: intIn(c.config.keep, 2, 5000, 'Somme parziali tenute'),
        product: c.config.kind === 'product', tick: N.budget(),
      });
      return { value: r.value === null ? undefined : tidy(r.value), converges: r.converges, partial: r.partial.map(tidy), terms: r.count };
    },
  }),

  {
    type: 'num.simulate', version: 1, category, icon: 'play', label: L('Simulate over time', 'Simula nel tempo'),
    inputs: [
      { name: 'start', type: 'pulse', label: L('start', 'avvia') },
      { name: 'stop', type: 'pulse', label: L('stop', 'ferma') },
      { name: 'reset', type: 'pulse', label: L('reset', 'azzera') },
      { name: 'f', type: 'text', label: L('f (equations)', 'f (equazioni)') },
      { name: 'y0', type: 'any', label: L('y(0)', 'y(0)'), hidden: true },
      { name: 'params', type: 'object', label: L('parameters', 'parametri'), hidden: true },
    ],
    outputs: [
      { name: 't', type: 'number', label: L('t', 't') },
      { name: 'y', type: 'number', label: L('y (first variable)', 'y (prima variabile)') },
      { name: 'state', type: 'list', label: L('state', 'stato') },
      { name: 'running', type: 'bool', label: L('running', 'in corso') },
    ],
    config: [
      { key: 'expr', type: 'text', default: '-0.5 y', label: L('Equations y′ = … (a ; between them; used when f is not linked)', 'Equazioni y′ = … (separate da ;, se f non è collegato)') },
      { key: 'variables', type: 'text', default: 'y', label: L('Variables (y1, y2…)', 'Variabili (y1, y2…)') },
      { key: 'timeVar', type: 'text', default: 't', label: L('Time variable', 'Variabile del tempo') },
      { key: 'initial', type: 'text', default: '1', label: L('Starting values', 'Valori iniziali') },
      { key: 'method', type: 'select', default: 'rk4', options: [{ value: 'rk4', label: L('Runge-Kutta 4', 'Runge-Kutta 4') }, { value: 'euler', label: L('Euler', 'Eulero') }], label: L('Method', 'Metodo') },
      { key: 'dt', type: 'number', default: 0.01, min: 1e-6, max: 1000, label: L('Step of the simulation (time units)', 'Passo della simulazione (unità di tempo)') },
      { key: 'tick', type: 'number', default: 100, min: 20, max: 60000, label: L('Send every (ms)', 'Invia ogni (ms)') },
      { key: 'speed', type: 'number', default: 1, min: 0.001, max: 100000, label: L('Speed (simulated time per real second)', 'Velocità (tempo simulato per secondo reale)') },
      { key: 'tMax', type: 'number', default: 0, min: 0, label: L('Stop at t (0: never)', 'Fermati a t (0: mai)') },
      { key: 'auto', type: 'checkbox', default: false, label: L('Start by itself when the program starts', 'Parti da solo all\'avvio del programma') },
    ],
    grow: { inputs: { type: 'text', max: 15, name: 'number', label: L('equation', 'equazione') } },
    start(c) {
      if (c.config.auto && !c.linked('start')) begin(c, c.memory(), {});
    },
    run(inputs, c) {
      const m = c.memory();
      switch (c.trigger) {
        case 'start': return begin(c, m, inputs);
        case 'stop': halt(c, m); return { running: false };
        case 'reset': {
          m.sys = systemOf(inputs, c);
          m.t = 0; m.y = m.sys.y0.slice();
          return report(m);
        }
        default:
          // the equation, the starting values or the parameters changed: rebuilt at the next step
          m.stale = true;
          m.lastInputs = inputs;
          return undefined;
      }
    },
  },
];

function begin(c, m, inputs) {
  m.lastInputs = inputs;
  if (!m.sys || m.stale) {
    const keep = m.y, keepT = m.t;
    m.sys = systemOf(inputs, c);
    m.stale = false;
    if (keep && keep.length === m.sys.y0.length) { m.y = keep; m.t = keepT; }
  }
  if (m.y === undefined) { m.t = 0; m.y = m.sys.y0.slice(); }
  if (!m.timer) {
    m.last = c.now();
    const ms = intIn(c.config.tick, 20, 60000, 'Invia ogni (ms)');
    m.timer = c.setInterval(() => tickOnce(c, m), ms);
    m.running = true;
  }
  return { ...report(m), running: true };
}

function halt(c, m) {
  if (m.timer) c.clearTimer(m.timer);
  m.timer = null;
  m.running = false;
}

const report = m => ({ t: tidy(m.t), y: tidy(m.y[0]), state: m.y.map(tidy) });

/** One step of the simulation: the real time that passed (x speed) is integrated in steps of dt. */
function tickOnce(c, m) {
  if (m.stale) {
    const keep = m.y, keepT = m.t;
    m.sys = systemOf(m.lastInputs ?? {}, c);
    m.stale = false;
    if (keep && keep.length === m.sys.y0.length) { m.y = keep; m.t = keepT; }
  }
  const now = c.now();
  const speed = Math.max(0.001, num(c.config.speed) || 1);
  let simDt = Math.max(0, ((now - m.last) / 1000) * speed);
  m.last = now;
  const tMax = num(c.config.tMax) || 0;
  let done = false;
  if (tMax > 0 && m.t + simDt >= tMax) { simDt = Math.max(0, tMax - m.t); done = true; }
  const dt = Math.max(1e-6, num(c.config.dt) || 0.01);
  const steps = Math.min(5000, Math.max(1, Math.ceil(simDt / dt)));   // a limit per tick: the simulation falls behind if it must
  const h = simDt / steps;
  if (simDt > 0) {
    for (let i = 0; i < steps; i++) {
      m.y = N.stepOde(m.sys.F, m.t, m.y, h, c.config.method === 'euler' ? 'euler' : 'rk4');
      m.t += h;
    }
    if (m.y.some(v => !Number.isFinite(v))) { halt(c, m); c.send('running', false); throw new Error(`La soluzione non è finita: diverge intorno a t = ${Number(m.t.toPrecision(6))}`); }
  }
  for (const [port, value] of Object.entries(report(m))) c.send(port, value);
  if (done) { halt(c, m); c.send('running', false); }
}
