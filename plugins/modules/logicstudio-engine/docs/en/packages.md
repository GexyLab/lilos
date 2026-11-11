# Writing a package

`logicstudio-engine` · [Logic Studio Engine](logicstudio-engine) · for people who write code

A **package** brings Logic Studio new blocks, new UI components for the windows, the **actions** its blocks ask the kernel for, and its documentation. It is a normal lilOS kernel module that, when it starts, introduces itself to the engine with `register()`.

This page is for whoever writes the code of a package. At the end there is a complete package to copy.

## How it is made

```
logicstudio-esempio/
  module.json          the kernel module
  index.js             registers with the engine (and defines the actions)
  blocks.js            the blocks: they run in the worker of each user
  components.js        the UI components: they run in the browser
  docs/
    it/
      index.md         the page of the package
      esempio.media.md the page of a block (the name is the type)
      come-iniziare.md another page
    en/
      index.md
```

All the files except `module.json` and `index.js` are optional: a package can have only blocks, only components, only actions.

Where each part runs:

| File | Where it runs | What it can use |
|---|---|---|
| `index.js` and the **actions** | In the main thread of the kernel | The whole kernel, the services (`ctx.service('fs')`…), Node |
| `blocks.js` | In the **worker** of each user; the main thread imports it only to read the definitions | Only what the engine gives it (the `b` context). No environment variables |
| `components.js` | In the **browser** (lilOS and the IDE); the kernel imports it only to read the definitions | Only what `render(el, c)` passes it: it cannot import anything |

## module.json

The package **requires** the `logicstudio` service (so it starts after the engine) and **depends** on the engine and the base blocks (so the AppStore installs them together):

```json
{
  "name": "logicstudio-esempio",
  "version": "1.0.0",
  "description": "Logic Studio: blocchi di esempio",
  "icon": { "glyph": "chip", "color": "#2da44e" },
  "kernel": "1",
  "provides": ["logicblock.esempio"],
  "requires": ["logicstudio"],
  "dependencies": [
    { "module": "logicstudio-engine", "reason": "Il motore che fa girare i blocchi" },
    { "module": "logicstudio-core", "reason": "I blocchi di base, che servono insieme a questi" }
  ]
}
```

The name starting with `logicstudio-` is only a habit: the engine does not look for modules by name. A module that does not call `register()` is not a package.

## register()

```js
const handle = await ctx.service('logicstudio').register({
  name, version, label, blocks, components, actions, docs,
});
// …and when the module stops:
handle.unregister();
```

| Field | Required | What it is |
|---|---|---|
| `name` | Yes | The name of the package: `[a-z][a-z0-9-]{0,40}`. Use `ctx.name`, the name of the module: it is also the name with which the IDE opens its documentation |
| `version` | No | The version, as text (default `0.0.0`). Use `ctx.version`: the engine imports the files with `?v=<version>`, so a new version loads the new code |
| `label` | No | The name to show: `{ en, it }` (other languages are ignored) or a text. By default it is `name` |
| `blocks` | No | The **absolute path** of `blocks.js` |
| `components` | No | The **absolute path** of `components.js` |
| `actions` | No | An object `{ 'key': async (user, args, tools) => result }` |
| `docs` | No | The **absolute path** of the `docs` folder |

`register()` returns `{ unregister() }`: call it in the `stop()` of the module, so the blocks disappear from the catalog when the module stops.

Every registration makes the active programs that were waiting for a package try again, half a second later.

### When register() refuses

`register()` throws an error (and the module does not start) in these cases:

| Message | Why |
|---|---|
| Pacchetto di Logic Studio senza nome valido: … (Logic Studio package without a valid name: …) | `name` is not valid |
| logicstudio-esempio: il file dei blocchi deve essere un percorso assoluto (the blocks file must be an absolute path) | `blocks` is relative |
| logicstudio-esempio: il file delle componenti deve essere un percorso assoluto (the components file must be an absolute path) | `components` is relative |
| logicstudio-esempio: la cartella della documentazione deve essere un percorso assoluto (the documentation folder must be an absolute path) | `docs` is relative |

It also throws if `blocks.js` or `components.js` cannot be imported (a syntax error, an `import` that is not there).

A **single** block or component that is not valid, instead, is discarded with a warning in the kernel log, and the others stay:

