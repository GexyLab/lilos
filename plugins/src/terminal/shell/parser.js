import { Incomplete, ParseError } from './signals.js';
import { t } from '../i18n.js';

/**
 * Parser of the bash language, straight from the source text (bash parsing depends on where it
 * is: keywords only where a command starts, here-documents after the end of the line…).
 *
 *   list      { type: 'list', items: [{ node, async, text }] }          a; b & c
 *   andor     { type: 'andor', first, rest: [{ op: '&&' | '||', node }] }
 *   pipeline  { type: 'pipeline', negate, cmds, both: [bool] }         a | b |& c   (both: stderr too)
 *   simple    { type: 'simple', assigns: [Assign], words: [Word], redirs: [Redir] }
 *   if        { type: 'if', clauses: [{ cond, body }], otherwise }
 *   while     { type: 'while', until, cond, body }
 *   for       { type: 'for', name, words: [Word] | null, body }          null: "$@"
 *   cfor      { type: 'cfor', init, cond, step, body }                    for ((…; …; …))
 *   case      { type: 'case', word, items: [{ patterns, body, term }] }
 *   group     { type: 'group', body }      { … }
 *   subshell  { type: 'subshell', body }   ( … )
 *   arithcmd  { type: 'arithcmd', word }   (( … ))
 *   cond      { type: 'cond', expr }       [[ … ]]
 *   func      { type: 'func', name, body, text }   text: the definition as written
 * Compound commands have `redirs` too.
 *
 *   Word   { parts: [Part], noSplit? }
 *   Part   { type: 'lit', value } | { type: 'sq', value } (quoted text) | { type: 'dq', parts }
 *          | { type: 'param', name, index?, length?, indirect?, op?, arg?, … }
 *          | { type: 'cmdsub', body } | { type: 'arith', word }
 *   Assign { name, index?, append, value: Word | null, array: [Word] | null }
 *   Redir  { fd, op, target: Word, heredoc? }
 *
 * Throws Incomplete when the text ends inside a construct (the terminal asks for more lines) and
 * ParseError for a syntax error.
 */
const OPS = ['&>>', '<<<', '<<-', ';;&', '&&', '||', ';;', ';&', '|&', '<<', '>>', '<&', '>&', '<>', '>|', '&>', '|', '&', ';', '<', '>', '(', ')'];
const META = new Set(['|', '&', ';', '<', '>', '(', ')']);
const TERMINATORS = ['then', 'else', 'elif', 'fi', 'do', 'done', 'esac', '}'];
const CLOSERS = new Set([')', ';;', ';&', ';;&']);
const DECLARATIONS = new Set(['export', 'local', 'declare', 'typeset', 'readonly']);
const COND_BINARY = ['==', '!=', '=~', '=', '<', '>', '-eq', '-ne', '-lt', '-le', '-gt', '-ge', '-nt', '-ot', '-ef'];
const ASSIGN = /^([A-Za-z_]\w*)(?:\[([^\]]*)\])?(\+?)=/;
const REDIR = /(\d+)?(&>>|<<<|<<-|<<|>>|<&|>&|<>|>\||&>|<|>)/y;
const MAX_ALIASES = 100;

const isBlank = c => c === ' ' || c === '\t' || c === '\r';
const isDelim = c => c === undefined || isBlank(c) || c === '\n' || META.has(c);
const normalStop = c => isBlank(c) || c === '\n' || META.has(c);

export function parse(src, { aliases = null } = {}) {
  return new Parser(src, aliases).program();
}

/**
 * The commands of a text one line at a time, as bash reads them: an alias defined on a line works
 * from the next one, because each line is parsed only after the previous one ran.
 */
export function* commands(src, { aliases = null } = {}) {
  yield* new Parser(src, aliases).lines();
}

/** A word in arithmetic mode from a text: `$((…))`, `((…))`, array subscripts. */
export function parseArithWord(text) {
  const p = new Parser(String(text), null);
  const parts = p.readParts({ stop: () => false });
  return { parts };
}

