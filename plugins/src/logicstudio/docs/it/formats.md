# Formati dei file

I file di Logic Studio sono **testo JSON** (UTF-8). L'IDE li scrive con due spazi di rientro e un a capo in fondo. Ognuno ha un campo `format` che dice cos'è:

| Estensione | `format` | Cos'è |
|---|---|---|
| `.lsproj` | `lilos-lsproj/1` | Un progetto. |
| `.lsch` | `lilos-lsch/1` | Uno schema. |
| `.lsui` | `lilos-lsui/1` | Una finestra. |
| `.lsapp` | `lilos-lsapp/1` | Il file che fa partire un'app fatta con **Crea app…**. |

Puoi aprirli con un editor di testo, copiarli, metterli in un archivio. Se li modifichi a mano, l'IDE li legge con tolleranza (quello che non è valido viene lasciato fuori: vedi [Progetti](ide/projects)) e il motore li ricontrolla prima di farli girare.

Regole comuni:

- **id** di blocchi, componenti e console: lettere, cifre, `_` e `-`, da 1 a 40 caratteri, unici nel loro file;
- **nomi** di schemi e finestre nel progetto: da 1 a 80 caratteri, senza `/`, `\`, `:` e caratteri di controllo (l'IDE vieta anche `* ? " < > |`), e non `__proto__`, `constructor`, `prototype`;
- **porte** nei collegamenti: il **nome interno** della porta (`result`, `value`, `error`), non quello mostrato; le porte aggiunte con il loro id (`x1`, `x2`…).

## Il progetto: `.lsproj`

Un esempio completo:

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