| Warning in the log | Why |
|---|---|
| logicstudio-esempio: blocco esempio.x scartato: non è un oggetto (block esempio.x discarded: it is not an object) | The entry of the list is not an object |
| … scartato: tipo non valido (pacchetto.nome) (… discarded: invalid type (package.name)) | `type` is not `package.name` |
| … scartato: versione non valida (… discarded: invalid version) | `version` is not an integer from 1 up |
| … scartato: porta non valida: error (… discarded: invalid port: error) | A port name is not valid, or is `error` |
| … scartato: porta ripetuta: a (… discarded: repeated port: a) | Two ports with the same name on the same side |
| … scartato: tipo non valido: numero (… discarded: invalid type: numero) | The type of a port is not one of those listed below |
| … scartato: grow.inputs.max non valido (… discarded: invalid grow.inputs.max) | See **grow** further down (also `grow.lati non valido`, `grow.inputs.type non valido`, `grow.inputs.name non valido`) |
| … scartato: un blocco «loop» deve avere step() (… discarded: a «loop» block must have step()) | `execution: 'loop'` without `step` |
| logicstudio-esempio: componente esempio.x scartata: manca render() (component esempio.x discarded: render() is missing) | A component without `render` |
| logicstudio-esempio: blocco esempio.x già dato da un altro pacchetto: scartato (block esempio.x already given by another package: discarded) | The type already exists, in a package registered before |

When all goes well the log says: `Logic Studio: pacchetto logicstudio-esempio 1.0.0 (5 blocchi, 1 componenti)` ("Logic Studio: package logicstudio-esempio 1.0.0 (5 blocks, 1 components)").

## The blocks: blocks.js

`blocks.js` exports `blocks`, a list of definitions. **Nothing must run when the file is imported**: the main thread of the kernel imports it only to read the definitions, then each worker imports it again to use them.

### The definition of a block

| Field | What it is |
|---|---|
| `type` | `package.name`: `[a-z][a-z0-9]*\.[a-zA-Z][a-zA-Z0-9]{0,40}`, for example `esempio.media`. Unique among all packages |
| `version` | An integer from 1. Raise it when you change the behaviour or the settings (see **upgrade**) |
| `category` | Where it is in the **Blocks** tab: `value` (Values), `logic` (Logic), `math` (Math), `text` (Text), `object` (Objects), `list` (Lists), `matrix` (Matrices), `units` (Units), `geometry` (Solid geometry), `trig` (Trigonometry), `functions` (Functions), `integrals` (Integrals), `signal` (Signals), `time` (Time), `console` (Console), `schema` (Schema ports), `ui` (UI components), `lilos` (lilOS), `net` (Network), `exception` (Exceptions). Another word, or nothing: **Other** |
| `icon` | The name of a lilOS icon (`calculator`, `bell`, `globe`, `clock`, `lamp`…). Default `blocks` |
| `label` | The name of the block: `{ en, it }` |
| `description` | Optional: a sentence `{ en, it }` |
| `inputs`, `outputs` | The ports (see below) |
| `config` | The settings, shown in the **Properties** (see below) |
| `grow` | The ports the user can add (see below) |
| `execution` | `'run'` (default) or `'loop'` (the block runs by itself with `step()`) |
| `start(b)` | Optional: at the start of the program |
| `run(inputs, b)` | Optional: when a value arrives at an input that starts it |
| `step(inputs, b)` | Only for `execution: 'loop'` |
| `stop(b)` | Optional: when the program stops |
| `upgrade(config, from, added)` | Optional: upgrades the settings saved by an old version of the block |
| `role` | Reserved for the base blocks (`schemaIn`, `schemaOut`, `component`, `catchAll`): do not use it |
| `showError` | `true`: the **Exception** output is shown on the drawing from the start, instead of being hidden by default (from engine 1.4.1 and lilOS 1.44.0). For blocks whose purpose is to throw exceptions, like [Throw](core.throw) |

A block without `run` keeps the values it receives and does nothing else (it is useful, for example, to a `loop` block that reads them at every turn).

### The ports

A port is `{ name, type, label, trigger }`:

- `name`: `[a-zA-Z][a-zA-Z0-9]{0,30}`, unique on its side. **Never `error`**: every block already has the **Exception** output, which is called that.
- `type`: one of these. The type serves the IDE to flag links between types that do not agree; the engine converts nothing, so the block must check what it receives.

| `type` | In the IDE | Typical value |
|---|---|---|
| `number` | number | `12.5` |
| `bool` | yes/no | `true` |
| `text` | text | `"ciao"` |
| `object` | object | `{ "nome": "Ada" }` |
| `list` | list | `[1, 2, 3]` |
| `matrix` | matrix | `[[1, 2], [3, 4]]` |
| `any` | any | any value |
| `pulse` | pulse | `true` (only its arrival matters) |

- `label`: the name shown, `{ en, it }`. Without it, the IDE shows `name`.
- `trigger: false` (inputs only): the input keeps the value but **does not start** the block. The user can change it in the Properties (**starts it**).
- `hidden: true`: the port is **hidden by default** on the drawing; the user shows it with the eye in the Properties (from engine 1.2.0 and lilOS 1.41.0). It is meant for ports used rarely, like **send** and **set** of [Constant · Variable](core.value). A linked port is always shown.

The user can give every input a **start value**, which the engine sends at start. See [How a block works](ide/blocks).

### The settings: config

`config` is a list: `{ key, type, default, label, options, min, max, step, when }`.