class Parser {
  heredocs = [];
  aliasActive = new Set();
  aliasCount = 0;

  constructor(src, aliases) {
    this.src = String(src);
    this.pos = 0;
    this.aliases = aliases;
  }

  get ch() { return this.src[this.pos]; }
  get eof() { return this.pos >= this.src.length; }
  starts(s) { return this.src.startsWith(s, this.pos); }

  fail(message) {
    if (this.eof) throw new Incomplete(message);
    throw new ParseError(message);
  }

  near() {
    if (this.eof) return t('parse.nearEnd');
    if (this.ch === '\n') return t('parse.nearNewline');
    return t('parse.nearToken', { token: this.peekOp() ?? this.src.slice(this.pos).match(/^\S{1,20}/)?.[0] ?? this.ch });
  }

  // ---------- Blanks, newlines, operators ----------

  skipBlanks() {
    for (;;) {
      const c = this.ch;
      if (isBlank(c)) this.pos++;
      else if (c === '\\' && this.src[this.pos + 1] === '\n') this.pos += 2;
      else if (c === '\\' && this.pos === this.src.length - 1) throw new Incomplete();
      else if (c === '#') {
        const nl = this.src.indexOf('\n', this.pos);
        this.pos = nl < 0 ? this.src.length : nl;
      } else return;
    }
  }

  /** A newline: consumes it and reads the here-documents waiting for it. */
  newline() {
    if (this.ch !== '\n') return false;
    this.pos++;
    for (const redir of this.heredocs.splice(0)) this.readHeredoc(redir);
    return true;
  }

  linebreak() {
    this.skipBlanks();
    while (this.newline()) this.skipBlanks();
  }

  peekOp() {
    return OPS.find(op => this.starts(op)) ?? null;
  }

  atKeyword(kw) {
    if (!this.starts(kw)) return false;
    const next = this.src[this.pos + kw.length];
    // '{', '!' and '[[' need a blank after them ('{a,b}' and '!=' are words)
    if (kw === '{' || kw === '!' || kw === '[[') return next === undefined || isBlank(next) || next === '\n';
    return isDelim(next);
  }

  keyword(kw) {
    this.linebreak();
    if (!this.atKeyword(kw)) this.fail(t('parse.nearExpected', { near: this.near(), expected: kw }));
    this.pos += kw.length;
  }

  atTerminator() {
    if (this.eof) return true;
    const op = this.peekOp();
    if (op && CLOSERS.has(op)) return true;
    return TERMINATORS.some(kw => this.atKeyword(kw));
  }

  // ---------- Lists and commands ----------

  program() {
    const list = this.list();
    this.linebreak();
    if (!this.eof) throw new ParseError(t('parse.near', { near: this.near() }));
    if (this.heredocs.length) throw new Incomplete();
    return list;
  }

  /** Lists of the top level, one per line (see commands()). */
  *lines() {
    for (;;) {
      this.linebreak();
      if (this.eof) {
        if (this.heredocs.length) throw new Incomplete();
        return;
      }
      const items = [];
      for (;;) {
        if (this.atTerminator()) throw new ParseError(t('parse.near', { near: this.near() }));
        const start = this.pos;
        const node = this.andOr();
        const text = this.src.slice(start, this.pos).trim();
        this.skipBlanks();
        const op = this.peekOp();
        if (op === '&' || op === ';') {
          this.pos++;
          items.push({ node, async: op === '&', text });
          this.skipBlanks();
          if (this.eof || this.newline()) break;
          continue;
        }
        items.push({ node, async: false, text });
        if (this.eof || this.newline()) break;
        throw new ParseError(t('parse.near', { near: this.near() }));
      }
      yield { type: 'list', items };
    }
  }

