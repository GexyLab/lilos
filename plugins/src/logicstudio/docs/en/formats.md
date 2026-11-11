# File formats

Logic Studio files are **JSON text** (UTF-8). The IDE writes them with two spaces of indentation and a newline at the end. Each one has a `format` field that says what it is:

| Extension | `format` | What it is |
|---|---|---|
| `.lsproj` | `lilos-lsproj/1` | A project. |
| `.lsch` | `lilos-lsch/1` | A schema. |
| `.lsui` | `lilos-lsui/1` | A window. |
| `.lsapp` | `lilos-lsapp/1` | The file that starts an app made with **Make app…**. |

You can open them with a text editor, copy them, put them in an archive. If you edit them by hand, the IDE reads them with tolerance (what is not valid is left out: see [Projects](ide/projects)) and the engine checks them again before running them.

Common rules:

- **ids** of blocks, components and consoles: letters, digits, `_` and `-`, from 1 to 40 characters, unique in their file;
- **names** of schemas and windows in the project: from 1 to 80 characters, without `/`, `\`, `:` and control characters (the IDE also forbids `* ? " < > |`), and not `__proto__`, `constructor`, `prototype`;
- **ports** in links: the **internal name** of the port (`result`, `value`, `error`), not the one shown; added ports with their id (`x1`, `x2`…).

## The project: `.lsproj`

A complete example:

```json
{
  "format": "lilos-lsproj/1",
  "name": "Serra",
  "version": "1.2.0",
  "description": "Temperatura e irrigazione della serra",
  "schemas": {
    "main": "schemi/main.lsch",
    "sensori": "schemi/zone/sensori.lsch"
  },
  "windows": {
    "Principale": "ui/Principale.lsui",
    "Grafico": "ui/Grafico.lsui"
  },
  "main": "Principale",
  "links": [
    { "from": "sensori:temp", "to": "main:temp" }
  ],
  "consoles": {
    "list": [
      { "id": "main", "name": "Principale" },
      { "id": "c1", "name": "Allarmi", "color": "#e5534b", "keep": 500 }
    ],
    "outside": "onInput",
    "closeAfterAnswer": true,
    "notify": true,
    "copyToLog": "warnings",
    "mainOpens": "start"
  },
  "options": { "keepValues": true, "syncCopies": true },
  "entrypoints": {
    "Grafico": { "kind": "file", "ext": ["csv"], "label": "Grafico della serra" }
  },
  "uses": {},
  "texts": {
    "en": { "Temperatura": "Temperature", "Grafico": "Chart" }
  },
  "app": { "id": "serra", "glyph": "chart", "color": "#2da44e", "runs": "open" },
  "map": {
    "schema:main": [40, 40],
    "schema:sensori": [320, 40],
    "window:Principale": [40, 300]
  }
}
```

| Field | What it contains |
|---|---|
| `format` | Always `lilos-lsproj/1`. |
| `name` | The name of the project (Options → General). |
| `version` | Three numbers, `1.0.0` for a new project. |
| `description` | A description, even empty. |
| `schemas` | The schemas: **name in the project → path** of the file, relative to the project folder and inside `schemi/`. |
| `windows` | The windows: **name → path**, inside `ui/`. |
| `main` | The name of the main window, or `null` if the project has no windows. |
| `links` | The links between schemas: `from` is `"schema:port"` of a **Return**, `to` is `"schema:port"` of a **Parameter**. |
| `consoles.list` | The consoles: `id` (the main one is always `main`; the others `c1`, `c2`…), `name` (at most 60 characters), `color` (a CSS colour, optional), `keep` (lines kept, from 100 to 2000, default 1000). |
| `consoles.outside` | Outside the IDE: `all` (Show them all), `onInput` (Only when they ask for something, default), `hidden` (Do not show them), `main` (All in the main console). |
| `consoles.closeAfterAnswer` | Close the console after the answer (default `true`). |
| `consoles.notify` | The notification when a console asks for something (default `true`). |
| `consoles.copyToLog` | `none`, `warnings` (default) or `all`. |
| `consoles.mainOpens` | With `outside: "main"`: `start` (default) or `onInput`. |
| `options.keepValues` | A window opened again shows the last values at once (default `true`). |
| `options.syncCopies` | Copies of the same window stay in step (default `true`). |
| `entrypoints` | For each window (not the main one) that has an entry point: `kind` = `file` (with `ext`, the extensions without a dot), `action`, `call` or `login`; `label` is the label. |
| `uses` | Reserved, empty. |
| `texts` | The translations of the texts of the windows: **language → { written text → translation }**. |
| `app` | What **Make app…** remembers: `id`, `glyph` (the icon), `color`; `runs` is always `open`. At the start they are `null`. |
| `map` | The position of the boxes in the Map: `"schema:name"` or `"window:name"` → `[x, y]`. It is there only after you have moved a box. |