| `type` | In the Properties | Value in `b.config` |
|---|---|---|
| `text` | A text field (at most 2000 characters) | Text |
| `number` | A number field | Number, **or `null`** if the user empties the field |
| `select` | A choice among `options`: texts, or `{ value, label: { en, it } }` | The chosen `value` |
| `checkbox` | A checkbox | `true` / `false` |
| `console` | The choice of a console of the project | The id of the console (`'main'` by default) |
| `json` | A field for a JSON value | The value (or the text, if it is not valid JSON) |

- `default` is the starting value: `b.config` always has the defaults, covered by what the user chose.
- `min`, `max` and `step` hold only for the field of the IDE: the engine does **not** check them. Check the values yourself in `run`.
- `when: { key: value }` (or `{ key: [values] }`) shows the setting only when another one has that value.
- The settings of a block saved in a schema are at most 64 KB.

### Added ports: grow

`grow` says how many ports the user can add to the block, from the **Properties** bar:

```js
grow: {
  inputs: { type: 'number', max: 8, name: 'letter' },
  outputs: { type: 'any', max: 4, name: 'user', label: { en: 'output', it: 'uscita' } },
}
```

| Field | What it is |
|---|---|
| `max` | How many, from 1 to 64. The **Added ports per block** limit (32 by default) counts too: the smaller one holds |
| `type` | The type of the added ports |
| `name` | What they are called: `'letter'` (the first free letter: **c**, **d**…), `'number'` (the number that follows the ports of the block) or `'user'` (`label` plus a number, and the user can change it) |
| `label` | For `'user'`: the base of the name, `{ en, it }` |

Added ports have a fixed id (`x1`, `x2`…) and a shown name. In the code you find them like this:

- in `inputs`, by id: `inputs.x1`;
- in `b.added.inputs`: `[{ id: 'x1', name: 'c', value: 4 }, …]`, in the order chosen by the user;
- in `b.added.outputs`: `[{ id: 'x2', name: 'uscita 1' }, …]`; to send a value use the id: `b.send('x2', value)` or `return { x2: value }`.

### How a block runs

- **`start(b)`** runs at the start of the program, for every block, before the start values of the inputs. It can send values with `b.send`.
- **`run(inputs, b)`** runs every time a value arrives at an input that starts the block. `inputs` has the last value of every input (the added ones too, by id); `b.trigger` is the name of the input that started it. It returns an object `{ port: value }` with the outputs to send, or nothing. An `undefined` value is not sent; a pulse is `true`. It can be `async`.
- A block handles **one value at a time**: until `run` finishes, new values wait in line. Different blocks go on each on their own.
- What `run` (or `start`, or `step`, or a timer) **throws** comes out of the **Exception** output of the block as `{ message, block, type, schema, at }`. If Exception is not linked, it goes to the main console: «Media: Serve un numero». Write messages for whoever uses the block, in plain language.
- A `run` that lasts more than **Time a block may take** (30 seconds by default) is no longer waited for: «Media ha impiegato più di 30 s» comes out on Exception and the block moves on to the next value. The code of that `run`, however, goes on to the end: what it returns is ignored, but the `b.send` it makes in the meantime still go out. The time includes the waits (`await b.call(…)`, `await b.console.read(…)`).
- **`stop(b)`** runs when the program stops, with at most 2 seconds. Errors are ignored. The timers of the block are already stopped and `b.send` no longer sends anything.
- Values are **not copied** when passing from one block to another: never change an object or a list that you receive. Make a copy: `const list = [...inputs.list]`.

### «loop» blocks: execution and step()

A block with `execution: 'loop'` runs by itself, without waiting for values: the engine calls `step(inputs, b)` right after the start and then again after the wait that `step` asks for.

`step` returns `{ outputs, wait, done }`:

| Field | What it is |
|---|---|
| `outputs` | `{ port: value }`: the outputs to send in this turn |
| `wait` | How many milliseconds to wait before the next turn (at least 10; default 10) |
| `done` | `true`: the block stops running (until the next start of the program) |

- `inputs` has the last value of every input; `b.trigger` is not there.
- Every turn counts in the **runs in 10 seconds** of the program: a `wait` of 10 ms makes 1000 turns in 10 seconds.
- If `step` throws, the error comes out of **Exception** and the next turn starts after 10 ms. If the error repeats, check it yourself and return a longer `wait`.
- The block can also have `run`, to react to the inputs; without `run`, the inputs only keep the value.

### Versions: upgrade()

Every block in a schema remembers the version it was saved with. When the program starts and that version is older than `version`, the engine calls:

```js
upgrade(config, from, added)   // → the new settings, or { config: the new settings }
```

- `config` is a copy of the saved settings, `from` the version they were saved with, `added` a copy of the added ports.
- It returns the settings for the current version. The added ports cannot be changed.
- It runs in the main thread, when the program starts; the schema file is not rewritten.
- If it throws, the program does not start: «Il blocco Lampeggia non si aggiorna dalla versione 1: …» ("The block Lampeggia does not upgrade from version 1: …").