  list() {
    const items = [];
    this.linebreak();
    while (!this.atTerminator()) {
      const start = this.pos;
      const node = this.andOr();
      const text = this.src.slice(start, this.pos).trim();
      this.skipBlanks();
      const op = this.peekOp();
      if (op === '&' || op === ';') {
        this.pos++;
        items.push({ node, async: op === '&', text });
      } else if (this.newline()) {
        items.push({ node, async: false, text });
      } else {
        items.push({ node, async: false, text });
        this.linebreak();
        if (!this.atTerminator()) throw new ParseError(t('parse.near', { near: this.near() }));
        break;
      }
      this.linebreak();
    }
    return { type: 'list', items };
  }

  andOr() {
    const first = this.pipeline();
    const rest = [];
    for (;;) {
      this.skipBlanks();
      const op = this.peekOp();
      if (op !== '&&' && op !== '||') break;
      this.pos += 2;
      this.linebreak();
      if (this.eof) throw new Incomplete();
      rest.push({ op, node: this.pipeline() });
    }
    return rest.length ? { type: 'andor', first, rest } : first;
  }

  pipeline() {
    this.skipBlanks();
    let negate = false;
    while (this.atKeyword('!')) {
      this.pos++;
      negate = !negate;
      this.skipBlanks();
    }
    const cmds = [this.command()];
    const both = [];
    for (;;) {
      this.skipBlanks();
      const op = this.peekOp();
      if (op !== '|' && op !== '|&') break;
      this.pos += op.length;
      both.push(op === '|&');
      this.linebreak();
      if (this.eof) throw new Incomplete();
      cmds.push(this.command());
    }
    if (cmds.length === 1 && !negate) return cmds[0];
    return { type: 'pipeline', negate, cmds, both };
  }

  command() {
    this.skipBlanks();
    if (this.eof) throw new Incomplete();
    const start = this.pos;
    let node;
    if (this.starts('((') && (node = this.arithCommand())) return this.redirects(node);
    const op = this.peekOp();
    if (op === '(') {
      this.pos++;
      const body = this.list();
      this.linebreak();
      if (this.ch !== ')') this.fail(t('parse.nearExpected', { near: this.near(), expected: ')' }));
      this.pos++;
      return this.redirects({ type: 'subshell', body });
    }
    if (op && !op.startsWith('<') && !op.startsWith('>') && op !== '&>' && op !== '&>>') {
      throw new ParseError(t('parse.near', { near: t('parse.nearToken', { token: op }) }));
    }
    if (this.atKeyword('if')) return this.redirects(this.ifClause());
    if (this.atKeyword('while')) return this.redirects(this.whileClause(false));
    if (this.atKeyword('until')) return this.redirects(this.whileClause(true));
    if (this.atKeyword('for')) return this.redirects(this.forClause());
    if (this.atKeyword('case')) return this.redirects(this.caseClause());
    if (this.atKeyword('{')) {
      this.pos++;
      const body = this.list();
      this.keyword('}');
      return this.redirects({ type: 'group', body });
    }
    if (this.atKeyword('[[')) return this.redirects(this.condCommand());
    if (this.atKeyword('function')) {
      this.pos += 8;
      this.skipBlanks();
      const m = /[A-Za-z_][\w.:-]*/y;
      m.lastIndex = this.pos;
      const name = m.exec(this.src)?.[0];
      if (!name) this.fail(t('parse.badFunctionName'));
      this.pos += name.length;
      this.skipBlanks();
      if (this.starts('(')) {
        this.pos++;
        this.skipBlanks();
        if (this.ch !== ')') this.fail(t('parse.parenAfterName'));
        this.pos++;
      }
      return this.funcBody(name, start);
    }
    const def = /([A-Za-z_][\w.:-]*)[ \t]*\([ \t]*\)/y;
    def.lastIndex = this.pos;
    const m = def.exec(this.src);
    if (m) {
      this.pos += m[0].length;
      return this.funcBody(m[1], start);
    }
    if (TERMINATORS.some(kw => this.atKeyword(kw))) throw new ParseError(t('parse.near', { near: this.near() }));
    return this.simple();
  }

  funcBody(name, start) {
    this.linebreak();
    if (this.eof) throw new Incomplete();
    const body = this.command();
    return { type: 'func', name, body, text: this.src.slice(start, this.pos).trim() };
  }

