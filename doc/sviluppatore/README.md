# Documentazione per sviluppatori

Come è fatto lilOS e come si estende.

- **Questa pagina**: avvio, struttura dei file, architettura.
- [Riferimento API](api.md): cosa esporta ogni modulo, eventi, dati salvati.
- [Ricette](ricette.md): passo per passo per i casi più comuni (nuova app, nuovo oggetto sulla scrivania, nuova voce di menu…).
- [Convenzioni](convenzioni.md): stile del codice, CSS, sicurezza, accessibilità, lingua.

## Avvio

Serve Node.js (versione supportata da Vite 8).

```bash
npm install
npm run dev       # server di sviluppo su http://localhost:5173
npm run build     # build di produzione in dist/
npm run preview   # serve dist/ su http://localhost:4173
```

Dopo aver modificato `vite.config.js` (o se lo crei) riavvia `npm run dev`: un server già avviato non vede un file di configurazione creato dopo il suo avvio, e la pagina dà errore 500 su `src/main.js`.

Non ci sono dipendenze a runtime: solo Vite come strumento di sviluppo. Il codice è JavaScript moderno (moduli ES, campi privati `#`) senza framework e senza TypeScript.

In sviluppo `window.lilos` espone `{ bus, canvas, desktop, taskbar, wm, settings, shortcuts, fs }` per provare le API dalla console del browser:

```js
lilos.canvas.animateTo(0, 0, 2)
lilos.bus.on('app:launch', console.log)
lilos.desktop.arrange()
lilos.settings.set('accent', '#30a46c')
lilos.shortcuts.list()
lilos.fs.children(lilos.fs.resolve('/Scrivania').id)
```

Per ripartire dalla scrivania iniziale: `localStorage.clear()` e ricarica.

## Struttura

Il codice è diviso in due parti:

- **`sdk/`**: l'SDK, cioè le basi riutilizzabili (utilità, eventi, salvataggio, componenti dell'interfaccia e i loro stili). Si importa come `@lilos/sdk`. Non dipende da nient'altro nel repository.
- **`src/`**: il sistema (scrivania, desktop, barra, menu di avvio), costruito sull'SDK.