### The b context

`b` is the second argument of `run` and `step`, and the only one of `start` and `stop`.

| Member | What it is |
|---|---|
| `b.id` | The id of the block in the schema |
| `b.schema` | The name of the schema |
| `b.config` | The settings, with the defaults |
| `b.lang` | The language of the program (that of whoever started it): `'it'`, `'en'`… |
| `b.trigger` | Only in `run`: the name of the input that started the block |
| `b.added` | The added ports: `{ inputs: [{ id, name, value }], outputs: [{ id, name }] }` |
| `b.memory()` | An object of your own, always the same for this block, which lasts as long as the program. It is emptied when the program starts again |
| `b.linked(port)` | `true` if in the schema there is a link to that input of the block (from engine 1.2.0). For an optional input that changes the behaviour only when used: [Constant · Variable](core.value) sends its value at the start if **send** is not linked. A start value given to the input does not count as a link |
| `b.send(port, value)` | Sends a value at once on an output (an added one too, by id), without waiting for the end of `run`. Useful in timers and to send several values in a row. `undefined` is not sent; after the stop it sends nothing |
| `b.setTimeout(fn, ms)` | A timer that calls `fn` once. Returns the timer |
| `b.setInterval(fn, ms)` | A timer that calls `fn` every `ms` (at least 10). Returns the timer |
| `b.clearTimer(timer)` | Stops a timer of the block (also `null`: it does nothing) |
| `b.call(action, args)` | Asks the kernel for an action of a package, as the user. Returns a `Promise` with the result; if the action throws, it rejects with an `Error` with the same message |
| `b.console.write(console, text, level)` | Writes a line. `level`: `'normal'` (default), `'info'`, `'warning'`, `'error'` |
| `b.console.clear(console)` | Empties a console |
| `b.console.read(console, options)` | Asks a question and waits: `{ value }` or `{ cancelled: true, reason }` |
| `b.ui(port, value)`, `b.exportPort(port, value)` | Reserved for the base blocks (the object of a component, the Schema output) |
| `b.now()` | The time, like `Date.now()` |
| `b.limits` | The limits a block may read: `signalSamples`, the most samples of a signal (Control Panel → Logic Studio → Limits; from engine 1.5.0, missing before) |
| `b.signal` | An `AbortSignal` that fires when the program stops |

The timers of the engine stop by themselves when the program stops. What a timer throws comes out of **Exception**. Do not use the `setTimeout` and `setInterval` of Node: they would not stop with the program.

The options of `b.console.read`:

| Option | What it is |
|---|---|
| `prompt` | The question (at most 500 characters) |
| `kind` | `'text'` (default), `'number'`, `'bool'`, `'key'` |
| `secret` | `true`: the answer is seen as dots |
| `retry` | `false`: an answer that is not valid cancels the question instead of repeating it |
| `fallback` | The value to use when the consoles are not shown outside the IDE (**Do not show them**) |
| `timeoutMs` | After how many milliseconds to cancel the question (0: never) |

`reason` is `'timeout'`, `'cancel'` (Esc), `'invalid'` (wrong answer without `retry`) or `'stop'` (the program stopped); it can be missing when the consoles are not shown and there is no `fallback`. Remember that the wait for the answer counts in the **Time a block may take** too.

```js
async run(inputs, b) {
  const r = await b.console.read(b.config.console, { prompt: 'Quanti pezzi?', kind: 'number', timeoutMs: 20000 });
  if (r.cancelled) return { cancelled: true };
  await b.console.write(b.config.console, `Ok, ${r.value} pezzi`, 'info');
  return { value: r.value };
}
```

## The actions

The worker of a user does not see files and should not go on the network by itself. When a block needs something from outside, it calls an **action** with `b.call('key', args)`. The action is a function of the package, given to `register()`, which runs in the **main thread of the kernel**:

```js
actions: {
  'esempio.saluta': async (user, args, tools) => ({ text: `Ciao ${user.name}` }),
}
```

| Argument | What it is |
|---|---|
| `user` | `{ kind: 'user', id, username, name, role }`: the user who owns the program, as they were when they started it. **Pass it to the kernel services** (`fs`, `notifications`…), which apply their permissions and quotas. Never use the principal of the kernel |
| `args` | What the block passed, copied as JSON |
| `tools.program` | `{ id, name, kind }` of the program |
| `tools.signal` | An `AbortSignal` that fires when the program stops: pass it to a long request |
| `tools.countNet()` | Counts a network request in the quota of the user; throws «Troppe richieste di rete: hai finito la quota di questo minuto» ("Too many network requests: you have used up the quota of this minute") if it is used up. Call it **before every** request (redirects too) |
| `tools.emit(event, data)` | Sends an event to the lilOS pages of the user |

Rules:

