import { fs, session } from '@lilos/sdk';
import { parse, commands } from './parser.js';
import { evaluate } from './arith.js';
import { expandWords, expandWord, expandString, expandPattern, expandRegex } from './expand.js';
import { matchPattern } from './pattern.js';
import { resolve, locate } from './paths.js';
import { pipe, StringReader, StringWriter, EmptyReader, NullWriter, Writer } from './streams.js';
import {
  BreakSignal, ContinueSignal, ReturnSignal, ExitSignal, Interrupt, BrokenPipe, ShellError, ParseError, Incomplete, Token,
} from './signals.js';
import { t } from '../i18n.js';

/**
 * The interpreter: variables (scalars and indexed arrays, function-local scopes), functions,
 * aliases, options (set -e -u -x -f, -o pipefail), the working folder, jobs in the background.
 * Commands run with { stdin, stdout, stderr } (see streams.js); pipelines and subshells run on a
 * copy of the shell. `host` is what the terminal gives: its streams, clear(), exit(), history.
 *
 *   const shell = new Shell({ host, commands });
 *   await shell.run('ls -l | grep txt');   // → exit status
 */
const MAX_DEPTH = 200;
let lastYield = 0;
let nextPid = 1000;

export class Shell {
  scopes = [new Map()];
  functions = new Map();
  aliases = new Map();
  positional = [];
  options = { errexit: false, nounset: false, xtrace: false, pipefail: false, noglob: false };
  status = 0;
  lastBg = null;
  condDepth = 0;
  loopDepth = 0;
  funcDepth = 0;
  exempt = false;
  #cwd = fs.root;

  constructor({ host, commands, parent = null }) {
    this.host = host;
    this.commands = commands;
    if (parent) return;
    this.token = new Token();
    this.jobs = { list: [], next: 1 };
    this.pid = nextPid++;
    this.started = Date.now();
    const user = session.user?.username || t('shell.defaultUser');
    const vars = {
      HOME: fs.home, USER: user, LOGNAME: user, HOSTNAME: 'lilos', SHELL: '/bin/bash', TERM: 'lilos',
      PATH: `${fs.home}/bin`, PS1: '\\u@\\h:\\w\\$ ', PS2: '> ', 0: 'bash', BASH_VERSION: '5.2-lilos',
    };
    for (const [name, value] of Object.entries(vars)) this.scopes[0].set(name, { value, exported: !['PS1', 'PS2', '0', 'BASH_VERSION'].includes(name) });
    this.cwd = fs.root;
  }

  // ---------- Working folder ----------

  /** Id of the working folder (the home if it no longer exists). */
  get cwd() { return fs.get(this.#cwd)?.type === 'folder' ? this.#cwd : fs.root; }
  set cwd(id) {
    const old = this.getVar('PWD');
    this.#cwd = id;
    if (old != null && old !== fs.path(id)) this.setVar('OLDPWD', old);
    this.setVar('PWD', fs.path(id));
  }

  resolve(path) { return resolve(this.cwd, path); }
  locate(path) { return locate(this.cwd, path); }

  // ---------- Variables ----------

  #find(name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(name)) return this.scopes[i].get(name);
    return null;
  }

  /** Value of a variable (an array element with index, element 0 without), or undefined. */
  getVar(name, index = null) {
    if (name === 'RANDOM') return String(Math.floor(Math.random() * 32768));
    if (name === 'SECONDS') return String(Math.floor((Date.now() - this.started) / 1000));
    const v = this.#find(name);
    if (!v || v.value == null) return undefined;
    if (Array.isArray(v.value)) return v.value[index ?? 0];
    return index == null || index === 0 ? v.value : undefined;
  }

  /** Values of an array (a scalar is an array of one), or null if unset. */
  getArray(name) {
    const v = this.#find(name);
    if (!v || v.value == null) return null;
    return Array.isArray(v.value) ? v.value.filter(() => true) : [v.value];
  }

  /** Indices that are set (${!a[@]}). */
  arrayKeys(name) {
    const v = this.#find(name);
    if (!v || v.value == null) return [];
    return Array.isArray(v.value) ? Object.keys(v.value) : ['0'];
  }

  isSet(name) { return this.#find(name)?.value != null; }

  setVar(name, value, index = null, { local = false, exported, readonly } = {}) {
    let v = local ? this.scopes.at(-1).get(name) : this.#find(name);
    if (v?.readonly) throw new ShellError(t('shell.readonly', { name }));
    if (!v) {
      v = { value: null, exported: false };
      (local ? this.scopes.at(-1) : this.scopes[0]).set(name, v);
    }
    if (Array.isArray(value)) v.value = [...value];
    else if (index != null) {
      if (!Array.isArray(v.value)) v.value = v.value == null ? [] : [v.value];
      v.value[index] = String(value);
    } else if (value !== undefined) {
      if (Array.isArray(v.value)) v.value[0] = value == null ? '' : String(value);
      else v.value = value == null ? null : String(value);
    }
    if (exported !== undefined) v.exported = exported;
    if (readonly) v.readonly = true;
    return v;
  }

  unsetVar(name, index = null) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const v = this.scopes[i].get(name);
      if (!v) continue;
      if (v.readonly) throw new ShellError(t('shell.cannotUnset', { name }));
      if (index != null && Array.isArray(v.value)) delete v.value[index];
      else this.scopes[i].delete(name);
      return;
    }
  }