```
index.html              shell: font, favicon, #app, script principale
vite.config.js          collega il nome @lilos/sdk alla cartella sdk/
jsconfig.json           lo stesso collegamento per l'editor
public/favicon.svg      logo
design/
  mockup.html           mockup statico di riferimento per finestre e app
  settings-window.html  render approvato della finestra base delle impostazioni
sdk/                    @lilos/sdk (vedi sdk/README.md)
  index.js              unico punto d'ingresso: tutti gli export pubblici
  package.json          nome, versione, export
  core/                 utilità senza interfaccia
    dom.js              h(), svg(), isEditing(), trackDrag()
    events.js           Emitter e bus di sistema
    storage.js          persistenza JSON su localStorage, uid()
    session.js          utente e lingua correnti
    settings.js         preferenze con valori predefiniti e tipi controllati
    shortcuts.js        scorciatoie da tastiera: comandi e combinazioni modificabili
    fs.js               file system virtuale: albero di cartelle, file e collegamenti
    db.js               archivio su IndexedDB per il contenuto dei file (interno)
    fileTypes.js        nome ed estensione; tipo, colore ed etichetta dall'estensione
  ui/                   componenti riutilizzabili
    icons.js            simboli SVG e logo
    ContextMenu.js      menu a comparsa
    avatar.js           iniziali dell'utente
    appIcon.js          riquadro colorato con il simbolo di un'app
    controls.js         controlli dei moduli (interruttore, menu, segmenti, colori…)
    shortcutField.js    editor delle combinazioni di un comando
    selectionGesture.js selezione trascinando: rettangolo o percorso libero
    Window.js           cornice di una finestra
    SettingsView.js     impaginazione a tab delle impostazioni
    SettingsWindow.js   base di ogni finestra di impostazioni
  styles/
    index.css           importa i file seguenti: è @lilos/sdk/styles.css
    tokens.css          colori, raggi, ombre, font, altezza della barra
    base.css            reset e classi di base (.ico, .logo)
    components.css      app-icon, avatar, menu
    controls.css        controlli dei moduli
    window.css          cornice delle finestre
    settings.css        impaginazione delle impostazioni
src/
  main.js               bootstrap: importa gli stili, monta canvas, HUD, desktop, taskbar, finestre
  systemSettings.js     impostazioni del sistema: valori predefiniti, applicazione, modo di selezione
  systemFs.js           cartelle di sistema, riempimento al primo avvio, migrazione della vecchia scrivania
  items/
    targets.js          comandi sugli elementi (Apri, Rinomina, Elimina…) comuni a desktop e File
    confirmRemove.js    eliminazione con conferma per le cartelle non vuote
  canvas/               la scrivania infinita
    Canvas.js           camera (spostamento e zoom), oggetti in coordinate mondo
    Minimap.js          mappa in miniatura cliccabile
    Hud.js              pannello con minimappa e controlli dello zoom
  desktop/              elementi sulla scrivania
    Desktop.js          selezione, trascinamento, rinomina, elimina, menu, salvataggio
    DesktopItem.js      un singolo elemento (cartella, file, app)
    itemIcons.js        icone grandi di cartelle e file
    seed.js             elementi della Scrivania al primo avvio
  apps/
    registry.js         elenco delle app e launch()
    launcher.js         da app:launch a finestre: carica l'app e la apre
    settings/
      SettingsApp.js    l'app Impostazioni
    files/
      FilesApp.js       l'app File (File Manager)
      files.css         i suoi stili
    editor/
      EditorApp.js      l'app Editor
      highlight.js      evidenziazione per linguaggio
      editor.css        i suoi stili
    open.js             quale app apre quale tipo di file
    openWith.js         finestra "Apri con"
    commands.js         scorciatoie delle app dichiarate nel registro
  windows/
    WindowManager.js    finestre sulla scrivania: posizione, focus, trascinamento, barra
  taskbar/
    Taskbar.js          pulsante logo, area finestre, utente e orologio
    StartMenu.js        menu di avvio con ricerca
    Clock.js            data e ora
  styles/               stili del sistema, uno per area
    canvas.css          scrivania, HUD, minimappa
    desktop.css         elementi del desktop
    taskbar.css         barra in basso
    start-menu.css      menu di avvio
```

## Architettura

### Avvio

`src/main.js` importa i CSS e crea i componenti in quest'ordine:

```
Canvas(root)          la scrivania, a tutto schermo sopra la barra
createHud(canvas)     pannello in basso a destra
Desktop(canvas)       carica gli elementi salvati (o quelli di esempio) e li aggiunge al canvas
Taskbar(root)         barra in basso, che crea a sua volta lo StartMenu
WindowManager(…)      finestre sulla scrivania e pulsanti nella barra
connectLauncher(wm)   apre le app quando arriva app:launch
```

Prima di tutto `main.js` importa `systemSettings.js`, che dichiara le impostazioni e applica quelle globali (colore principale, animazioni). Poi collega le altre: `snap` al desktop, `minimap` all'HUD, e il focus delle finestre alle scorciatoie del desktop.

Ogni componente crea il proprio DOM, lo aggiunge alla pagina e registra i propri listener. Non c'è uno store globale: lo stato vive nei componenti, e quello che deve sopravvivere al ricaricamento passa da `storage`.

### Livelli

```
document.body
├─ #app
│  ├─ .canvas            position: fixed, sopra la barra
│  │  └─ .world          trasformato dalla camera: translate(x, y) scale(s)
│  │     ├─ .ditem.obj   elementi del desktop (z-index 1, 1000 mentre si trascinano)
│  │     └─ .window.obj  finestre (z-index da 100, in ordine di sovrapposizione)
│  ├─ .hud               z-index 8000
│  └─ .taskbar           z-index 9000
├─ .start-menu           z-index 9500
└─ .menu                 z-index 9600 (al massimo uno)
```