What happens with an old or incomplete file: missing fields take the default values; the elements of `schemas` and `windows` without a name or without a path disappear; links without a text `from` or `to` disappear. On opening, the IDE lines up `schemas` and `windows` with the files that really are in the folders (see [Projects](ide/projects)).

## The schema: `.lsch`

A complete example, with a block with a label, a start value, an added port, a Schema output and the object of a component:

```json
{
  "format": "lilos-lsch/1",
  "name": "main",
  "blocks": [
    {
      "id": "value1", "type": "core.value", "v": 2, "x": 40, "y": 60,
      "config": { "kind": "number", "value": "2" },
      "ports": {}
    },
    {
      "id": "add1", "type": "core.add", "v": 1, "x": 260, "y": 60,
      "label": "Totale",
      "config": {},
      "ports": { "b": { "start": 3, "trigger": false } },
      "added": { "inputs": [{ "id": "x1", "name": "c" }], "outputs": [] }
    },
    {
      "id": "consolewrite1", "type": "core.consoleWrite", "v": 1, "x": 480, "y": 60,
      "config": { "console": "main", "level": "normal", "format": "text" },
      "ports": {}
    },
    {
      "id": "schemaout1", "type": "core.schemaOut", "v": 1, "x": 480, "y": 180,
      "config": { "port": "totale", "type": "number", "description": "La somma" },
      "ports": {}
    },
    {
      "id": "component1", "type": "core.component", "v": 1, "x": 40, "y": 220,
      "label": "Azzera",
      "config": { "window": "Principale", "component": "button1" },
      "ports": {}
    }
  ],
  "links": [
    { "from": ["value1", "value"], "to": ["add1", "a"] },
    { "from": ["component1", "pressed"], "to": ["consolewrite1", "clear"] },
    { "from": ["add1", "result"], "to": ["consolewrite1", "value"] },
    { "from": ["add1", "result"], "to": ["schemaout1", "value"] },
    { "from": ["add1", "error"], "to": ["consolewrite1", "value"] }
  ],
  "notes": [],
  "view": { "x": 0, "y": 0, "zoom": 1 }
}
```

| Field | What it contains |
|---|---|
| `format` | Always `lilos-lsch/1`. |
| `name` | The name given to the schema when it was created. In a project the name written in the `.lsproj` counts; for a schema alone, this one. |
| `blocks` | The blocks, in the order in which they start. |
| `blocks[].id` | The id of the block, unique in the schema. The IDE makes it from the type and a number: `add1`, `consolewrite2`. |
| `blocks[].type` | The type: `package.name` (`core.add`, `net.request`). |
| `blocks[].v` | The version of the block when it was put. If the package has a newer one and knows how to upgrade the settings, the engine upgrades them when it starts. |
| `blocks[].x`, `y` | The position on the sheet, in pixels. |
| `blocks[].label` | The label (optional, at most 80 characters). |
| `blocks[].config` | The settings, with the internal keys (at most 64 KB). Missing ones take the default value. |
| `blocks[].ports` | Per input: `start` (the start value) and `trigger: false` (it does not start it). An input with nothing special is not there. |
| `blocks[].added` | The added ports: `inputs` and `outputs`, each `{ "id": "x1", "name": "c" }`. The ids `x` + number are unique in the block (among inputs and outputs). |
| `links` | The links: `from` = `[id of the block, output]`, `to` = `[id of the block, input]`. The Exception output is called `error`. |
| `notes` | Reserved, empty. |
| `view` | Position and zoom of the view when you closed the schema. |
| `consoles` | Only in a **schema alone**, optional: the consoles as in the `.lsproj` (`list`, `outside`…). |

