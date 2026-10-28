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
node scripts/vendor-tree-sitter.mjs   # aggiorna le grammatiche Tree-sitter in public/tree-sitter/
```

Le dipendenze dell'Editor caricate al bisogno (e quelle usate solo nei worker) sono elencate in `optimizeDeps.include` di `vite.config.js`: così il server di sviluppo le prepara all'avvio invece di scoprirle una alla volta e ricaricare la pagina. Se ne aggiungi una, aggiungila anche lì.

Dopo aver modificato `vite.config.js` (o se lo crei) riavvia `npm run dev`: un server già avviato non vede un file di configurazione creato dopo il suo avvio, e la pagina dà errore 500 su `src/main.js`.

Non ci sono dipendenze a runtime: solo Vite come strumento di sviluppo. Il codice è JavaScript moderno (moduli ES, campi privati `#`) senza framework e senza TypeScript.

In sviluppo `window.lilos` espone `{ bus, canvas, desktop, taskbar, wm, workareas, workspaces, settings, shortcuts, fs, history }` per provare le API dalla console del browser:

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
    tags.js             tag colorati da mettere su file e cartelle; i tag invisibili nascondono i loro elementi
    history.js          UndoStack e history: annulla e ripeti, per chi ha il focus
    db.js               archivio su IndexedDB per il contenuto dei file (interno)
    fileTypes.js        nome ed estensione; tipo, colore ed etichetta dall'estensione
  ui/                   componenti riutilizzabili
    icons.js            simboli SVG e logo
    ContextMenu.js      menu a comparsa
    toast.js            breve messaggio in basso
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
  systemTrash.js        pulizia automatica del cestino (`setupTrash`)
  systemHistory.js      scorciatoie Ctrl Z / Ctrl Y, messaggi e voci di menu dell'annulla e ripeti
  systemFs.js           cartelle di sistema, riempimento al primo avvio, migrazione della vecchia scrivania
  items/
    targets.js          comandi sugli elementi (Apri, Rinomina, Elimina…) comuni a desktop e File
    confirmRemove.js    eliminare come dicono le impostazioni: cestino o definitivo, con o senza conferma
    fsHistory.js        azioni sul file system che finiscono in una cronologia (elimina, ripristina, crea, rinomina, sposta)
    itemDrag.js         trascinamento di file e cartelle, uguale in ogni vista (`markItem`, `dropZone`, `dragItems`)
    links.js            ordine della barra laterale di File: voci fisse e collegamenti (`links`, `linkEntry`)
  tags/
    tagUi.js            pallini dei tag, mettere e togliere un tag, sottomenu Tag dei menu
  canvas/               la scrivania infinita
    Canvas.js           camera (spostamento e zoom), oggetti in coordinate mondo
    Minimap.js          mappa in miniatura cliccabile
    Hud.js              pannello con minimappa e controlli dello zoom
  desktop/              elementi sulla scrivania
    Desktop.js          selezione, trascinamento, rinomina, elimina, menu, salvataggio
    DesktopItem.js      un singolo elemento (cartella, file, app)
    itemIcons.js        icone grandi di cartelle, file e workarea
    seed.js             elementi della Scrivania al primo avvio
  apps/
    registry.js         elenco delle app, quali sono installate nel workspace attuale, launch()
    launcher.js         da app:launch a finestre: carica l'app e la apre
    settings/
      SettingsApp.js    l'app Impostazioni
    files/
      FilesApp.js       l'app File (File Manager)
      files.css         i suoi stili
    editor/
      EditorApp.js      l'app Editor
      highlight.js      evidenziazione per linguaggio
      complete.js       suggerimenti interni (quando non c'è un language server)
      lang/             linguaggi, motori (Tree-sitter, TextMate, semplice), impostazioni
      lsp/              client LSP, server nei worker (JSON, CSS, HTML), conversioni
      EditorSettings.js finestra Impostazioni dell'Editor
      FileTree.js       pannello a destra con la cartella aperta
      editor.css        i suoi stili
    filePicker.js       finestra per scegliere un file o una cartella di lilOS
    open.js             quale app apre quale tipo di file
    openWith.js         finestra "Apri con"
    commands.js         scorciatoie delle app dichiarate nel registro
  workareas/            aree della scrivania che tengono insieme icone e finestre
    Workareas.js        gestore: appartenenza, workarea attuale, ridurre a icona, riaprire, spostare
    WorkareaFrame.js    il DOM di un'area: barra del titolo e bordi
    store.js            salvataggio in lilos:ws:<id>:workareas, validazione, limiti
    properties.js       finestra delle proprietà (titolo, descrizione, metadati)
  workspaces/           scrivanie separate
    Workspaces.js       gestore: elenco, cambio, creazione, eliminazione, app installate, finestre ricordate
    WorkspaceSwitcher.js pulsante nella barra (colore e nome) e suo menu
    setup.js            avvio: carica l'elenco, migra i dati di prima dei workspace, ripara
    store.js            salvataggio in lilos:workspaces, validazione, limiti, chiavi lilos:ws:<id>:…
    info.js             cosa le app possono sapere dei workspace (nome e colore di un proprietario)
  windows/
    WindowManager.js    finestre sulla scrivania: posizione, focus, trascinamento, barra, workspace di ogni finestra
  taskbar/
    Taskbar.js          pulsante logo, area finestre, utente e orologio (il pulsante workspace lo aggiunge Workspaces)
    StartMenu.js        menu di avvio con ricerca
    Clock.js            data e ora
  styles/               stili del sistema, uno per area
    canvas.css          scrivania, HUD, minimappa
    desktop.css         elementi del desktop
    workareas.css       aree, barra del titolo, finestra delle proprietà
    workspaces.css      pulsante nella barra, finestre nascoste, pallino del proprietario
    tags.css            pallini dei tag sulle icone e nell'elenco di File
    taskbar.css         barra in basso
    start-menu.css      menu di avvio
```

## Architettura

### Avvio

`src/main.js` importa i CSS e crea i componenti in quest'ordine:

```
setupFileSystem()     cartelle di sistema condivise (Documenti, Immagini, Download)
setupWorkspaces(…)    carica i workspace, migra e ripara, imposta quello attuale in fs
Canvas(root, { key }) la scrivania, a tutto schermo sopra la barra; camera del workspace attuale
createHud(canvas)     pannello in basso a destra
Desktop(canvas, desk, layoutKey)  gli elementi della scrivania del workspace attuale
Taskbar(root)         barra in basso, che crea a sua volta lo StartMenu
WindowManager(…)      finestre sulla scrivania e pulsanti nella barra
connectLauncher(wm)   apre le app quando arriva app:launch (e riapre quelle salvate: restore)
Workareas(…, { key }) aree della scrivania: usa canvas, desktop, wm e launcher
Workspaces(…)         cambio di workspace, pulsante nella barra; riapre le finestre salvate fuori dalle workarea
```

Il file system si prepara prima di tutto il resto: `setupWorkspaces` deve girare quando nessun workspace è ancora impostato in `fs` (tutto è visibile), perché assegna proprietari e crea le scrivanie.

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

- Le cartelle di sistema condivise (Documenti, Immagini, Download) sono create da `setupFileSystem()` (`src/systemFs.js`); la cartella Scrivania è creata per ogni workspace da `setupWorkspaces()`. Nessuna di queste si può rinominare né eliminare.
- La **scrivania è la vista della cartella `/Scrivania` del workspace attuale**: il `Desktop` crea, rinomina ed elimina tramite `fs` e si aggiorna sugli eventi `change`. Le posizioni sono salvate a parte, in `lilos:ws:<id>:desktop-layout`.
- L'app **File** è un'altra vista dello stesso albero: quello che cambia da una parte si vede subito nell'altra.
- I comandi Apri, Rinomina, Elimina, Seleziona tutto e Togli la selezione sono comuni: `src/items/targets.js` li registra una volta e li esegue sulla vista attiva (il desktop se nessuna finestra ha il focus, altrimenti la finestra File attiva).

### Trascinare file e cartelle tra le viste

Scrivania, app File e pannello dell'Editor trascinano file e cartelle con lo stesso modulo, `src/items/itemDrag.js`, senza conoscersi: una vista marca i suoi elementi (`markItem`, attributo `data-node`), registra le aree che accettano rilasci (`dropZone`) e avvia il trascinamento su `pointerdown` (`dragItems`). Il bersaglio si cerca nel DOM sotto il puntatore, e lo spostamento (`moveNodes`) è un solo passo nella cronologia della vista da cui si parte. L'ordine della barra laterale di File, con i collegamenti, è in `src/items/links.js`. Perché è fatto così: [D30](../interna/decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle). Per usarlo in una vista nuova: [ricette](ricette.md#rendere-trascinabili-file-e-cartelle-in-unapp), contratti in [api.md](api.md#itemdragjs).

### Annulla e ripeti

Ogni posto che ha azioni da annullare tiene una `UndoStack` e la collega a un suo elemento con `history.attach` (SDK): la scrivania è la cronologia **radice** (`desktop.history`), ogni finestra File ha la sua, il pannello della cartella dell'Editor la sua, il testo dell'Editor usa quella del browser. Ctrl Z e Ctrl Y (registrati da `src/systemHistory.js`) non sanno chi li riceve: `history.resolve()` parte dall'elemento con il focus e sale tra i genitori fino al primo con un gestore. Senza focus vale la finestra attiva; una finestra senza cronologia (Impostazioni) non fa nulla, e non tocca la scrivania dietro; senza finestra attiva vale la scrivania. Nei campi di testo Ctrl Z resta al browser, salvo gestori con `text: true`. Eliminare è annullabile perché di norma sposta nel cestino (`fs.trash`, annullare è `fs.untrash`, vedi [D28](../interna/decisioni.md#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system)); con l'eliminazione definitiva `fs.snapshot` copia i nodi e i contenuti prima di `fs.remove`. Le cronologie stanno solo in memoria. Dettagli in [api.md](api.md#sdkcorehistoryjs) e [ricette](ricette.md#aggiungere-annulla-e-ripeti-a-unapp).

### Aprire i file

Un file si apre con l'app associata alla sua estensione (se è installata nel workspace attuale; altrimenti compare "Apri con", che propone solo le app installate): le app dichiarano nel registro le estensioni che aprono (`opens`), l'utente cambia le associazioni in Impostazioni → Usabilità → Tipi di file. Senza app associata compare la finestra "Apri con" (`src/apps/openWith.js`). Tutto passa da `openFile(node)` in `src/apps/open.js`, usato da `main.js` (per `item:open`) e dall'app File. L'app riceve `args.file`.

Le scorciatoie di un'app sono dichiarate nel registro (`commands`) e registrate all'avvio, così compaiono nelle Impostazioni anche prima di aprire l'app; la finestra dell'app fornisce il gestore con `handleCommand`.

### Editor: linguaggi

L'evidenziazione ha tre motori, scelti per linguaggio: **Tree-sitter** (WebAssembly; grammatiche in `public/tree-sitter/`), **TextMate** (Shiki con espressioni regolari JavaScript) e il **semplice** di `highlight.js`. Suggerimenti ed errori arrivano da un **Language Server** (protocollo LSP): JSON, CSS e HTML girano nel browser in Web Worker; per altri linguaggi si può collegare un server esterno via WebSocket. Senza server, l'Editor usa i suoi vocabolari (`complete.js`). Tutto è caricato solo quando serve: chi non apre l'Editor non scarica nulla di questo.

### Workarea

Una workarea (`src/workareas/`) è un rettangolo della scrivania con un titolo. Non possiede nulla: **l'appartenenza è geometrica**. Un elemento del desktop o una finestra appartiene alla workarea aperta che contiene il suo centro, quindi spostarlo dentro o fuori, o ridimensionare l'area, cambia il contenuto senza altro lavoro. Le workarea aperte non si sovrappongono.

L'area è un oggetto del canvas (`.wa-area.obj`, messo sotto tutto il resto) che lascia passare il puntatore: solo barra del titolo e bordi lo prendono, dentro i clic arrivano alla scrivania, quindi selezione, menu e finestre funzionano come ovunque. Trascinare la barra sposta l'area con elementi e finestre.

`Workareas` tiene anche la **workarea attuale** (l'ultima in cui l'utente ha fatto clic o la cui finestra ha il focus) e restringe ad essa le richieste: `Desktop.scopeItems()` per Seleziona tutto, il riordino e il rettangolo di selezione, `canvas.fitScope` per Mostra tutto, `setLaunchScope()` del launcher per le app (una finestra per app per ambito, aperta dentro l'area).

Ridotta a icona, una workarea chiede a ogni finestra `canClose`, salva lo stato delle finestre delle app (`Window.getState`, posizione, dimensione, ridotta o no), le chiude, nasconde gli elementi e mette sulla scrivania un `DesktopItem` con `workarea` impostato, che non è un nodo del file system. Riaprendola, `launcher.restore()` ricrea le finestre. Lo stato delle finestre delle workarea aperte viene salvato anche mentre si lavora, per sopravvivere al ricaricamento. Vedi [Workarea](api.md#workareas) e la decisione D25.

### Workspace

Un workspace (`src/workspaces/`) è una scrivania separata: ha la sua cartella Scrivania, la sua vista, le posizioni degli elementi, le workarea, le finestre aperte e le app installate. Documenti, Immagini e Download sono condivise. Vedi la decisione D27.

- **L'isolamento sta in `fs`.** La Scrivania di un workspace è una cartella `private` con `workspace` = id del proprietario. Con `fs.setWorkspace(id)` impostato, `fs` fa finta che le cartelle private degli altri workspace (e tutto ciò che contengono) non esistano: File, selettori e pannello dell'Editor rispettano l'isolamento senza saperlo. Ogni nodo creato porta `workspace` (chi l'ha fatto), che non cambia se lo si sposta o rinomina; le cartelle di sistema condivise non hanno proprietario. Le viste che mostrano il proprietario (la colonna Workspace di File) usano `describeWorkspace` di `src/workspaces/info.js`.
- **Cambiare workspace** (`Workspaces.switchTo`) salva il workspace lasciato (finestre, workarea, posizioni, vista), poi cambia in quest'ordine `fs.setWorkspace`, `wm.setWorkspace`, `canvas.useCamera`, `desktop.load`, `workareas.load`. Le finestre del workspace lasciato **restano aperte e nascoste** (classe `ws-away`), con il testo non salvato; ogni finestra appartiene al workspace che era attuale quando è stata aperta. I cambi sono messi in coda e uno alla volta.
- **App installate per workspace.** Il registro sa quali app sono `system` (File, Impostazioni: sempre installate) e chiede a un filtro (`setInstalledFilter`, impostato da `Workspaces`) quali sono installate nel workspace attuale. Menu di avvio, `launch` e "Apri con" lo rispettano. Le associazioni dei tipi di file restano globali; preferenze, tema, scorciatoie e menu sono globali.
- **Finestre ricordate.** Le finestre delle app fuori da ogni workarea sono salvate per workspace in `lilos:ws:<id>:windows` (400 ms dopo ogni cambiamento e alla chiusura della pagina) e riaperte la prima volta che il workspace viene mostrato nella sessione.
- **Eliminare** non cancella mai file: la Scrivania diventa `/Documenti/Scrivania di <nome>` (rimossa se vuota), le finestre delle app passano nel workspace attuale (`wm.adopt`), quelle secondarie (selettori, proprietà delle workarea…) si chiudono, e nell'elenco salvato resta una voce "rimossa" perché i file creati da quel workspace dicano ancora di chi erano.
- **Avvio e migrazione**: `setupWorkspaces` fa nascere "Principale" dai dati di prima dei workspace e ripara elenco e scrivanie. Dettagli in [Dati salvati](api.md#lilosworkspaces).

### Tag

I tag (`tags` dell'SDK, `sdk/core/tags.js`) sono etichette colorate con un nome, uguali in tutti i workspace. Vedi la decisione D29.

- **Le definizioni stanno nell'SDK, l'assegnazione sui nodi.** Un nodo ha `tags` (id dei tag); si cambia con `fs.setTags`. `fs.tagged(id)` dà tutti gli elementi con un tag, ovunque il workspace attuale veda.
- **Invisibile significa nascosto.** `tags` comunica a `fs` i tag invisibili (`fs.setHiddenTags`, all'avvio e a ogni cambio). `fs.children()` esclude i nodi che ne hanno uno: è l'unico punto, quindi scrivania, File, selettore, pannello dell'Editor e conteggi lo rispettano senza saperlo. `get`, `exists`, `resolve` e `tagged` li trovano ancora, così le finestre aperte e la vista del tag continuano a funzionare.
- **Chi mostra elenchi** deve ascoltare `fs` `scope` (cambia ciò che è visibile: un altro workspace o i tag nascosti) oltre a `change`, e `tags` `change` per nomi e colori. La scrivania si riallinea da sola (`#reconcile`).
- **L'interfaccia** sta in `src/tags/tagUi.js` (pallini, `setTag`, sottomenu Tag); la gestione in Impostazioni → Tag, la ricerca nella vista del tag di File (`launch('files', { tag })`).

### Menu configurabili

Il menu del tasto destro sulla scrivania non è scritto nel codice del desktop: il desktop dichiara azioni e disposizione predefinita nel registro `menus` dell'SDK, e l'utente la cambia nelle Impostazioni. Per un nuovo menu configurabile: `menus.defineAction`, `menus.register`, `openMenu(x, y, menus.build(id, ctx))`.

### Temi

`<html data-theme="dark" | "light">` (impostazione `theme`) cambia i token di `sdk/styles/tokens.css`. Gli stili devono usare solo token, mai colori fissi: un colore scritto a mano resta uguale in entrambi i temi.

### Finestre

La cornice (`Window`) sta nell'SDK e non sa nulla della scrivania: mostra titolo, controlli e maniglie di ridimensionamento e segnala le richieste (`minimize`, `maximize`, `close`). Ogni controllo e ogni bordo si accende e si spegne da solo (`controls`, `resizable`, `setControl`, `setResizable`). Il `WindowManager` del sistema le ospita sulla scrivania e decide: posizione, focus, trascinamento, ridimensionamento dai bordi attivi, pulsante nella barra, e rispetta i controlli spenti anche nella barra, nel doppio clic sul titolo e nelle scorciatoie.

Un'app è un modulo caricato al primo avvio (`load` nel registro). Il suo export predefinito riceve `{ args }` e restituisce una `Window`. Ogni app ha al massimo una finestra: avviarla di nuovo riporta in primo piano quella aperta ed emette su di essa l'evento `launch` con i nuovi argomenti (così il doppio clic su un'altra cartella la mostra nella finestra File già aperta).

Quando una finestra ha il focus, le scorciatoie del desktop (Canc, Invio, F2, Ctrl A, Esc) sono disattivate. Un clic su un punto della scrivania fuori dalle finestre restituisce il focus al desktop.

### Persistenza

`storage` dell'SDK salva JSON su `localStorage` con prefisso `lilos:`. Non lancia mai eccezioni: se lo storage è bloccato o pieno, lilOS continua a funzionare in memoria.

| Chiave | Contenuto | Scritta da |
| --- | --- | --- |
| `lilos:workspaces` | `{ current, list }`: i workspace (nome, colore, cartella Scrivania, app installate) | `Workspaces`, a ogni modifica |
| `lilos:ws:<id>:camera` | `{ x, y, s }` della vista del workspace | `Canvas`, 300 ms dopo l'ultimo movimento |
| `lilos:fs` | tutti i nodi del file system | `fs`, a ogni modifica |
| `lilos:tags` | i tag: `{ id, name, color, visible }` (i tag messi sui nodi sono nel campo `tags` di `lilos:fs`) | `tags`, a ogni modifica |
| `lilos:ws:<id>:desktop-layout` | posizioni sulla scrivania, `{ id: [x, y] }` | `Desktop`, dopo spostamenti e creazioni |
| `lilos:ws:<id>:windows` | finestre delle app fuori dalle workarea, da riaprire | `Workspaces`, 400 ms dopo ogni cambiamento |
| `lilos:ws:<id>:workareas` | workarea: area, titolo, descrizione, metadati, elementi nascosti e finestre da riaprire | `Workareas`, a ogni modifica; le finestre 400 ms dopo ogni cambiamento |
| `lilos:files-view` | vista dell'app File (`"list"` o `"grid"`) | app File |
| `lilos:file-apps` | app scelte per i tipi di file | `setAppFor` (Impostazioni, Apri con) |
| `lilos:files-sidebar` | ordine della sezione Collegamenti della barra laterale di File: id di nodi (voci fisse e collegamenti) e la chiave `desk`; al massimo 80, uguali in ogni workspace | `links` |
| `lilos:editor-tree` | cartella aperta nell'Editor, cartelle espanse, larghezza del pannello | `FileTree` (Editor) |
| IndexedDB `lilos` → `contents` | contenuto dei file | `fs.write` |
| `lilos:settings` | oggetto con le impostazioni | `settings`, a ogni cambiamento |
| `lilos:shortcuts` | combinazioni personalizzate | `shortcuts`, a ogni modifica |

Dettagli in [Riferimento API → Dati salvati](api.md#dati-salvati).