  /** Every variable visible here: [name, { value, exported, readonly }], sorted. */
  variables() {
    const all = new Map();
    for (const scope of this.scopes) for (const [k, v] of scope) all.set(k, v);
    return [...all].filter(([, v]) => v.value != null).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }

  /** Exported variables as an object. */
  environment() {
    return Object.fromEntries(this.variables().filter(([, v]) => v.exported).map(([k, v]) => [k, Array.isArray(v.value) ? v.value[0] ?? '' : v.value]));
  }

  special(name) {
    switch (name) {
      case '?': return String(this.status);
      case '$': return String(this.pid);
      case '!': return this.lastBg == null ? undefined : String(this.lastBg);
      case '-': return Object.entries({ e: 'errexit', u: 'nounset', x: 'xtrace', f: 'noglob' }).filter(([, o]) => this.options[o]).map(([f]) => f).join('');
    }
    return undefined;
  }

  arith(text) { return evaluate(text, this.#arithVars); }

  #arithVars = {
    get: (name, index) => this.getVar(name, index == null ? null : Number(index)),
    set: (name, index, value) => this.setVar(name, value, index == null ? null : Number(index)),
  };

  /** Value of an array subscript: `$i`, `i+1`, `2`. */
  arrayIndex(text) {
    const expanded = String(text).replace(/\$\{?([A-Za-z_]\w*|[0-9#?])\}?/g, (_, n) => (/^\d$/.test(n) ? this.positional[n - 1] : n === '#' ? this.positional.length : n === '?' ? this.status : this.getVar(n)) ?? '');
    const i = Number(this.arith(expanded));
    if (i < 0) throw new ShellError(t('shell.badSubscript', { index: text }));
    return i;
  }

  // ---------- Copies ----------

  /** A copy of the shell for a subshell, a pipeline stage, a command substitution, a job. */
  subshell({ script = false } = {}) {
    const sub = new Shell({ host: this.host, commands: this.commands, parent: this });
    const copyScope = scope => new Map([...scope].map(([k, v]) => [k, { ...v, value: Array.isArray(v.value) ? [...v.value] : v.value }]));
    if (script) {
      sub.scopes = [new Map(this.variables().filter(([, v]) => v.exported).map(([k, v]) => [k, { ...v, value: Array.isArray(v.value) ? [...v.value] : v.value }]))];
    } else {
      sub.scopes = this.scopes.map(copyScope);
      sub.functions = new Map(this.functions);
      sub.aliases = new Map(this.aliases);
      sub.positional = [...this.positional];
    }
    sub.options = { ...this.options };
    sub.status = this.status;
    sub.lastBg = this.lastBg;
    sub.token = this.token;
    sub.jobs = this.jobs;
    sub.pid = this.pid;
    sub.started = this.started;
    sub.#cwd = this.cwd;
    sub.subshellLevel = (this.subshellLevel ?? 0) + 1;
    return sub;
  }

  // ---------- Running ----------

  /**
   * Parses and runs source text. Throws Incomplete (more lines needed) and ParseError; returns
   * the exit status. `exit` throws ExitSignal up to the caller.
   */
  async run(source, io = this.host) {
    parse(source, { aliases: this.aliases });   // the whole text first: an incomplete or wrong one runs nothing
    return this.exec({ type: 'script', source }, io);
  }

  /** Lets the page breathe during long work and stops on Ctrl+C. */
  async tick() {
    this.token.check();
    const now = performance.now();
    if (now - lastYield > 12) {
      lastYield = now;
      await new Promise(r => setTimeout(r));
      this.token.check();
    }
  }

  /** Waits, interrupted by Ctrl+C. */
  sleep(ms) {
    return new Promise((done, fail) => {
      const off = this.token.onAbort(() => { clearTimeout(timer); fail(new Interrupt()); });
      const timer = setTimeout(() => { off(); done(); }, ms);
    });
  }

  async exec(node, io) {
    switch (node.type) {
      case 'list': return this.execList(node, io);
      case 'andor': return this.execAndOr(node, io);
      case 'pipeline': return this.execPipeline(node, io);
      case 'simple': return this.execSimple(node, io);
      case 'script': {
        let status = this.status;
        for (const list of commands(node.source, { aliases: this.aliases })) status = await this.execList(list, io);
        return status;
      }
    }
    return this.withRedirects(node.redirs ?? [], io, rio => this.execCompound(node, rio));
  }

  async execList(list, io) {
    let status = this.status;
    for (const item of list.items) {
      if (item.async) {
        this.startJob(item, io);
        status = 0;
      } else {
        this.exempt = false;
        status = await this.exec(item.node, io);
      }
      this.status = status;
      if (status !== 0 && this.options.errexit && !this.condDepth && !this.exempt && !item.async) throw new ExitSignal(status);
    }
    return status;
  }

  async execAndOr(node, io) {
    const chain = [node.first, ...node.rest.map(r => r.node)];
    const ops = node.rest.map(r => r.op);
    let status = 0, last = 0;
    for (let i = 0; i < chain.length; i++) {
      if (i > 0 && (ops[i - 1] === '&&') !== (status === 0)) continue;
      const final = i === chain.length - 1;
      if (!final) this.condDepth++;
      try {
        status = await this.exec(chain[i], io);
      } finally {
        if (!final) this.condDepth--;
      }
      this.status = status;
      last = i;
    }
    this.exempt = last < chain.length - 1;
    return status;
  }

  async execPipeline(node, io) {
    let status;
    if (node.negate) this.condDepth++;
    try {
      if (node.cmds.length === 1) status = await this.exec(node.cmds[0], io);
      else {
        const pipes = node.cmds.slice(1).map(() => pipe());
        const last = node.cmds.length - 1;
        const statuses = await Promise.all(node.cmds.map(async (cmd, i) => {
          const stdout = i === last ? io.stdout : pipes[i].writer;
          const stage = { stdin: i === 0 ? io.stdin : pipes[i - 1].reader, stdout, stderr: node.both[i] ? stdout : io.stderr };
          try {
            return await this.subshell().runSubshell(cmd, stage);
          } finally {
            if (i < last) await pipes[i].writer.close();
            if (i > 0) pipes[i - 1].reader.close();
          }
        }));
        this.setVar('PIPESTATUS', statuses.map(String));
        status = this.options.pipefail ? [...statuses].reverse().find(s => s !== 0) ?? 0 : statuses[last];
      }
    } finally {
      if (node.negate) this.condDepth--;
    }
    return node.negate ? (status === 0 ? 1 : 0) : status;
  }

  /** Runs a node in this (copied) shell as a subshell: exit ends only it. */
  async runSubshell(node, io) {
    try {
      return await this.exec(node, io);
    } catch (err) {
      if (err instanceof ExitSignal) return err.code;
      if (err instanceof BrokenPipe) return 141;
      if (err instanceof BreakSignal || err instanceof ContinueSignal) return 0;
      if (err instanceof ReturnSignal) return err.code;
      if (err instanceof ShellError) {
        await io.stderr.write(`bash: ${err.message}\n`);
        return err.code;
      }
      throw err;
    }
  }

  async execCompound(node, io) {
    switch (node.type) {
      case 'group': return this.exec(node.body, io);
      case 'subshell': return this.subshell().runSubshell(node.body, io);
      case 'func':
        this.functions.set(node.name, node);
        return 0;
      case 'if': {
        for (const { cond, body } of node.clauses) {
          if (await this.condition(cond, io) === 0) return this.exec(body, io);
        }
        return node.otherwise ? this.exec(node.otherwise, io) : 0;
      }
      case 'while': {
        let status = 0;
        await this.loop(async () => {
          if ((await this.condition(node.cond, io) === 0) === node.until) return false;
          status = await this.exec(node.body, io);
          return true;
        });
        return status;
      }
      case 'for': {
        const values = node.words ? await expandWords(this, node.words) : [...this.positional];
        let status = 0, i = 0;
        await this.loop(async () => {
          if (i >= values.length) return false;
          this.setVar(node.name, values[i++]);
          status = await this.exec(node.body, io);
          return true;
        });
        return status;
      }
      case 'cfor': {
        const ev = async word => this.arith(await expandString(this, word));
        let status = 0;
        if (node.init.parts.length) await ev(node.init);
        let first = true;
        await this.loop(async () => {
          if (!first && node.step.parts.length) await ev(node.step);
          first = false;
          if (node.cond.parts.length && (await ev(node.cond)) === 0n) return false;
          status = await this.exec(node.body, io);
          return true;
        });
        return status;
      }
      case 'case': {
        const word = await expandString(this, node.word);
        let status = 0;
        for (let i = 0; i < node.items.length; i++) {
          let item = node.items[i];
          let hit = false;
          for (const p of item.patterns) if (matchPattern(await expandPattern(this, p), word)) { hit = true; break; }
          if (!hit) continue;
          status = await this.exec(item.body, io);
          while (item.term === ';&' && i + 1 < node.items.length) {
            item = node.items[++i];
            status = await this.exec(item.body, io);
          }
          if (item.term !== ';;&') break;
        }
        return status;
      }
      case 'arithcmd': {
        const value = this.arith(await expandString(this, node.word));
        return value !== 0n ? 0 : 1;
      }
      case 'cond':
        try {
          return (await this.cond(node.expr)) ? 0 : 1;
        } catch (err) {
          if (!(err instanceof ShellError)) throw err;
          await io.stderr.write(`bash: ${err.message}\n`);
          return 2;
        }
    }
    throw new ShellError(t('shell.unknownConstruct', { type: node.type }));
  }

  async condition(list, io) {
    this.condDepth++;
    try {
      return await this.exec(list, io);
    } finally {
      this.condDepth--;
    }
  }

  /** Runs step() until it returns false; break and continue (also with levels) end or skip. */
  async loop(step) {
    this.loopDepth++;
    try {
      for (;;) {
        await this.tick();
        try {
          if (!(await step())) return;
        } catch (err) {
          if (err instanceof BreakSignal) {
            if (err.levels > 1) throw new BreakSignal(err.levels - 1);
            return;
          }
          if (err instanceof ContinueSignal) {
            if (err.levels > 1) throw new ContinueSignal(err.levels - 1);
            continue;
          }
          throw err;
        }
      }
    } finally {
      this.loopDepth--;
    }
  }

  // ---------- [[ … ]] ----------

  async cond(e) {
    switch (e.op) {
      case '!': return !(await this.cond(e.expr));
      case '&&': return (await this.cond(e.left)) && this.cond(e.right);
      case '||': return (await this.cond(e.left)) || this.cond(e.right);
      case 'word': return (await expandString(this, e.word)) !== '';
      case 'unary': return this.unaryTest(e.flag, await expandString(this, e.arg));
    }
    const left = await expandString(this, e.left);
    switch (e.bop) {
      case '==': case '=': return matchPattern(await expandPattern(this, e.right), left);
      case '!=': return !matchPattern(await expandPattern(this, e.right), left);
      case '=~': {
        let re;
        try {
          re = new RegExp(await expandRegex(this, e.right));
        } catch {
          throw new ShellError(t('shell.badRegex'));
        }
        const m = re.exec(left);
        this.setVar('BASH_REMATCH', m ? [...m].map(s => s ?? '') : []);
        return !!m;
      }
    }
    return this.binaryTest(e.bop, left, await expandString(this, e.right), true);
  }

  /** Tests shared by [[ ]] and test / [: -e -f -d -s -z -n … */
  unaryTest(flag, arg) {
    const node = () => (arg === '' ? null : this.resolve(arg));
    switch (flag) {
      case '-n': return arg !== '';
      case '-z': return arg === '';
      case '-v': return this.isSet(arg.replace(/\[.*$/, ''));
      case '-o': return !!this.options[arg];
      case '-e': case '-a': return !!node() || arg === '/dev/null';
      case '-f': return node()?.type === 'file';
      case '-d': return node()?.type === 'folder';
      case '-s': { const n = node(); return !!n && (n.type !== 'file' || (n.size ?? 0) > 0); }
      case '-r': case '-w': return !!node();
      case '-x': { const n = node(); return n?.type === 'folder' || (n?.type === 'file' && /\.(sh|bash)$/i.test(n.name)); }
      case '-L': case '-h': return node()?.type === 'app';
      case '-t': return arg === '0' || arg === '1' || arg === '2';
    }
    throw new ShellError(t('shell.unaryExpected', { op: flag }));
  }

  binaryTest(op, a, b) {
    const int = v => {
      if (!/^\s*-?\d+\s*$/.test(v)) throw new ShellError(t('shell.integerExpected', { value: v }));
      return BigInt(v.trim());
    };
    switch (op) {
      case '=': case '==': return a === b;
      case '!=': return a !== b;
      case '<': return a < b;
      case '>': return a > b;
      case '-eq': return int(a) === int(b);
      case '-ne': return int(a) !== int(b);
      case '-lt': return int(a) < int(b);
      case '-le': return int(a) <= int(b);
      case '-gt': return int(a) > int(b);
      case '-ge': return int(a) >= int(b);
      case '-nt': return (this.resolve(a)?.modified ?? -Infinity) > (this.resolve(b)?.modified ?? -Infinity);
      case '-ot': return (this.resolve(a)?.modified ?? Infinity) < (this.resolve(b)?.modified ?? Infinity);
      case '-ef': { const x = this.resolve(a), y = this.resolve(b); return !!x && x.id === y?.id; }
    }
    throw new ShellError(t('shell.binaryExpected', { op }));
  }

  // ---------- Simple commands ----------

  async execSimple(node, io) {
    await this.tick();
    this.curIo = io;
    this.substStatus = null;
    let argv;
    try {
      argv = [];
      for (const word of node.words) {
        if (!word.declArray) { argv.push(...await expandWord(this, word)); continue; }
        // local a=(x y): the values go to the command apart, the argument only names them
        const { name, append, words } = word.declArray;
        const values = await expandWords(this, words);
        (this.declArrays ??= new Map()).set(name, values);
        argv.push(`${name}${append ? '+' : ''}=(${values.join(' ')})`);
      }
    } catch (err) {
      if (!(err instanceof ShellError)) throw err;
      await io.stderr.write(`bash: ${err.message}\n`);
      return 1;
    }
    if (!argv.length) {
      try {
        for (const asg of node.assigns) await this.assign(asg);
      } catch (err) {
        if (!(err instanceof ShellError)) throw err;
        await io.stderr.write(`bash: ${err.message}\n`);
        return 1;
      }
      const status = this.substStatus ?? 0;
      return node.redirs.length ? this.withRedirects(node.redirs, io, async () => status) : status;
    }
    // NAME=value cmd: the variables exist (exported) only for the command
    let temp = null;
    if (node.assigns.length) {
      temp = new Map();
      for (const asg of node.assigns) temp.set(asg.name, { value: asg.array ? await expandWords(this, asg.array) : await expandString(this, asg.value), exported: true });
    }
    if (this.options.xtrace) await io.stderr.write(`+ ${argv.map(quote).join(' ')}\n`);
    return this.withRedirects(node.redirs, io, async rio => {
      if (temp) this.scopes.push(temp);
      try {
        return await this.invoke(argv, rio);
      } finally {
        if (temp) this.scopes.splice(this.scopes.indexOf(temp), 1);
      }
    });
  }

  async assign(asg) {
    if (asg.array) {
      const values = await expandWords(this, asg.array);
      this.setVar(asg.name, asg.append ? [...(this.getArray(asg.name) ?? []), ...values] : values);
      return;
    }
    const value = await expandString(this, asg.value);
    const index = asg.index != null ? this.arrayIndex(asg.index) : null;
    if (asg.append) this.setVar(asg.name, (this.getVar(asg.name, index) ?? '') + value, index);
    else this.setVar(asg.name, value, index);
    if (this.options.xtrace) await this.curIo?.stderr.write(`+ ${asg.name}=${quote(value)}\n`);
  }

  /** Runs argv: a path (script), a function, a command, an app's command, a script in $PATH. */
  async invoke(argv, io, { functions = true } = {}) {
    const name = argv[0];
    if (name.includes('/')) return this.runScript(name, argv.slice(1), io);
    if (functions && this.functions.has(name)) return this.callFunction(name, argv, io);
    const cmd = this.commands.get(name);
    if (cmd) return this.runCommand(cmd, argv, io);
    for (const dir of (this.getVar('PATH') ?? '').split(':').filter(Boolean)) {
      for (const file of [name, `${name}.sh`]) {
        if (this.resolve(`${dir}/${file}`)?.type === 'file') return this.runScript(`${dir}/${file}`, argv.slice(1), io);
      }
    }
    await io.stderr.write(`bash: ${t('shell.commandNotFound', { name })}\n`);
    return 127;
  }

  async runCommand(cmd, argv, io) {
    const ctx = new Context(this, cmd, argv, io);
    if (argv[1] === '--help' && !cmd.ownHelp) {
      await ctx.out(helpText(cmd));
      return 0;
    }
    try {
      const code = await cmd.run(ctx);
      return typeof code === 'number' ? code : 0;
    } catch (err) {
      if (err instanceof BrokenPipe) return 141;
        const report = async message => { try { await ctx.error(message); } catch {} };
      if (err instanceof ShellError) {
        await report(err.message);
        return err.code;
      }
      if (err instanceof BreakSignal || err instanceof ContinueSignal || err instanceof ReturnSignal || err instanceof ExitSignal || err instanceof Interrupt) throw err;
      if (err instanceof Incomplete || err instanceof ParseError) {
        await report(err.message || t('parse.unexpectedEnd'));
        return 2;
      }
      await report(err?.message ?? String(err));
      return 1;
    }
  }

  async callFunction(name, argv, io) {
    if (this.funcDepth >= MAX_DEPTH) throw new ShellError(t('shell.tooDeep', { name }));
    const fn = this.functions.get(name);
    const saved = this.positional;
    const scope = new Map();
    this.positional = argv.slice(1);
    this.scopes.push(scope);
    this.funcDepth++;
    try {
      return await this.exec(fn.body, io);
    } catch (err) {
      if (err instanceof ReturnSignal) return err.code;
      throw err;
    } finally {
      this.funcDepth--;
      this.scopes.splice(this.scopes.indexOf(scope), 1);
      this.positional = saved;
    }
  }

  /** Text of a script file. Throws ShellError if it cannot be read. */
  async readScript(path) {
    const node = this.resolve(path);
    if (!node) throw new ShellError(t('err.noSuchFile', { path }), 127);
    if (node.type === 'folder') throw new ShellError(t('err.isADirectory', { path }), 126);
    if (node.type !== 'file') throw new ShellError(t('err.notAFile', { path }), 126);
    return fs.read(node.id);
  }

  /** Runs a script in a new shell (only exported variables come along). */
  async runScript(path, args, io) {
    let text;
    try {
      text = await this.readScript(path);
    } catch (err) {
      if (!(err instanceof ShellError)) throw err;
      await io.stderr.write(`bash: ${err.message}\n`);
      return err.code;
    }
    const sub = this.subshell({ script: true });
    sub.positional = [...args];
    sub.setVar('0', path);
    return sub.runSource(text, io, path);
  }

  /** Runs the text of a script here, reporting syntax errors with the file name. */
  async runSource(text, io, label) {
    try {
      parse(text, { aliases: this.aliases });
    } catch (err) {
      if (!(err instanceof ParseError || err instanceof Incomplete)) throw err;
      await io.stderr.write(`${label}: ${err.message || t('parse.unexpectedEndOfFile')}\n`);
      return 2;
    }
    return this.runSubshell({ type: 'script', source: text }, io);
  }

  /** Output of a command substitution; its status becomes $? of an assignment-only command. */
  async substitute(body) {
    const out = new StringWriter();
    const io = this.curIo ?? this.host;
    const sub = this.subshell();
    const status = await sub.runSubshell(body, { stdin: io.stdin, stdout: out, stderr: io.stderr });
    this.substStatus = status;
    this.status = status;
    return out.text;
  }

  // ---------- Redirections ----------

  async withRedirects(redirs, io, fn) {
    if (!redirs.length) return fn(io);
    const fds = { 0: io.stdin, 1: io.stdout, 2: io.stderr };
    const opened = [];
    try {
      for (const r of redirs) {
        const fd = r.fd ?? (r.op.startsWith('<') ? 0 : 1);
        switch (r.op) {
          case '<': case '<>':
            fds[fd] = await this.openRead(await this.redirTarget(r), io);
            break;
          case '>': case '>|': case '>>': {
            const w = await this.openWrite(await this.redirTarget(r), r.op === '>>', io);
            opened.push(w);
            fds[fd] = w;
            break;
          }
          case '&>': case '&>>': {
            const w = await this.openWrite(await this.redirTarget(r), r.op === '&>>', io);
            opened.push(w);
            fds[1] = fds[2] = w;
            break;
          }
          case '>&': case '<&': {
            const target = await this.redirTarget(r);
            if (target === '-') fds[fd] = r.op === '>&' ? new NullWriter() : new EmptyReader();
            else if (/^\d+$/.test(target)) {
              if (!fds[target]) throw new ShellError(t('shell.badFd', { fd: target }));
              fds[fd] = fds[target];
            } else if (r.op === '>&' && r.fd == null) {
              const w = await this.openWrite(target, false, io);
              opened.push(w);
              fds[1] = fds[2] = w;
            } else throw new ShellError(t('shell.fdExpected', { target }));
            break;
          }
          case '<<': case '<<-':
            fds[fd] = new StringReader(await expandString(this, r.heredoc.body));
            break;
          case '<<<':
            fds[fd] = new StringReader((await expandString(this, r.target)) + '\n');
            break;
        }
      }
    } catch (err) {
      if (!(err instanceof ShellError)) throw err;
      await io.stderr.write(`bash: ${err.message}\n`);
      for (const w of opened) await w.close().catch(() => {});
      return 1;
    }
    try {
      return await fn({ stdin: fds[0], stdout: fds[1], stderr: fds[2] });
    } finally {
      for (const w of opened) {
        try {
          await w.close();
        } catch (err) {
          await io.stderr.write(`bash: ${err.message}\n`);
        }
      }
    }
  }

  async redirTarget(r) {
    const fields = await expandWord(this, r.target);
    if (fields.length !== 1) throw new ShellError(t('shell.ambiguousRedirect', { target: await expandString(this, r.target) }));
    return fields[0];
  }

  async openRead(path, io) {
    if (path === '/dev/null') return new EmptyReader();
    if (path === '/dev/stdin') return io.stdin;
    const node = this.resolve(path);
    if (!node) throw new ShellError(t('err.noSuchFile', { path }));
    if (node.type === 'folder') throw new ShellError(t('err.isADirectory', { path }));
    if (node.type !== 'file') throw new ShellError(t('err.notAFile', { path }));
    return new StringReader(await fs.read(node.id));
  }

  /** A file opened for writing: created (or emptied) now, saved when the command ends. */
  async openWrite(path, append, io) {
    if (path === '/dev/null') return new NullWriter();
    if (path === '/dev/stdout') return keepOpen(io.stdout);
    if (path === '/dev/stderr') return keepOpen(io.stderr);
    if (path === '/dev/tty') return keepOpen(this.host.stdout);
    const id = this.fileFor(path).id;
    if (!append) await fs.write(id, '');
    return new FileWriter(id, append);
  }

  /** The file at a path, created if missing. Throws ShellError for folders and missing folders. */
  fileFor(path) {
    const node = this.resolve(path);
    if (node?.type === 'folder') throw new ShellError(t('err.isADirectory', { path }));
    if (node?.type === 'app') throw new ShellError(t('shell.isAppLink', { path }));
    if (node) return node;
    const { parent, name } = this.locate(path);
    if (parent?.type !== 'folder' || !name) throw new ShellError(t('err.noSuchFile', { path }));
    return fs.create(parent.id, { type: 'file', name });
  }

  // ---------- Jobs ----------

  startJob(item, io) {
    const sub = this.subshell();
    sub.token = new Token();
    const job = { id: this.jobs.next++, pid: nextPid++, text: item.text.replace(/&\s*$/, '').trim(), state: 'running', code: null, token: sub.token, notified: false };
    sub.pid = job.pid;
    job.promise = sub.runSubshell(item.node, { stdin: new EmptyReader(), stdout: io.stdout, stderr: io.stderr })
      .then(code => code, err => (err instanceof Interrupt ? 130 : (io.stderr.write(`bash: ${err?.message ?? err}\n`), 1)))
      .then(code => { job.state = 'done'; job.code = code; return code; });
    this.jobs.list.push(job);
    this.lastBg = job.pid;
    if (!this.subshellLevel) io.stderr.write(`[${job.id}] ${job.pid}\n`);
    return job;
  }

  /** A job from '%1', '%%', '%+', '%-' or a pid; the last one with no spec. */
  findJob(spec) {
    const list = this.jobs.list;
    if (spec == null || spec === '%%' || spec === '%+' || spec === '%') return list.at(-1) ?? null;
    if (spec === '%-') return list.at(-2) ?? null;
    if (/^%\d+$/.test(spec)) return list.find(j => j.id === Number(spec.slice(1))) ?? null;
    if (/^\d+$/.test(spec)) return list.find(j => j.pid === Number(spec)) ?? null;
    if (spec.startsWith('%')) return list.find(j => j.text.startsWith(spec.slice(1))) ?? null;
    return null;
  }

  /** Finished jobs not reported yet ('[1]+  Fatto  sleep 3'), removed from the list. */
  reapJobs() {
    const done = this.jobs.list.filter(j => j.state === 'done');
    this.jobs.list = this.jobs.list.filter(j => j.state !== 'done');
    if (!this.jobs.list.length) this.jobs.next = 1;
    return done.map(j => `[${j.id}]  ${j.code === 0 ? t('jobs.done') : j.code === 130 ? t('jobs.interrupted') : t('jobs.exit', { code: j.code })}\t\t${j.text}\n`);
  }

  /** Waits for a job, unless Ctrl+C interrupts the wait (`fg` passes the interrupt on). */
  async waitJob(job, { forward = false } = {}) {
    let off;
    const interrupted = new Promise((_, fail) => {
      off = this.token.onAbort(() => {
        if (forward) job.token.abort();
        else fail(new Interrupt());
      });
    });
    try {
      return await Promise.race([job.promise, interrupted]);
    } finally {
      off();
    }
  }
}

/** What a command receives. */
export class Context {
  constructor(shell, cmd, argv, io) {
    this.shell = shell;
    this.cmd = cmd;
    this.name = argv[0];
    this.argv = argv;
    this.args = argv.slice(1);
    this.stdin = io.stdin;
    this.stdout = io.stdout;
    this.stderr = io.stderr;
    this.io = io;
  }

  get cwd() { return this.shell.cwd; }
  out(text) { return this.stdout.write(String(text)); }
  err(text) { return this.stderr.write(String(text)); }
  error(message) { return this.stderr.write(`${this.name}: ${message}\n`); }
  tick() { return this.shell.tick(); }
  resolve(path) { return this.shell.resolve(path); }
  locate(path) { return this.shell.locate(path); }

  /**
   * Text of each input: the files named (`-` is stdin), or stdin when there are none. Missing
   * files are reported and skipped (status 1 at the end via ctx.failed).
   */
  async *inputs(files) {
    if (!files.length) files = ['-'];
    for (const file of files) {
      if (file === '-') { yield { name: '-', text: await this.stdin.readAll() }; continue; }
      const node = this.resolve(file);
      if (!node) { await this.error(t('err.noSuchFile', { path: file })); this.failed = true; continue; }
      if (node.type === 'folder') { await this.error(t('err.isADirectory', { path: file })); this.failed = true; continue; }
      if (node.type !== 'file') { await this.error(t('err.notAFile', { path: file })); this.failed = true; continue; }
      yield { name: file, node, text: await fs.read(node.id) };
      await this.tick();
    }
  }
}

class FileWriter extends Writer {
  #text = '';
  constructor(id, append) {
    super();
    this.id = id;
    this.append = append;
  }
  write(text) { this.#text += text; }
  async close() {
    if (!fs.exists(this.id)) return;
    if (this.append && !this.#text) return;
    const before = this.append ? await fs.read(this.id) : '';
    await fs.write(this.id, before + this.#text);
  }
}

/** A stream given to a redirection that must not be closed with it (/dev/stdout). */
const keepOpen = w => ({ write: t => w.write(t), close: async () => {} });

export const quote = s => (s === '' ? "''" : /^[\w@%+=:,./~-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);

export function helpText(cmd) {
  return `${cmd.usage ? `${t('help.usageLine', { usage: cmd.usage })}\n` : ''}${cmd.summary ?? ''}\n${cmd.help ? `\n${cmd.help.trim()}\n` : ''}`;
}