- The key is `[a-z][a-z0-9]*\.[a-zA-Z][\w.]{0,60}`; use the prefix of your package (`esempio.…`). If two packages give the same key, the one registered first wins. A key that is not valid is ignored without a warning.
- A block that calls an action that does not exist receives «Azione sconosciuta: esempio.x» ("Unknown action: esempio.x").
- The result is copied as JSON: no functions, dates become texts.
- What the action throws reaches the block as an `Error` with the message (`err.text`, or `err.message`). The user will read it: write it for them and put no secrets in it.
- Ask for services when they are needed, inside the action (`ctx.service('fs')`), not in `init`: the kernel wraps them with its guards after all modules have started.
- An action called when the program has already stopped receives «Il programma non è in esecuzione» ("The program is not running").
- Always check `args`: they come from a program of the user, and the user can write whatever they want in the settings of the blocks.

## The components: components.js

`components.js` exports `components`, a list of definitions, and if you want `styles`, a CSS text that lilOS puts once in the page. The browser imports it from the engine; it **cannot import anything** (neither the SDK nor other files): everything it needs arrives in `c`. Here too nothing must run at import: the kernel imports it too, and there is no `document` there.

### The definition of a component

| Field | What it is |
|---|---|
| `type`, `version`, `label` | As for blocks (`esempio.semaforo`) |
| `icon` | Default `window` |
| `category` | In the **Components** tab: `text` (Text), `values` (Text and values), `commands` (Commands), `containers` (Containers), `charts` (Charts); other: **Other** |
| `inputs` | The ports that **the schema sets** (a text to show, a value) |
| `outputs` | The ports that **whoever uses the window sends** (pressed, the chosen value) |
| `props` | The properties, in the window editor (see below) |
| `grow` | As for blocks |
| `container` | `true`: it has components inside (`c.children()`) |
| `actionPort` | The output port that triggers the **Action on click** (opening or closing a window), if there is an `action` property |
| `render(el, c)` | Draws the component inside `el` |

The ports are **seen from the schema**: in the schema the object of the component has the `inputs` on the left and the `outputs` on the right. The engine accepts from a window only values on the `outputs` (added ones too).

Every component should also have the inputs **enabled** (`enabled`) and **visible** (`visible`), of type `bool`: lilOS handles them by itself (it switches off or hides the component), but the engine accepts a link only to declared ports. Declare them yourself, as the standard components do (see the example below).

### The properties: props

`props` is a list: `{ key, type, default, label, options, min, max, translate }`.

| `type` | What it is |
|---|---|
| `text` | A text (at most 4000 characters). With `translate: true` it is a sentence to translate: show it with `c.t(…)` |
| `number` | A number, brought between `min` and `max` |
| `select` | A choice among `options` |
| `checkbox` | `true` / `false` |
| `icon` | The name of an icon |
| `action` | The action on click: `{ kind: 'none' \| 'open' \| 'close', window }` |
| `console` | A console of the project |
| `resource` | A file of the project folder (an image…): you get the address with `c.host.resourceUrl(…)` |

### The c context

| Member | What it is |
|---|---|
| `c.id` | The id of the component in the window |
| `c.props` | The properties, with the defaults and already checked |
| `c.lang` | The language |
| `c.design` | `true` in the window editor: show fake data and do not react |
| `c.mode` | `'live'` (real window), `'design'` (editor) or `'preview'` (preview) |
| `c.t(text)` | The text translated with the texts table of the project |
| `c.h(tag, attributes, …children)` | Creates an element, like the SDK's `h` |
| `c.icon(name)` | A lilOS icon |
| `c.controls` | The controls of the SDK (`textField`, `selectField`, `slider`, `actionButton`…) |
| `c.charts.chart` | The chart library of the SDK |
| `c.host` | What the place where the window sits offers: `openWindow(name)`, `closeWindow()`, `pickFile({ kind, exts })`, `resourceUrl(path)`, `consoleView(console)`, `chartPoints`. Something may be missing: use `c.host.x?.(…)` |
| `c.added` | The added ports: `{ inputs, outputs }` |
| `c.send(port, value)` | Whoever uses the window did something: the value comes out of the object of the component in the schemas. In the editor it does nothing |
| `c.on(port, fn)` | Listens to an input: `fn` is called at once with the last value, if there is one, and then at every new value. Returns the function to stop listening |
| `c.children(inside)` | For containers: draws the children inside `inside` (or returns them, if you do not pass it) |

Rules:

- `render` must work even if it is called again (the editor redraws) and must not touch anything outside `el`.
- If `render` throws, the type with the message appears in place of the component.
- The CSS of `styles` holds for the whole page: use classes with a prefix of your own (`esm-…`).
- A value that arrives from a schema is any data: never put it in `innerHTML`; use `textContent` or `c.h`.

## The documentation: docs/

If you pass `docs` to `register()`, the engine serves the IDE the pages of your `docs` folder, and the IDE shows them in its documentation window (also with **F1** on a selected block).