`.world` ha una `transform`, quindi crea un proprio contesto di sovrapposizione: gli `z-index` degli oggetti sulla scrivania valgono solo tra loro e non interferiscono con HUD, barra e menu.

### Coordinate

Ci sono due sistemi di coordinate:

- **Schermo**: pixel del viewport (`clientX`, `clientY` degli eventi).
- **Mondo**: posizione degli oggetti sulla scrivania, in pixel a zoom 100%.

La camera `{ x, y, s }` lega i due: `schermo = mondo × s + (x, y)`, misurato dall'angolo in alto a sinistra del canvas. Per convertire un punto dello schermo usa `canvas.toWorld(clientX, clientY)`. Per sapere quale parte del mondo è visibile usa `canvas.viewRect()`.

Gli oggetti si posizionano con `left` e `top` in coordinate mondo. Il canvas li misura con `offsetLeft`, `offsetTop`, `offsetWidth` e `offsetHeight`, che non risentono della trasformazione. Per questo un oggetto **non deve** posizionarsi con `transform`, altrimenti minimappa, "Mostra tutto" e `rectOf()` lo vedrebbero nel punto sbagliato.

Durante un trascinamento lo spostamento dello schermo va diviso per lo zoom: `mondo += delta / canvas.cam.s`.

### Input

Il canvas ascolta `pointerdown` **in fase di cattura**. Avvia uno spostamento della vista, e blocca l'evento, quando:

- si preme il tasto centrale ovunque;
- è premuto Spazio;
- su uno schermo touch, un dito si appoggia su un punto vuoto.