  redirects(node) {
    node.redirs ??= [];
    for (;;) {
      this.skipBlanks();
      if (!this.redirect(node.redirs)) return node;
    }
  }

  simple() {
    const node = { type: 'simple', assigns: [], words: [], redirs: [] };
    let declaration = false;
    for (;;) {
      this.skipBlanks();
      if (this.eof || this.ch === '\n') break;
      if (this.redirect(node.redirs)) continue;
      if (this.peekOp()) break;
      if (!node.words.length && this.aliases?.size && this.expandAlias()) continue;
      const start = this.pos;
      const word = this.word();
      if (!word) break;
      const raw = this.src.slice(start, this.pos);
      const asg = ASSIGN.exec(raw);
      if (asg && !node.words.length) {
        node.assigns.push(this.assignment(start, asg));
        continue;
      }
      if (asg && declaration && this.ch === '(' && raw.endsWith('=')) {
        // local a=(x y): the list is read like an array assignment
        const { array } = this.assignment(start, asg);
        node.words.push({ parts: [{ type: 'lit', value: raw }], declArray: { name: asg[1], append: asg[3] === '+', words: array } });
        continue;
      }
      if (asg && declaration) word.noSplit = true;
      node.words.push(word);
      if (node.words.length === 1) declaration = word.parts.length === 1 && word.parts[0].type === 'lit' && DECLARATIONS.has(word.parts[0].value);
    }
    this.aliasActive.clear();
    if (!node.words.length && !node.assigns.length && !node.redirs.length) throw new ParseError(t('parse.near', { near: this.near() }));
    return node;
  }

  /** NAME=value, NAME+=value, NAME[i]=value, NAME=(a b c): the text after `=` is read again. */
  assignment(start, m) {
    this.pos = start + m[0].length;
    const asg = { name: m[1], index: m[2] ?? null, append: m[3] === '+', value: null, array: null };
    if (this.ch === '(' && asg.index == null) {
      this.pos++;
      asg.array = [];
      for (;;) {
        this.linebreak();
        if (this.eof) throw new Incomplete();
        if (this.ch === ')') { this.pos++; break; }
        const w = this.word();
        if (!w) throw new ParseError(t('parse.near', { near: this.near() }));
        asg.array.push(w);
      }
    } else {
      asg.value = this.word() ?? { parts: [] };
    }
    return asg;
  }