| Campo | Cosa contiene |
|---|---|
| `format` | Sempre `lilos-lsproj/1`. |
| `name` | Il nome del progetto (Opzioni → Generale). |
| `version` | Tre numeri, `1.0.0` per un progetto nuovo. |
| `description` | Una descrizione, anche vuota. |
| `schemas` | Gli schemi: **nome nel progetto → percorso** del file, relativo alla cartella del progetto e dentro `schemi/`. |
| `windows` | Le finestre: **nome → percorso**, dentro `ui/`. |
| `main` | Il nome della finestra main, o `null` se il progetto non ha finestre. |
| `links` | I collegamenti tra schemi: `from` è `"schema:porta"` di un blocco **Return**, `to` è `"schema:porta"` di un blocco **Parametro**. |
| `consoles.list` | Le console: `id` (la principale è sempre `main`; le altre `c1`, `c2`…), `name` (al massimo 60 caratteri), `color` (un colore CSS, facoltativo), `keep` (righe tenute, da 100 a 2000, di serie 1000). |
| `consoles.outside` | Fuori dall'IDE: `all` (Mostrale tutte), `onInput` (Solo quando chiedono un dato, di serie), `hidden` (Non mostrarle), `main` (Tutte nella console principale). |
| `consoles.closeAfterAnswer` | Chiudi la console dopo la risposta (di serie `true`). |
| `consoles.notify` | La notifica quando una console chiede un dato (di serie `true`). |
| `consoles.copyToLog` | `none`, `warnings` (di serie) o `all`. |
| `consoles.mainOpens` | Con `outside: "main"`: `start` (di serie) o `onInput`. |
| `options.keepValues` | Una finestra riaperta mostra subito gli ultimi valori (di serie `true`). |
| `options.syncCopies` | Le copie della stessa finestra restano allineate (di serie `true`). |
| `entrypoints` | Per ogni finestra (non la main) che ha un punto d'ingresso: `kind` = `file` (con `ext`, le estensioni senza punto), `action`, `call` o `login`; `label` l'etichetta. |
| `uses` | Riservato, vuoto. |
| `texts` | Le traduzioni dei testi delle finestre: **lingua → { testo scritto → traduzione }**. |
| `app` | Quello che **Crea app…** ricorda: `id`, `glyph` (l'icona), `color`; `runs` è sempre `open`. All'inizio sono `null`. |
| `map` | La posizione dei riquadri nella Mappa: `"schema:nome"` o `"window:nome"` → `[x, y]`. C'è solo dopo che hai spostato un riquadro. |

Cosa succede con un file vecchio o incompleto: i campi che mancano prendono i valori di serie; gli elementi di `schemas` e `windows` senza nome o senza percorso spariscono; i collegamenti senza `from` o `to` di testo spariscono. All'apertura l'IDE allinea `schemas` e `windows` con i file che ci sono davvero nelle cartelle (vedi [Progetti](ide/projects)).

## Lo schema: `.lsch`

Un esempio completo, con un blocco con etichetta, un valore iniziale, una porta aggiunta, un'Uscita di schema e l'oggetto di una componente:

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

| Campo | Cosa contiene |
|---|---|
| `format` | Sempre `lilos-lsch/1`. |
| `name` | Il nome dato allo schema quando è stato creato. Nel progetto conta il nome scritto nel `.lsproj`; per uno schema da solo, questo. |
| `blocks` | I blocchi, nell'ordine in cui partono. |
| `blocks[].id` | L'id del blocco, unico nello schema. L'IDE lo fa con il tipo e un numero: `add1`, `consolewrite2`. |
| `blocks[].type` | Il tipo: `pacchetto.nome` (`core.add`, `net.request`). |
| `blocks[].v` | La versione del blocco quando è stato messo. Se il pacchetto ne ha una più nuova e sa aggiornare le impostazioni, il motore le aggiorna quando parte. |
| `blocks[].x`, `y` | La posizione sul foglio, in pixel. |
| `blocks[].label` | L'etichetta (facoltativa, al massimo 80 caratteri). |
| `blocks[].config` | Le impostazioni, con le chiavi interne (al massimo 64 KB). Quelle che mancano prendono il valore di serie. |
| `blocks[].ports` | Per ingresso: `start` (il valore iniziale) e `trigger: false` (non lo avvia). Un ingresso senza niente di speciale non c'è. |
| `blocks[].added` | Le porte aggiunte: `inputs` e `outputs`, ognuna `{ "id": "x1", "name": "c" }`. Gli id `x` + numero sono unici nel blocco (tra ingressi e uscite). |
| `links` | I collegamenti: `from` = `[id del blocco, uscita]`, `to` = `[id del blocco, ingresso]`. L'uscita Eccezione si chiama `error`. |
| `notes` | Riservato, vuoto. |
| `view` | Posizione e zoom della vista quando hai chiuso lo schema. |
| `consoles` | Solo in uno **schema da solo**, facoltativo: le console come in `.lsproj` (`list`, `outside`…). |

Le porte dell'**oggetto di una componente** (`core.component`) sono quelle della componente, con i loro nomi interni (per un Pulsante `pressed`, `text`, `enabled`, `visible`). Le porte delle **porte di schema**: l'Ingresso di schema ha l'uscita `value`, l'Uscita di schema l'ingresso `value`.

Cosa succede con un file vecchio o rovinato:

| Nel file | L'IDE | Il motore |
|---|---|---|
| Un blocco senza `id` valido o con un `id` ripetuto | Lo lascia fuori, con i suoi collegamenti. | «Lo schema main ha un blocco senza id valido» / «Due blocchi con lo stesso id (add1) nello schema main» |
| Un collegamento verso un blocco che non c'è | Lo lascia fuori. | «Lo schema main ha un collegamento verso un blocco che non c'è» |
| Un collegamento verso una porta che non c'è | Lo tiene (non si vede). | «Lo schema main: il blocco add1 non ha l'ingresso c» |
| Un blocco di un pacchetto non installato | Lo mostra tratteggiato. | «Il blocco add1 (net.request) non c'è: manca il suo pacchetto» |
| `x`, `y`, `v` non numerici | Li mette a 0 (e `v` a 1). | — |
| `config`, `ports` non oggetti | Li svuota. | Li svuota. |
| Valori iniziali di porte che il blocco non ha | Li tiene. | Li ignora. |

## La finestra: `.lsui`

Un esempio completo, con contenitori, un pulsante che apre un'altra finestra e un'Area libera:

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

| Campo | Cosa contiene |
|---|---|
| `format` | Sempre `lilos-lsui/1`. |
| `title` | Il titolo (al massimo 120 caratteri). |
| `size` | `w` e `h` in pixel (almeno 160 × 120), `resizable`. |
| `root` | La componente di fondo: una **Colonna** con id `root`. |
| `…id` | L'id della componente, unico nella finestra: è quello che usano gli oggetti negli schemi. |
| `…type` | Il tipo della componente (`ui.button`, `charts.line`). |
| `…v` | La versione della componente quando è stata messa. |
| `…props` | Le proprietà, con le chiavi interne. Quando la finestra si apre, ogni valore viene ripulito: un numero fuori dai limiti va al limite, una scelta che non c'è torna a quella di serie, un testo è tagliato a 4000 caratteri. |
| `…children` | Solo nei contenitori: le componenti dentro, in ordine. |
| `…layout` | Solo dentro un'**Area libera**: `x`, `y` (e, facoltativi, `w`, `h`) in pixel, da 0 a 10000. |
| `…added` | Le porte aggiunte di una componente che le prevede: `{ "inputs": [{ "id": "x1", "name": "serra" }], "outputs": [] }`. |

Cosa succede con un file vecchio o rovinato: una componente senza id valido o con un id ripetuto ne riceve uno nuovo (attenzione: un oggetto in uno schema che la cercava con il vecchio id non la trova più); una componente oltre 32 livelli di contenitori sparisce; un `root` mancante diventa una Colonna vuota; una componente di un pacchetto non installato si vede come un riquadro con il suo tipo. Il motore conta **tutte** le componenti, contenitori e `root` compresi, per il limite di 200.

## L'app: `.lsapp` e `lilos.json`

Il file `.lsapp` dice dove sono il manifesto e il progetto, relativi alla cartella dell'app:

```json
{
  "format": "lilos-lsapp/1",
  "manifest": "lilos.json",
  "project": "project/Serra.lsproj"
}
```

Il manifesto `lilos.json` che scrive **Crea app…**:

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

E `locales.json` ha l'inglese (`@name`, `@description`) più le traduzioni di `texts` del progetto. Vedi [Fare un'app](ide/create-app).