Il tasto sinistro su un punto vuoto (nessun antenato `.obj`) **non** sposta la vista: il canvas emette `background:press` e, se il puntatore non si muove, `background:click`. Il desktop usa `background:press` per il rettangolo di selezione e la selezione a mano libera (`selectionGesture` dell'SDK; il modo dipende dai modificatori, vedi `selectionMode` in `systemSettings.js`).

In tutti gli altri casi l'evento arriva all'oggetto sotto il puntatore, che lo gestisce come vuole (gli elementi del desktop avviano la selezione e il trascinamento).

Il menu contestuale del browser è disattivato su tutta la scrivania; il canvas emette `background:contextmenu` solo se nessun oggetto ha già gestito l'evento (`defaultPrevented`).

La rotella fa zoom ovunque, tranne sugli elementi con `data-wheel="native"` (o loro discendenti), dove scorre normalmente. Ctrl + rotella fa sempre zoom.

Tastiera: le scorciatoie passano tutte dal registro `shortcuts` dell'SDK. Ogni componente registra i propri comandi (con `when` per dire quando sono attivi) e un solo listener su `window` li esegue; l'utente cambia le combinazioni dall'app Impostazioni. Restano fuori dal registro solo i tasti di navigazione (frecce, Invio ed Esc nei menu e nei tab, Spazio + trascina). Il menu contestuale, il menu di avvio e la rinomina, quando sono attivi, fermano la propagazione dei tasti e così "possiedono" la tastiera.

### Comunicazione

I componenti si parlano in due modi:

- **Eventi del componente**: `Canvas` estende `Emitter` ed emette `camera`, `change`, `background:press`, `background:click` e `background:contextmenu`. La minimappa ascolta `change`, il desktop gli eventi `background:*`.
- **Bus di sistema** (`bus` dell'SDK): per le richieste che attraversano il sistema. Oggi `app:launch` (avviare un'app) e `item:open` (aprire una cartella o un file). Chi li emette non sa chi li gestirà: `app:launch` lo gestisce `connectLauncher`; `item:open` di una cartella la apre nell'app File, di un file per ora viene solo scritto in console.
- **Impostazioni** (`settings` dell'SDK): chi dipende da una preferenza la segue con `settings.watch(key, fn)`.

### File system

Cartelle, file e collegamenti alle app sono nodi del file system virtuale `fs` dell'SDK, un albero con radice `root` salvato in `lilos:fs`. Il contenuto dei file sta in IndexedDB (`fs.read` / `fs.write`, asincroni).

- Le cartelle di sistema (Scrivania, Documenti, Immagini, Download) sono create da `setupFileSystem()` (`src/systemFs.js`) e non si possono rinominare né eliminare.
- La **scrivania è la vista della cartella `/Scrivania`**: il `Desktop` crea, rinomina ed elimina tramite `fs` e si aggiorna sugli eventi `change`. Le posizioni sono salvate a parte, in `lilos:desktop-layout`.
- L'app **File** è un'altra vista dello stesso albero: quello che cambia da una parte si vede subito nell'altra.
- I comandi Apri, Rinomina, Elimina, Seleziona tutto e Togli la selezione sono comuni: `src/items/targets.js` li registra una volta e li esegue sulla vista attiva (il desktop se nessuna finestra ha il focus, altrimenti la finestra File attiva).

### Aprire i file

Un file si apre con l'app associata alla sua estensione: le app dichiarano nel registro le estensioni che aprono (`opens`), l'utente cambia le associazioni in Impostazioni → Usabilità → Tipi di file. Senza app associata compare la finestra "Apri con" (`src/apps/openWith.js`). Tutto passa da `openFile(node)` in `src/apps/open.js`, usato da `main.js` (per `item:open`) e dall'app File. L'app riceve `args.file`.

Le scorciatoie di un'app sono dichiarate nel registro (`commands`) e registrate all'avvio, così compaiono nelle Impostazioni anche prima di aprire l'app; la finestra dell'app fornisce il gestore con `handleCommand`.

### Finestre

La cornice (`Window`) sta nell'SDK e non sa nulla della scrivania: mostra titolo, controlli e maniglie di ridimensionamento e segnala le richieste (`minimize`, `maximize`, `close`). Ogni controllo e ogni bordo si accende e si spegne da solo (`controls`, `resizable`, `setControl`, `setResizable`). Il `WindowManager` del sistema le ospita sulla scrivania e decide: posizione, focus, trascinamento, ridimensionamento dai bordi attivi, pulsante nella barra, e rispetta i controlli spenti anche nella barra, nel doppio clic sul titolo e nelle scorciatoie.

Un'app è un modulo caricato al primo avvio (`load` nel registro). Il suo export predefinito riceve `{ args }` e restituisce una `Window`. Ogni app ha al massimo una finestra: avviarla di nuovo riporta in primo piano quella aperta ed emette su di essa l'evento `launch` con i nuovi argomenti (così il doppio clic su un'altra cartella la mostra nella finestra File già aperta).

Quando una finestra ha il focus, le scorciatoie del desktop (Canc, Invio, F2, Ctrl A, Esc) sono disattivate. Un clic su un punto della scrivania fuori dalle finestre restituisce il focus al desktop.

### Persistenza

`storage` dell'SDK salva JSON su `localStorage` con prefisso `lilos:`. Non lancia mai eccezioni: se lo storage è bloccato o pieno, lilOS continua a funzionare in memoria.

| Chiave | Contenuto | Scritta da |
| --- | --- | --- |
| `lilos:camera` | `{ x, y, s }` | `Canvas`, 300 ms dopo l'ultimo movimento |
| `lilos:fs` | tutti i nodi del file system | `fs`, a ogni modifica |
| `lilos:desktop-layout` | posizioni sulla scrivania, `{ id: [x, y] }` | `Desktop`, dopo spostamenti e creazioni |
| `lilos:files-view` | vista dell'app File (`"list"` o `"grid"`) | app File |
| `lilos:file-apps` | app scelte per i tipi di file | `setAppFor` (Impostazioni, Apri con) |
| IndexedDB `lilos` → `contents` | contenuto dei file | `fs.write` |
| `lilos:settings` | oggetto con le impostazioni | `settings`, a ogni cambiamento |
| `lilos:shortcuts` | combinazioni personalizzate | `shortcuts`, a ogni modifica |

Dettagli in [Riferimento API → Dati salvati](api.md#dati-salvati).