  expandAlias() {
    const m = /[^\s|&;<>()'"\\$`]+/y;
    m.lastIndex = this.pos;
    const name = m.exec(this.src)?.[0];
    if (!name || !isDelim(this.src[this.pos + name.length])) return false;
    const value = this.aliases.get(name);
    if (value == null || this.aliasActive.has(name)) return false;
    if (++this.aliasCount > MAX_ALIASES) throw new ParseError(t('parse.aliasLoop'));
    this.aliasActive.add(name);
    this.src = this.src.slice(0, this.pos) + value + this.src.slice(this.pos + name.length);
    return true;
  }

  redirect(redirs) {
    REDIR.lastIndex = this.pos;
    const m = REDIR.exec(this.src);
    if (!m) return false;
    this.pos += m[0].length;
    const op = m[2];
    const fd = m[1] != null ? Number(m[1]) : null;
    this.skipBlanks();
    const start = this.pos;
    const target = this.word();
    if (!target) this.fail(t('parse.missingTarget', { near: this.near(), op }));
    const redir = { fd, op, target };
    if (op === '<<' || op === '<<-') {
      const raw = this.src.slice(start, this.pos);
      redir.heredoc = { delim: raw.replace(/['"\\]/g, ''), quoted: /['"\\]/.test(raw), strip: op === '<<-', body: null };
      this.heredocs.push(redir);
    }
    redirs.push(redir);
    return true;
  }

  readHeredoc(redir) {
    const { delim, strip, quoted } = redir.heredoc;
    let body = '';
    for (;;) {
      if (this.eof) throw new Incomplete();
      const nl = this.src.indexOf('\n', this.pos);
      let line = this.src.slice(this.pos, nl < 0 ? this.src.length : nl);
      this.pos = nl < 0 ? this.src.length : nl + 1;
      if (strip) line = line.replace(/^\t+/, '');
      if (line.replace(/\r$/, '') === delim) break;
      body += line + '\n';
    }
    redir.heredoc.body = quoted
      ? { parts: [{ type: 'sq', value: body }] }
      : { parts: [{ type: 'dq', parts: new Parser(body, null).readParts({ heredoc: true }) }] };
  }

  // ---------- Compound commands ----------

  ifClause() {
    this.pos += 2;
    const clauses = [];
    let otherwise = null;
    let cond = this.list();
    this.keyword('then');
    clauses.push({ cond, body: this.list() });
    for (;;) {
      this.linebreak();
      if (this.atKeyword('elif')) {
        this.pos += 4;
        cond = this.list();
        this.keyword('then');
        clauses.push({ cond, body: this.list() });
      } else if (this.atKeyword('else')) {
        this.pos += 4;
        otherwise = this.list();
        this.keyword('fi');
        break;
      } else {
        this.keyword('fi');
        break;
      }
    }
    return { type: 'if', clauses, otherwise };
  }

  whileClause(until) {
    this.pos += 5;   // 'while' or 'until'
    const cond = this.list();
    this.keyword('do');
    const body = this.list();
    this.keyword('done');
    return { type: 'while', until, cond, body };
  }

  forClause() {
    this.pos += 3;
    this.skipBlanks();
    if (this.starts('((')) {
      this.pos += 2;
      const raw = this.rawUntilDoubleParen();
      const [init = '', cond = '', step = ''] = raw.split(';');
      this.skipBlanks();
      if (this.ch === ';') this.pos++;
      this.keyword('do');
      const body = this.list();
      this.keyword('done');
      return { type: 'cfor', init: parseArithWord(init), cond: parseArithWord(cond), step: parseArithWord(step), body };
    }
    const m = /[A-Za-z_]\w*/y;
    m.lastIndex = this.pos;
    const name = m.exec(this.src)?.[0];
    if (!name || !isDelim(this.src[this.pos + name.length])) this.fail(t('parse.forBadName'));
    this.pos += name.length;
    let words = null;
    this.linebreak();
    if (this.atKeyword('in')) {
      this.pos += 2;
      words = [];
      for (;;) {
        this.skipBlanks();
        if (this.eof) throw new Incomplete();
        if (this.ch === ';' || this.ch === '\n') break;
        const w = this.word();
        if (!w) throw new ParseError(t('parse.near', { near: this.near() }));
        words.push(w);
      }
    }
    this.skipBlanks();
    if (this.ch === ';') this.pos++;
    this.keyword('do');
    const body = this.list();
    this.keyword('done');
    return { type: 'for', name, words, body };
  }

  rawUntilDoubleParen() {
    let depth = 0;
    const start = this.pos;
    for (; !this.eof; this.pos++) {
      const c = this.ch;
      if (c === '(') depth++;
      else if (c === ')') {
        if (depth === 0 && this.src[this.pos + 1] === ')') {
          const raw = this.src.slice(start, this.pos);
          this.pos += 2;
          return raw;
        }
        depth--;
      }
    }
    throw new Incomplete();
  }

  caseClause() {
    this.pos += 4;
    this.skipBlanks();
    const word = this.word();
    if (!word) this.fail(t('parse.caseNoWord'));
    this.keyword('in');
    const items = [];
    for (;;) {
      this.linebreak();
      if (this.eof) throw new Incomplete();
      if (this.atKeyword('esac')) { this.pos += 4; break; }
      if (this.ch === '(') this.pos++;
      const patterns = [];
      for (;;) {
        this.skipBlanks();
        const p = this.word();
        if (!p) this.fail(t('parse.near', { near: this.near() }));
        patterns.push(p);
        this.skipBlanks();
        if (this.ch !== '|') break;
        this.pos++;
      }
      if (this.ch !== ')') this.fail(t('parse.nearExpected', { near: this.near(), expected: ')' }));
      this.pos++;
      const body = this.list();
      this.skipBlanks();
      const op = this.peekOp();
      let term = ';;';
      if (op === ';;' || op === ';&' || op === ';;&') {
        this.pos += op.length;
        term = op;
      } else {
        this.linebreak();
        if (!this.atKeyword('esac')) this.fail(t('parse.nearExpected', { near: this.near(), expected: ';;' }));
      }
      items.push({ patterns, body, term });
    }
    return { type: 'case', word, items };
  }

  arithCommand() {
    const start = this.pos;
    this.pos += 2;
    try {
      const raw = this.rawUntilDoubleParen();
      return { type: 'arithcmd', word: parseArithWord(raw) };
    } catch (err) {
      if (!(err instanceof Incomplete)) throw err;
      // '( (a) )' is a subshell inside a subshell, unless the text simply ended
      this.pos = start;
      if (!this.src.includes(')', start)) throw err;
      return null;
    }
  }

  condCommand() {
    this.pos += 2;
    const expr = this.condOr();
    this.linebreak();
    if (!this.starts(']]')) this.fail(t('parse.condNear', { near: this.near() }));
    this.pos += 2;
    return { type: 'cond', expr };
  }

  condOr() {
    let left = this.condAnd();
    for (;;) {
      this.linebreak();
      if (!this.starts('||')) return left;
      this.pos += 2;
      left = { op: '||', left, right: this.condAnd() };
    }
  }

  condAnd() {
    let left = this.condNot();
    for (;;) {
      this.linebreak();
      if (!this.starts('&&')) return left;
      this.pos += 2;
      left = { op: '&&', left, right: this.condNot() };
    }
  }

  condNot() {
    this.linebreak();
    if (this.atKeyword('!')) {
      this.pos++;
      return { op: '!', expr: this.condNot() };
    }
    return this.condPrimary();
  }

  condPrimary() {
    this.linebreak();
    if (this.eof) throw new Incomplete();
    if (this.ch === '(') {
      this.pos++;
      const expr = this.condOr();
      this.linebreak();
      if (this.ch !== ')') this.fail(t('parse.condNear', { near: this.near() }));
      this.pos++;
      return expr;
    }
    const unary = /-[a-zA-Z](?=[ \t])/y;
    unary.lastIndex = this.pos;
    const u = unary.exec(this.src);
    if (u) {
      this.pos += 2;
      this.skipBlanks();
      return { op: 'unary', flag: u[0], arg: this.condWord() };
    }
    const left = this.condWord();
    this.skipBlanks();
    const bop = COND_BINARY.find(op => this.starts(op) && (op[0] !== '-' || isDelim(this.src[this.pos + op.length])));
    if (!bop) return { op: 'word', word: left };
    this.pos += bop.length;
    this.skipBlanks();
    return { op: 'binary', bop, left, right: bop === '=~' ? this.regexWord() : this.condWord() };
  }

  condWord() {
    if (this.starts(']]')) this.fail(t('parse.condNoOperand'));
    const w = this.word();
    if (!w) this.fail(t('parse.condNear', { near: this.near() }));
    return w;
  }

  /** The right side of =~: parentheses and | belong to the regular expression. */
  regexWord() {
    let depth = 0;
    const parts = this.readParts({
      stop: c => {
        if (c === '(') depth++;
        else if (c === ')') { if (depth === 0) return true; depth--; }
        return depth === 0 && (isBlank(c) || c === '\n' || c === ';' || c === '&');
      },
    });
    if (!parts.length) this.fail(t('parse.condNoRegex'));
    return { parts };
  }

  // ---------- Words ----------

  word() {
    const parts = this.readParts({ stop: normalStop });
    return parts.length ? { parts } : null;
  }

  /**
   * Parts of a word up to an unquoted char where stop(c) is true. `dq`: inside double quotes
   * (ends at the closing quote). `heredoc`: the body of a here-document (quotes are plain text).
   */
  readParts({ stop = normalStop, dq = false, heredoc = false } = {}) {
    const parts = [];
    let lit = '';
    const flush = () => {
      if (lit) parts.push({ type: 'lit', value: lit });
      lit = '';
    };
    const plain = !dq && !heredoc;
    while (!this.eof) {
      const c = this.ch;
      if (dq && c === '"') break;
      if (plain && stop(c)) break;
      if (c === '\\') {
        const n = this.src[this.pos + 1];
        if (n === undefined) {
          if (heredoc) { lit += c; this.pos++; continue; }
          throw new Incomplete();
        }
        if (n === '\n') { this.pos += 2; continue; }
        if (!plain) {
          if ('$`\\'.includes(n) || (dq && n === '"')) { lit += n; this.pos += 2; } else { lit += c; this.pos++; }
          continue;
        }
        flush();
        parts.push({ type: 'sq', value: n });
        this.pos += 2;
        continue;
      }
      if (plain && c === "'") {
        const end = this.src.indexOf("'", this.pos + 1);
        if (end < 0) throw new Incomplete();
        flush();
        parts.push({ type: 'sq', value: this.src.slice(this.pos + 1, end) });
        this.pos = end + 1;
        continue;
      }
      if (plain && c === '"') {
        flush();
        this.pos++;
        const inner = this.readParts({ dq: true });
        if (this.ch !== '"') throw new Incomplete();
        this.pos++;
        parts.push({ type: 'dq', parts: inner });
        continue;
      }
      if (c === '`') {
        flush();
        parts.push(this.backtick(dq));
        continue;
      }
      if (c === '$') {
        const n = this.src[this.pos + 1];
        if (plain && n === "'") {
          flush();
          parts.push({ type: 'sq', value: this.ansiC() });
          continue;
        }
        if (plain && n === '"') { this.pos++; continue; }
        const exp = this.dollar();
        if (exp) {
          flush();
          parts.push(exp);
          continue;
        }
      }
      lit += c;
      this.pos++;
    }
    flush();
    return parts;
  }

  dollar() {
    const n = this.src[this.pos + 1];
    if (n === '(' && this.src[this.pos + 2] === '(') {
      const start = this.pos;
      this.pos += 3;
      let depth = 0;
      const parts = this.readParts({
        stop: c => {
          if (c === '(') depth++;
          else if (c === ')') { if (depth === 0) return true; depth--; }
          return false;
        },
      });
      if (this.starts('))')) {
        this.pos += 2;
        return { type: 'arith', word: { parts } };
      }
      if (this.eof) throw new Incomplete();
      this.pos = start;   // $( (a) ): a command substitution
    }
    if (n === '(') {
      this.pos += 2;
      const body = this.list();
      this.linebreak();
      if (this.eof) throw new Incomplete();
      if (this.ch !== ')') throw new ParseError(t('parse.nearExpected', { near: this.near(), expected: ')' }));
      this.pos++;
      return { type: 'cmdsub', body };
    }
    if (n === '{') return this.paramBrace();
    const m = /[A-Za-z_]\w*|[@*#?$!\-0-9]/y;
    m.lastIndex = this.pos + 1;
    const name = m.exec(this.src)?.[0];
    if (!name) return null;
    this.pos += 1 + name.length;
    return { type: 'param', name };
  }

  paramBrace() {
    this.pos += 2;
    const part = { type: 'param', name: '' };
    if (this.ch === '#' && this.src[this.pos + 1] !== '}') { part.length = true; this.pos++; }
    else if (this.ch === '!' && this.src[this.pos + 1] !== '}') { part.indirect = true; this.pos++; }
    const m = /[A-Za-z_]\w*|[0-9]+|[@*#?$!\-]/y;
    m.lastIndex = this.pos;
    const name = m.exec(this.src)?.[0];
    if (!name) this.fail(t('parse.badSubstitution'));
    part.name = name;
    this.pos += name.length;
    if (this.ch === '[') {
      const end = this.src.indexOf(']', this.pos);
      if (end < 0) throw new Incomplete();
      part.index = this.src.slice(this.pos + 1, end);
      this.pos = end + 1;
    }
    const c = this.ch;
    if (c === '}' || part.length) {
      if (this.ch !== '}') this.fail(t('parse.badSubstitution'));
      this.pos++;
      return part;
    }
    if (c === ':') {
      const n = this.src[this.pos + 1];
      if ('-=?+'.includes(n) && n) {
        part.op = ':' + n;
        this.pos += 2;
        part.arg = this.braceWord('}');
      } else {
        part.op = 'substr';
        this.pos++;
        part.offset = this.braceWord(':}');
        if (this.ch === ':') {
          this.pos++;
          part.count = this.braceWord('}');
        }
      }
    } else if ('-=?+'.includes(c)) {
      part.op = c;
      this.pos++;
      part.arg = this.braceWord('}');
    } else if (c === '#' || c === '%' || c === '^' || c === ',') {
      part.op = this.src[this.pos + 1] === c ? c + c : c;
      this.pos += part.op.length;
      part.arg = this.braceWord('}');
    } else if (c === '/') {
      this.pos++;
      part.op = '/';
      if ('/#%'.includes(this.ch)) { part.op += this.ch; this.pos++; }
      part.arg = this.braceWord('/}');
      if (this.ch === '/') {
        this.pos++;
        part.replace = this.braceWord('}');
      } else part.replace = { parts: [] };
    } else this.fail(t('parse.badSubstitution'));
    if (this.ch !== '}') this.fail(t('parse.badSubstitutionBrace'));
    this.pos++;
    return part;
  }

  braceWord(stops) {
    let depth = 0;
    const parts = this.readParts({
      stop: c => {
        if (c === '{') depth++;
        else if (c === '}' && depth > 0) { depth--; return false; }
        return depth === 0 && stops.includes(c);
      },
    });
    if (this.eof) throw new Incomplete();
    return { parts };
  }

  backtick(inDq) {
    let text = '';
    this.pos++;
    for (;;) {
      if (this.eof) throw new Incomplete();
      const c = this.ch;
      if (c === '`') { this.pos++; break; }
      if (c === '\\') {
        const n = this.src[this.pos + 1];
        if (n === '\\' || n === '`' || n === '$' || (inDq && n === '"')) { text += n; this.pos += 2; continue; }
      }
      text += c;
      this.pos++;
    }
    try {
      return { type: 'cmdsub', body: new Parser(text, this.aliases).program() };
    } catch (err) {
      if (err instanceof Incomplete) throw new ParseError(t('parse.backquotes'));
      throw err;
    }
  }

  /** $'…' with backslash escapes. */
  ansiC() {
    this.pos += 2;
    let out = '';
    const ESC = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', v: '\v', '\\': '\\', "'": "'", '"': '"', '?': '?' };
    for (;;) {
      if (this.eof) throw new Incomplete();
      const c = this.ch;
      if (c === "'") { this.pos++; return out; }
      if (c !== '\\') { out += c; this.pos++; continue; }
      const n = this.src[this.pos + 1];
      if (n === undefined) throw new Incomplete();
      if (ESC[n] !== undefined) { out += ESC[n]; this.pos += 2; continue; }
      let m;
      const at = this.src.slice(this.pos + 1);
      if ((m = /^x([0-9a-fA-F]{1,2})/.exec(at))) out += String.fromCharCode(parseInt(m[1], 16));
      else if ((m = /^u([0-9a-fA-F]{1,4})/.exec(at)) || (m = /^U([0-9a-fA-F]{1,8})/.exec(at))) out += String.fromCodePoint(Math.min(parseInt(m[1], 16), 0x10ffff));
      else if ((m = /^([0-7]{1,3})/.exec(at))) out += String.fromCharCode(parseInt(m[1], 8));
      else { out += '\\' + n; this.pos += 2; continue; }
      this.pos += 1 + m[0].length;
    }
  }
}