```
docs/
  it/
    index.md              the page of the package
    esempio.media.md      the page of the block esempio.media
    esempio.semaforo.md   the page of the component esempio.semaforo
    come-iniziare.md      another page
  en/
    index.md
    …
```

- One folder per language (`it`, `en`…). The engine looks for the page in the language of the reader, then in the language without variant (`pt` for `pt-BR`), then in English, then in Italian.
- `index.md` is the page of the package. The page of a block or component is named after its **type**. The other pages have names `[a-z][a-z0-9-]{0,40}`. Files with other names are ignored.
- The title of a page, in the list, is its first `# …` line.
- A page is at most 512 KB.
- The list of pages is read once per version of the package: if you add pages, raise the version (or restart the kernel).

Links between pages are written like this (no `.md`, no paths):

| You write | Opens |
|---|---|
| `[Media](esempio.media)` | The page of a block or component, by type |
| `[Blocchi di esempio](logicstudio-esempio)` | The `index` page of a package |
| `[Come iniziare](logicstudio-esempio/come-iniziare)` | Another page of a package |
| `[Progetti](ide/projects)` | A page of the IDE guide |
| `[sito](https://…)` | An external address |

The Markdown that is shown: headings from `#` to `####`, paragraphs, lists, bold, italics, code, code blocks, quotes, rules, tables. No HTML, no images.

## A complete package

A package `logicstudio-esempio` with five blocks (an average with added ports, a greeting and an exchange rate with actions, a blinker with timers and `upgrade`, a `loop` ramp) and a component (a traffic light). `module.json` is the one above.

### index.js