The ports of the **object of a component** (`core.component`) are those of the component, with their internal names (for a Button `pressed`, `text`, `enabled`, `visible`). The ports of the **schema ports**: the Schema input has the output `value`, the Schema output the input `value`.

What happens with an old or damaged file:

| In the file | The IDE | The engine |
|---|---|---|
| A block without a valid `id` or with a repeated `id` | Leaves it out, with its links. | «Lo schema main ha un blocco senza id valido» ("The schema main has a block without a valid id") / «Due blocchi con lo stesso id (add1) nello schema main» ("Two blocks with the same id (add1) in the schema main") |
| A link to a block that is not there | Leaves it out. | «Lo schema main ha un collegamento verso un blocco che non c'è» ("The schema main has a link to a block that is not there") |
| A link to a port that is not there | Keeps it (it is not seen). | «Lo schema main: il blocco add1 non ha l'ingresso c» ("The schema main: the block add1 does not have the input c") |
| A block of a package that is not installed | Shows it dashed. | «Il blocco add1 (net.request) non c'è: manca il suo pacchetto» ("The block add1 (net.request) is not there: its package is missing") |
| `x`, `y`, `v` not numbers | Sets them to 0 (and `v` to 1). | — |
| `config`, `ports` not objects | Empties them. | Empties them. |
| Start values of ports that the block does not have | Keeps them. | Ignores them. |

## The window: `.lsui`

A complete example, with containers, a button that opens another window and a Free area:

```json
{
  "format": "lilos-lsui/1",
  "title": "Serra",
  "size": { "w": 480, "h": 420, "resizable": true },
  "root": {
    "id": "root",
    "type": "ui.column",
    "props": { "gap": 10, "padding": 14 },
    "children": [
      { "id": "label1", "type": "ui.label", "v": 1, "props": { "text": "Temperatura", "size": "title", "align": "start" } },
      { "id": "gauge1", "type": "ui.gauge", "v": 1, "props": { "label": "Aria", "min": 0, "max": 50, "unit": "°C", "decimals": 1 } },
      {
        "id": "row1", "type": "ui.row", "v": 1,
        "props": { "gap": 10, "padding": 0, "align": "center", "wrap": true },
        "children": [
          { "id": "button1", "type": "ui.button", "v": 1, "props": { "text": "Azzera", "icon": "refresh", "variant": "normal", "action": { "kind": "none" } } },
          { "id": "button2", "type": "ui.button", "v": 1, "props": { "text": "Grafico", "icon": "", "variant": "primary", "action": { "kind": "open", "window": "Grafico" } } }
        ]
      },
      {
        "id": "free1", "type": "ui.free", "v": 1, "props": { "height": 120 },
        "children": [
          { "id": "lamp1", "type": "ui.lamp", "v": 1, "props": { "label": "Pompa", "color": "green" }, "layout": { "x": 20, "y": 30 } }
        ]
      }
    ]
  }
}
```

| Field | What it contains |
|---|---|
| `format` | Always `lilos-lsui/1`. |
| `title` | The title (at most 120 characters). |
| `size` | `w` and `h` in pixels (at least 160 × 120), `resizable`. |
| `root` | The bottom component: a **Column** with id `root`. |
| `…id` | The id of the component, unique in the window: it is what the objects in the schemas use. |
| `…type` | The type of the component (`ui.button`, `charts.line`). |
| `…v` | The version of the component when it was put. |
| `…props` | The properties, with the internal keys. When the window opens, every value is cleaned up: a number outside the limits goes to the limit, a choice that does not exist goes back to the default one, a text is cut at 4000 characters. |
| `…children` | Only in containers: the components inside, in order. |
| `…layout` | Only inside a **Free area**: `x`, `y` (and, optional, `w`, `h`) in pixels, from 0 to 10000. |
| `…added` | The added ports of a component that provides them: `{ "inputs": [{ "id": "x1", "name": "serra" }], "outputs": [] }`. |