## Esempi

### 1. Scrivere a mano uno schema minimo

Crea con un editor di testo il file `ciao.lsch`:

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

Aprilo con Logic Studio IDE: è uno schema da solo. Premi **Prova**: la console scrive `Ciao!`. Il motore dà alle impostazioni che mancano il loro valore di serie (per il blocco Costante · Variabile, niente collegato a **invia**: manda il valore all'avvio). Attenzione: le **Proprietà** dell'IDE mostrano vuote, o non spuntate, le impostazioni che nel file mancano, anche se il motore usa il valore di serie. I campi `ports`, `config`, `notes` e `view` vengono scritti la prima volta che salvi una modifica.

### 2. Aggiungere una traduzione

Nel `.lsproj` di un progetto scritto in italiano, aggiungi:

```json
"texts": {
  "en": { "Saluta": "Say hello", "Il tuo nome": "Your name" }
}
```

Chi apre le finestre con lilOS in inglese vede «Say hello» al posto di «Saluta».

### 3. Spostare uno schema in una sottocartella senza l'IDE

Se sposti `schemi/main.lsch` in `schemi/vecchi/main.lsch` con il File Manager, alla prossima apertura l'IDE toglie `main` (il file non c'è più dove dice il progetto) e aggiunge `main` con il nuovo percorso. I collegamenti della mappa che usavano `main:…` restano validi perché il nome non cambia. Salva per scriverlo nel `.lsproj`.

## Vedi anche

- [Progetti](ide/projects)
- [Fare un'app](ide/create-app)
- [Come funziona un blocco](ide/blocks)