```js
import { join } from 'node:path';

let handle = null;

/** The actions: they run in the main thread of the kernel, as the user of the program. */
const actions = {
  'esempio.saluta': async (user, args, tools) => {
    const who = String(args?.who ?? '').trim().slice(0, 80) || user.name;
    return { text: `Ciao ${who}, da «${tools.program.name}»` };
  },

  'esempio.cambio': async (user, args, tools) => {
    const to = String(args?.to ?? 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(to)) throw new Error(`Valuta non valida: ${to.slice(0, 10)}`);
    tools.countNet();   // counts in the network quota of the user; throws if it is used up
    const limit = AbortSignal.timeout(15000);
    const signal = tools.signal ? AbortSignal.any([tools.signal, limit]) : limit;
    let res;
    try {
      res = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${to}`, { signal });
    } catch {
      throw new Error('Il servizio dei cambi non risponde');
    }
    if (!res.ok) throw new Error(`Il servizio dei cambi ha risposto ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.[to];
    if (typeof rate !== 'number') throw new Error(`Nessun cambio per ${to}`);
    return { rate, date: String(data.date ?? '') };
  },
};

export default {
  async init(ctx) {
    ctx.provide('logicblock.esempio', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name,          // 'logicstudio-esempio'
      version: ctx.version,    // '1.0.0'
      label: { en: 'Example blocks', it: 'Blocchi di esempio' },
      blocks: join(ctx.dir, 'blocks.js'),
      components: join(ctx.dir, 'components.js'),
      docs: join(ctx.dir, 'docs'),
      actions,
    });
  },
  async stop() {
    handle?.unregister();
  },
};
```

The request of `esempio.cambio` goes to a fixed address. If an action has to go to an address chosen by the user, it must also check that it is not this computer or the local network, as the [HTTP request (fetch)](net.request) does.

### blocks.js

```js
const L = (en, it) => ({ en, it });
const PULSE = true;
const num = v => (typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.')));

export const blocks = [
  // 1. A calculation, with inputs added by the user
  {
    type: 'esempio.media', version: 1, category: 'math', icon: 'calculator',
    label: L('Average', 'Media'),
    description: L('The average of the inputs that have a value', 'La media degli ingressi che hanno un valore'),
    inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    config: [{ key: 'decimals', type: 'number', default: 2, min: 0, max: 10, label: L('Decimals', 'Decimali') }],
    grow: { inputs: { type: 'number', max: 8, name: 'letter' } },
    run(inputs, b) {
      const values = [inputs.a, inputs.b, ...b.added.inputs.map(p => p.value)]
        .filter(v => v !== undefined)
        .map(num);
      if (!values.length) return undefined;
      if (values.some(n => Number.isNaN(n))) throw new Error('Serve un numero');
      const d = Number.isInteger(b.config.decimals) ? Math.min(10, Math.max(0, b.config.decimals)) : 2;
      const avg = values.reduce((s, n) => s + n, 0) / values.length;
      return { result: Number(avg.toFixed(d)) };
    },
  },

  // 2. An action of the package, in the kernel
  {
    type: 'esempio.saluto', version: 1, category: 'text', icon: 'bell',
    label: L('Greeting', 'Saluto'),
    inputs: [
      { name: 'send', type: 'pulse', label: L('send', 'invia') },
      { name: 'who', type: 'text', label: L('who', 'chi'), trigger: false },
    ],
    outputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    async run(inputs, b) {
      if (b.trigger !== 'send') return undefined;
      const r = await b.call('esempio.saluta', { who: inputs.who ?? '' });
      return { text: r.text };
    },
  },

  // 3. An action that goes on the network, with two outputs
  {
    type: 'esempio.cambio', version: 1, category: 'net', icon: 'globe',
    label: L('Exchange rate', 'Cambio'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }],
    outputs: [
      { name: 'rate', type: 'number', label: L('rate', 'cambio') },
      { name: 'date', type: 'text', label: L('date', 'data') },
    ],
    config: [{ key: 'to', type: 'select', default: 'USD', options: ['USD', 'GBP', 'CHF', 'JPY'], label: L('Currency', 'Valuta') }],
    async run(inputs, b) {
      const r = await b.call('esempio.cambio', { to: b.config.to });
      return { rate: r.rate, date: r.date };
    },
  },

  // 4. Timers, memory, start, stop and upgrade
  {
    type: 'esempio.lampeggia', version: 2, category: 'time', icon: 'lamp',
    label: L('Blink', 'Lampeggia'),
    inputs: [{ name: 'on', type: 'bool', label: L('on', 'acceso') }],
    outputs: [{ name: 'state', type: 'bool', label: L('state', 'stato') }],
    config: [
      { key: 'ms', type: 'number', default: 500, min: 50, max: 60000, label: L('Every (milliseconds)', 'Ogni (millisecondi)') },
      { key: 'atStart', type: 'checkbox', default: false, label: L('Starts on its own', 'Parte da solo') },
    ],
    start(b) {
      b.memory().state = false;
      if (b.config.atStart) accendi(b);
    },
    run({ on }, b) {
      if (on === true || on === 'true' || on === 1) accendi(b);
      else spegni(b);
      return undefined;
    },
    stop(b) {
      // The engine stops the timers; here the memory of the block is left tidy
      b.memory().timer = null;
    },
    // Version 1 had the setting «seconds»: version 2 has «ms»
    upgrade(config, from) {
      if (from < 2 && config.seconds !== undefined) {
        const { seconds, ...rest } = config;
        return { ...rest, ms: Math.round(num(seconds) * 1000) || 500 };
      }
      return config;
    },
  },

  // 5. A block that runs by itself
  {
    type: 'esempio.rampa', version: 1, category: 'time', icon: 'chart',
    label: L('Ramp', 'Rampa'),
    execution: 'loop',
    inputs: [{ name: 'target', type: 'number', label: L('target', 'obiettivo') }],
    outputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    config: [
      { key: 'step', type: 'number', default: 1, label: L('Step', 'Passo') },
      { key: 'ms', type: 'number', default: 100, min: 10, label: L('Every (milliseconds)', 'Ogni (millisecondi)') },
    ],
    start(b) {
      b.memory().value = 0;
    },
    step({ target }, b) {
      const m = b.memory();
      const wait = Math.max(10, num(b.config.ms) || 100);
      if (typeof target !== 'number' || target === m.value) return { wait };   // nothing to do: look again later
      const passo = Math.abs(num(b.config.step)) || 1;
      m.value = target > m.value ? Math.min(target, m.value + passo) : Math.max(target, m.value - passo);
      return { outputs: { value: m.value }, wait };
    },
  },
];

function accendi(b) {
  const m = b.memory();
  if (m.timer) return;
  const ms = Math.max(50, num(b.config.ms) || 500);
  m.timer = b.setInterval(() => {
    m.state = !m.state;
    b.send('state', m.state);
  }, ms);
}

function spegni(b) {
  const m = b.memory();
  b.clearTimer(m.timer);
  m.timer = null;
  if (m.state) {
    m.state = false;
    b.send('state', false);
  }
}
```

What it shows:

- **Average**: with **a** = 4, **b** = 6 and an added input **c** = 11 it sends 7 on **result**; with **a** = `"ciao"` it sends «Serve un numero» on **Exception**. The **Decimals** field emptied is `null`: the block uses 2.
- **Greeting**: **who** does not start the block (`trigger: false`); when **send** arrives, the block asks for the action and sends «Ciao Ada, da «Serra»».
- **Exchange rate**: every **read** makes a request, counted in the network quota. If the service does not answer, the message comes out of **Exception**.
- **Blink**: `true` on **on** starts a timer that sends `true`, `false`, `true`… on **state**; `false` stops it and sends `false`. A schema saved with version 1 (`{ seconds: 2 }`) starts with `{ ms: 2000 }`.
- **Ramp**: a value on **target** makes **value** go up or down by one **Step** every 100 ms, up to the target; then the block waits without sending anything.

### components.js

```js
const L = (en, it) => ({ en, it });
const COMMON = [
  { name: 'enabled', type: 'bool', label: L('enabled', 'abilitato') },
  { name: 'visible', type: 'bool', label: L('visible', 'visibile') },
];
const COLORS = ['red', 'yellow', 'green'];

export const styles = `
.esm-sem { display: inline-flex; flex-direction: column; gap: 4px; padding: 6px; border: 0; border-radius: 8px; background: #222; cursor: pointer; }
.esm-sem i { display: block; width: 18px; height: 18px; border-radius: 50%; background: #444; }
.esm-sem i.on.red { background: #e5484d; }
.esm-sem i.on.yellow { background: #f5d90a; }
.esm-sem i.on.green { background: #30a46c; }
.esm-wrap { display: inline-flex; align-items: center; gap: 8px; }
`;

export const components = [
  {
    type: 'esempio.semaforo', version: 1, category: 'values', icon: 'lamp',
    label: L('Traffic light', 'Semaforo'),
    inputs: [{ name: 'color', type: 'text', label: L('color', 'colore') }, ...COMMON],
    outputs: [{ name: 'clicked', type: 'pulse', label: L('clicked', 'cliccato') }],
    props: [
      { key: 'label', type: 'text', default: '', translate: true, label: L('Label', 'Etichetta') },
      { key: 'color', type: 'select', default: 'red', options: COLORS, label: L('Start color', 'Colore iniziale') },
    ],
    render(el, c) {
      const lights = COLORS.map(name => c.h('i', { class: name }));
      const show = color => lights.forEach((light, i) => light.classList.toggle('on', COLORS[i] === color));
      const box = c.h('button', {
        type: 'button', class: 'esm-sem', 'aria-label': c.t(c.props.label) || 'Semaforo',
        onclick: () => c.send('clicked', true),   // in the editor it does nothing
      }, ...lights);
      el.classList.add('esm-wrap');
      el.append(...[c.props.label ? c.h('span', {}, c.t(c.props.label)) : null, box].filter(Boolean));
      show(c.design ? 'green' : c.props.color);
      c.on('color', v => show(String(v ?? '').toLowerCase()));
    },
  },
];
```

In the schema its object has **color**, **enabled** and **visible** on the left, **clicked** on the right:

```
[Constant · Variable: "green"] value ──▶ color [Traffic light: sem1] clicked ──▶ value [Print (console.log)]
```

### docs/en/esempio.media.md

~~~markdown
# Average

`esempio.media` · Math · [Example blocks](logicstudio-esempio) · version 1

The average of the inputs that have a value.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | number | The first value. |
| **b** | number | The second value. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** | number | The average, with the chosen decimals. |
| **Exception** (`error`) | object | When an input is not a number. |

## Examples

```
[Constant · Variable: 4] value ──▶ a  [Average] result ──▶ value [Print (console.log)]
[Constant · Variable: 6] value ──▶ b
```

Writes 4, then 5.
~~~

## Trying it

1. Put the module folder among the kernel modules (or install it from the AppStore) and restart the kernel.
2. In the kernel log look for `Logic Studio: pacchetto logicstudio-esempio 1.0.0 (5 blocchi, 1 componenti)` and any «scartato» ("discarded") warnings.
3. In the IDE the blocks are in the **Blocks** tab (Math, Text, Network, Time), the component in the **Components** tab of a window (Text and values). The package also appears in **Control Panel → Logic Studio → Packages**.
4. Make a schema with your blocks, press **Test** and watch the values on the links.

## Good to know

- **The code of the blocks is not isolated.** It runs in the worker with all the possibilities of Node, because packages are installed by an administrator. A block that uses `node:fs`, `fetch` or anything else on its own skips the user's permissions, quotas and network rules: always use an action.
- **The engine does not interrupt code that does not stop.** The time a block may take works only if `run` waits (`await`). An endless loop that never waits (`while (true) {}`) blocks the worker of the user and all their programs. Break up long jobs with `await` or with a `loop` block.
- **`stop()` does not always run.** It does not run when the kernel shuts down, nor when the worker of the user closes because of an error or memory. Do not trust `stop()` with anything that must be saved.
- **A worker keeps the blocks it has loaded.** A worker loads the blocks of the registered packages when it starts, and those of the packages that arrived later when the next program starts; but a block it already knows is not loaded again while the worker is open. After changing `blocks.js` raise the version and restart the kernel.
- **Memory belongs to the user.** All the programs of a user are in the same worker, with its memory quota (128 MB by default). A block that keeps huge lists in `b.memory()` can make all the programs of that user stop.
- **Values travel as JSON.** The arguments and results of actions, the console lines and the values for windows leave the worker: use only JSON values (numbers, texts, yes/no, lists, simple objects).
- Keep `en` and `it` in all the labels: the lilOS language packs do not translate packages.

## See also

- [Logic Studio Engine](logicstudio-engine)
- [Programs](logicstudio-engine/programs)
- [Limits and quotas](logicstudio-engine/limits)
- [Permissions](logicstudio-engine/permissions)
- [How a block works](ide/blocks) and [The components in the schema](ide/components)