What happens with an old or damaged file: a component without a valid id or with a repeated id gets a new one (careful: an object in a schema that looked for it with the old id no longer finds it); a component beyond 32 levels of containers disappears; a missing `root` becomes an empty Column; a component of a package that is not installed shows as a box with its type. The engine counts **all** the components, containers and `root` included, for the limit of 200.

## The app: `.lsapp` and `lilos.json`

The `.lsapp` file says where the manifest and the project are, relative to the folder of the app:

```json
{
  "format": "lilos-lsapp/1",
  "manifest": "lilos.json",
  "project": "project/Serra.lsproj"
}
```

The manifest `lilos.json` that **Make app…** writes:

```json
{
  "id": "serra",
  "version": "1.2.0",
  "kind": "local",
  "name": "Serra",
  "description": "Temperatura e irrigazione della serra",
  "category": "other",
  "icon": { "glyph": "chart", "color": "#2da44e" },
  "publisher": { "id": "local", "name": "Ada" },
  "sdk": "2",
  "lilos": ">=1.37.0",
  "entrypoints": {
    "main": { "kind": "window" },
    "w1": { "kind": "window", "label": "Grafico della serra", "logicWindow": "Grafico", "logicKind": "file" }
  },
  "dependencies": [
    { "module": "logicstudio-engine", "reason": "Runs the project of the app" },
    { "module": "logicstudio-core", "version": ">=1.0.0", "reason": "Blocks or components of the project" },
    { "module": "logicstudio-ui", "version": ">=1.0.0", "reason": "Blocks or components of the project" }
  ],
  "permissions": [],
  "contributes": { "fileTypes": ["csv"] },
  "logicstudio": { "project": "project/Serra.lsproj", "runs": "open" }
}
```

And `locales.json` has the English (`@name`, `@description`) plus the translations of the project's `texts`. See [Making an app](ide/create-app).

## Examples

### 1. Writing a minimal schema by hand

Create with a text editor the file `ciao.lsch`:

```json
{
  "format": "lilos-lsch/1",
  "name": "ciao",
  "blocks": [
    { "id": "value1", "type": "core.value", "v": 2, "x": 40, "y": 40, "config": { "kind": "text", "value": "Ciao!" } },
    { "id": "consolewrite1", "type": "core.consoleWrite", "v": 1, "x": 260, "y": 40 }
  ],
  "links": [
    { "from": ["value1", "value"], "to": ["consolewrite1", "value"] }
  ]
}
```

Open it with Logic Studio IDE: it is a schema alone. Press **Test**: the console writes `Ciao!`. The engine gives the missing settings their default value (for the Constant · Variable block, nothing linked to **send**: it sends the value at start). Careful: the **Properties** of the IDE show empty, or unticked, the settings that are missing in the file, even if the engine uses the default value. The fields `ports`, `config`, `notes` and `view` are written the first time you save a change.

### 2. Adding a translation

In the `.lsproj` of a project written in Italian, add:

```json
"texts": {
  "en": { "Saluta": "Say hello", "Il tuo nome": "Your name" }
}
```

Whoever opens the windows with lilOS in English sees «Say hello» in place of «Saluta».

### 3. Moving a schema to a subfolder without the IDE

If you move `schemi/main.lsch` to `schemi/vecchi/main.lsch` with the File Manager, the next time it opens the IDE removes `main` (the file is no longer where the project says) and adds `main` with the new path. The links of the map that used `main:…` stay valid because the name does not change. Save to write it in the `.lsproj`.

## See also

- [Projects](ide/projects)
- [Making an app](ide/create-app)
- [How a block works](ide/blocks)
