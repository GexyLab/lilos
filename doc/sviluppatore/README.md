# Documentazione per sviluppatori

Come è fatto lilOS e come si estende.

- **Questa pagina**: avvio, struttura dei file, architettura.
- [Riferimento API](api.md): cosa esporta ogni modulo, eventi, dati salvati.
- [Ricette](ricette.md): passo per passo per i casi più comuni (nuova app, nuovo oggetto sulla scrivania, nuova voce di menu…).
- [Convenzioni](convenzioni.md): stile del codice, CSS, sicurezza, accessibilità, lingua.

## Avvio

Serve Node.js (versione supportata da Vite 8; il kernel richiede la 22 o più recente).

```bash
npm install
npm run dev       # server di sviluppo su http://localhost:5173
npm run build     # build di produzione in dist/
npm run preview   # serve dist/ su http://localhost:4173
```

`npm run dev` e `npm run build` eseguono prima `scripts/host-shims.mjs` (`predev`, `prebuild`), che genera `public/host/sdk.js` e `public/host/system.js`: i moduli che le app di sistema importano al posto di `@lilos/sdk` e `@lilos/system` (vedi [App di sistema](#le-app-di-sistema-e-il-repository-ufficiale)). Se cambi gli export di `sdk/index.js` o di `src/systemApi.js` basta riavviare.

### Il kernel (il backend)

lilOS ha bisogno del suo backend: il sistema non parte senza. Serve Node.js 22 o più recente, il comando `git` e, per il database di sviluppo, Docker.

```bash
npm install
npm run kernel:setup                                    # una volta: le dipendenze dei moduli del kernel (pg, isolated-vm)
npm run db:up                                           # PostgreSQL in Docker su 127.0.0.1:5433 (npm run db:down lo spegne)
npm run kernel:cli -- users-basic add eugenio --admin   # una volta: crea un utente amministratore (chiede la password)
npm run kernel                                          # il kernel su http://127.0.0.1:8790 (lo riavvia da solo quando serve)
npm run dev                                             # lilOS su http://localhost:5173
```

- Il nome utente ha 2-32 caratteri tra lettere minuscole, cifre, punto, trattino e trattino basso; la password da 8 a 256 caratteri. Senza terminale la password si dà con la variabile `LILOS_PASSWORD`. Altri comandi: `passwd <nome>`, `remove <nome>`, `list`.
- `npm run dev` inoltra `/api` a `127.0.0.1:8790` (Vite, `server.proxy`; lo stesso fa `npm run preview`): il browser vede una sola origine, quindi il cookie di sessione funziona.
- **Al primo avvio il kernel ha bisogno di `git` e dell'accesso al repository ufficiale** ([GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official), privato): File Manager, Editor, Sistema e AppStore non sono in questo repository e il kernel le installa da lì, se mancano, prima di mettersi in ascolto. L'accesso è quello che `git` ha già sul computer (credential helper, token, chiave SSH): prova con `git ls-remote https://github.com/GexyLab/lilos-plugins-official`. Senza accesso il kernel parte lo stesso e scrive nel log «App di sistema non installate (…)», ma lilOS non ha File Manager, Sistema né AppStore. Una volta installate, le app restano nel database e non servono più né rete né `git` (finché non si aggiornano o se ne installano altre).
- `npm run kernel` esegue `system/kernel/run.js`: avvia il kernel e lo riavvia quando esce con il codice 75, cioè quando un amministratore installa, aggiorna o toglie un modulo dall'AppStore. Con `node system/kernel/src/main.js` il kernel parte ma non si riavvia da solo (e `POST /api/kernel/restart` risponde che non è possibile).
- La configurazione è `system/kernel/config.json` (o il file in `LILOS_KERNEL_CONFIG`): `host`, `port`, `origins` (siti ammessi per le richieste che modificano), `loopbackOrigins`, `secureCookies`, `modules` e `apps` (`allowLocalSources`, `trustedPublishers`, `officialKey`, `bootstrap`). `LILOS_KERNEL_HOST` e `LILOS_KERNEL_PORT` cambiano indirizzo e porta; `LILOS_PG_URL` l'indirizzo del database (vince su `url` del modulo `fs-postgres`). I repository aggiunti da un amministratore sono in `system/kernel/repos.json` (ignorato da git).
- Se nella configurazione non c'è un modulo di accesso lilOS ha un solo utente e il kernel accetta solo `host` 127.0.0.1.
- All'avvio, se il browser ha dati di prima del kernel (`lilos:*` in `localStorage`), lilOS propone di portarli nel tuo account (solo se la tua cartella è vuota).

Dopo aver modificato `vite.config.js` (o se lo crei) riavvia `npm run dev`: un server già avviato non vede un file di configurazione creato dopo il suo avvio, e la pagina dà errore 500 su `src/main.js`.

Non ci sono dipendenze a runtime: solo Vite come strumento di sviluppo (le dipendenze dell'Editor stanno nel repository ufficiale). Il codice è JavaScript moderno (moduli ES, campi privati `#`) senza framework e senza TypeScript.

In sviluppo `window.lilos` espone `{ bus, canvas, desktop, taskbar, wm, workareas, workspaces, settings, shortcuts, fs, history, kernel }` per provare le API dalla console del browser:

```js
lilos.canvas.animateTo(0, 0, 2)
lilos.bus.on('app:launch', console.log)
lilos.desktop.arrange()
lilos.settings.set('accent', '#30a46c')
lilos.shortcuts.list()
lilos.fs.children(lilos.fs.resolve('/Scrivania').id)
```

Per ripartire dalla scrivania iniziale: Sistema → Archiviazione → «Scrivania e file iniziali», oppure accedi con un utente nuovo. I dati dell'utente stanno nel database del kernel: `localStorage.clear()` non basta.

## Struttura

Il codice è diviso in due parti:

- **`sdk/`**: l'SDK, cioè le basi riutilizzabili (utilità, eventi, salvataggio, componenti dell'interfaccia e i loro stili). Si importa come `@lilos/sdk`. Non dipende da nient'altro nel repository.
- **`src/`**: il sistema (scrivania, desktop, barra, menu di avvio), costruito sull'SDK.

```
index.html              shell: font, favicon, #app, script principale
vite.config.js          collega il nome @lilos/sdk alla cartella sdk/; inoltra /api al kernel
jsconfig.json           lo stesso collegamento per l'editor
public/favicon.svg      logo
design/
  mockup.html           mockup statico di riferimento per finestre e app
  settings-window.html  render approvato della finestra base delle impostazioni
sdk/                    @lilos/sdk (vedi sdk/README.md)
  index.js              unico punto d'ingresso: tutti gli export pubblici
  package.json          nome, versione, export ("@lilos/sdk", "@lilos/sdk/kernel", stili)
  core/                 utilità senza interfaccia
    dom.js              h(), svg(), isEditing(), trackDrag()
    events.js           Emitter e bus di sistema
    storage.js          persistenza JSON: in memoria e sincronizzata col kernel (o su localStorage senza kernel), uid()
    session.js          utente (quello collegato al kernel) e lingua correnti
    kernel.js           client del kernel: richieste, accesso, sincronizzazione per differenze
    apps.js             app installate (elenco, installa, aggiorna, rimuovi)
    settings.js         preferenze con valori predefiniti e tipi controllati
    shortcuts.js        scorciatoie da tastiera: comandi e combinazioni modificabili
    fs.js               file system virtuale: albero di cartelle, file e collegamenti
    tags.js             tag colorati da mettere su file e cartelle; i tag invisibili nascondono i loro elementi
    history.js          UndoStack e history: annulla e ripeti, per chi ha il focus
    db.js               contenuto dei file: dal kernel, con una copia in IndexedDB (interno)
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
system/
  kernel/               il backend (vedi Architettura → Kernel)
    config.json         moduli attivi, porta, origini, app
    repos.json          i repository aggiunti da un amministratore (ignorato da git; l'ufficiale non c'è: è sempre presente)
    run.js              avvia il kernel e lo riavvia quando esce con il codice 75 (npm run kernel)
    cli.js, setup.js    comandi dei moduli (kernel:cli) e installazione delle loro dipendenze (kernel:setup)
    src/                kernel.js, modules.js, services.js, config.js, http.js, errors.js, main.js
      api/              session.js (accesso), home.js (file, impostazioni, avvio), apps.js (app installate), store.js (repository, moduli, riavvio), services.js (servizi delle app, flusso di eventi)
      apps/             manifest.js, permissions.js, sources.js (git), repos.js (repository e cataloghi), installer.js (app), modulePackage.js (moduli), appServices.js (servizi delle app: chi parte, quando, ripartenze, registro), serviceApi.js (l'oggetto lilos dentro un servizio)
    modules/
      users-basic_1.0.0/    utenti e accesso (users.json, ignorato da git)
      fs-postgres_1.0.0/    file system in PostgreSQL (schema.sql, docker-compose.yml)
      services-isolate_1.0.0/  esegue i servizi delle app: un processo per servizio, il codice in un isolato V8 (index.js, runner.js; isolated-vm)
    tools/pack.js      calcola gli hash e firma un pacchetto di app
examples/apps/note/     app di esempio (lilos.json, index.js)
scripts/
  host-shims.mjs        genera public/host/sdk.js e system.js (predev e prebuild)
public/host/            sdk.js e system.js generati: ciò che le app di sistema importano come @lilos/sdk e @lilos/system
src/
  main.js               avvio: collega il kernel (boot) e poi importa system.js
  system.js             il sistema: importa gli stili, monta canvas, HUD, desktop, taskbar, finestre; mette l'SDK e @lilos/system in globalThis.__lilosHost
  systemApi.js          @lilos/system: l'API di sistema per le app di sistema
  boot/
    boot.js             sessione, accesso, trasferimento dei dati di prima, connessione; watchSession()
    screens.js          schermate di accesso, messaggi e attesa (DOM puro)
    migrate.js          dati che il browser aveva prima del kernel, portati nell'account una sola volta
  systemSettings.js     impostazioni del sistema: valori predefiniti, applicazione, modo di selezione
  systemTrash.js        pulizia automatica del cestino (`setupTrash`)
  systemHistory.js      scorciatoie Ctrl Z / Ctrl Y, messaggi e voci di menu dell'annulla e ripeti
  systemFs.js           cartelle di sistema, riempimento al primo avvio, migrazione della vecchia scrivania
  items/
    targets.js          comandi sugli elementi (Apri, Rinomina, Elimina…) comuni a desktop e File Manager
    confirmRemove.js    eliminare come dicono le impostazioni: cestino o definitivo, con o senza conferma
    fsHistory.js        azioni sul file system che finiscono in una cronologia (elimina, ripristina, crea, rinomina, sposta)
    itemDrag.js         trascinamento di file e cartelle, uguale in ogni vista (`markItem`, `dropZone`, `dragItems`)
    links.js            ordine della barra laterale del File Manager: voci fisse e collegamenti (`links`, `linkEntry`)
    properties.js       finestra "Proprietà…" di un file o una cartella (un collegamento a un'app apre quelle dell'app)
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
    fixedItems.js       elementi fissi: Home, Documenti, Immagini, File Manager, Download, Cestino
    seed.js             elementi della Scrivania al primo avvio
  apps/
    registry.js         elenco delle app installate (nessuna è integrata), quali sono visibili nel workspace attuale, launch()
    launcher.js         da app:launch a finestre: carica l'app e la apre (una finestra per app e punto d'ingresso)
    entrypoints.js      punti d'ingresso delle app: callEntrypoint, connectEntrypoint, entrypointsOf
    startup.js          app che si aprono da sole all'ingresso (eventi system:ready e user:login)
    services.js         client dei servizi delle app nel kernel (services) e connectServices(): avvisi dei servizi
    appProperties.js    finestra "Proprietà…" di un'app: schede Generale, Permessi, Sicurezza
    filePicker.js       finestra per scegliere un file o una cartella di lilOS
    open.js             quale app apre quale tipo di file
    openWith.js         finestra "Apri con"
    commands.js         scorciatoie delle app dichiarate nel registro
    packages/
      packages.js       app installate nel registro (le app di sistema si importano da qui: loadSystemApp) e operazioni per utente (install, update, uninstall)
      host.js           finestra di un'app non di sistema: in un iframe sandbox (isolata) o nella pagina, in uno Shadow DOM (non isolata)
      background.js     punti d'ingresso in background: iframe sandbox nascosto o Web Worker, arresto dopo 5 minuti, keepAlive
      isolation.js      come gira un'app (executionMode): isolata, non isolata, di sistema, remota
      methods.js        le richieste che l'app può fare (lilos.*), controllate con i permessi; uguali per finestre e background
      code.js           il codice dell'app e le librerie, controllati con gli hash; punti d'ingresso del manifesto
      bridge.js         l'oggetto lilos (lilosApi) e il codice che lo porta nella sandbox e nel Worker
      permissions.js    controllo dei percorsi dei permessi fs.read / fs.write; descrizione dei permessi in italiano
  workareas/            aree della scrivania che tengono insieme icone e finestre
    Workareas.js        gestore: appartenenza, workarea attuale, ridurre a icona, riaprire, spostare
    WorkareaFrame.js    il DOM di un'area: barra del titolo e bordi
    store.js            salvataggio in lilos:ws:<id>:workareas, validazione, limiti
    properties.js       finestra delle proprietà (titolo, descrizione, metadati)
  workspaces/           scrivanie separate
    Workspaces.js       gestore: elenco, cambio, creazione, eliminazione, app visibili, finestre ricordate
    WorkspaceSwitcher.js pulsante nella barra (colore e nome) e suo menu
    setup.js            avvio: carica l'elenco, migra i dati di prima dei workspace, ripara
    store.js            salvataggio in lilos:workspaces, validazione, limiti, chiavi lilos:ws:<id>:…
    info.js             cosa le app possono sapere dei workspace (nome e colore di un proprietario)
  windows/
    WindowManager.js    finestre sulla scrivania: posizione, focus, trascinamento, barra, workspace di ogni finestra
  taskbar/
    Taskbar.js          pulsante logo, area finestre, utente e orologio (il pulsante workspace lo aggiunge Workspaces)
    StartMenu.js        menu di avvio con ricerca; tasto destro su un'app: Apri, Proprietà…; Esci (con più utenti) o Riavvia sessione
    BackgroundApps.js   icona con le app in background che sono rimaste attive (keepAlive) e "Ferma"
    Clock.js            data e ora
  styles/               stili del sistema, uno per area
    canvas.css          scrivania, HUD, minimappa
    desktop.css         elementi del desktop
    workareas.css       aree, barra del titolo, finestra delle proprietà
    workspaces.css      pulsante nella barra, finestre nascoste, pallino del proprietario
    boot.css            schermate di accesso e di avvio
    packages.css        finestre delle app installate
    tags.css            pallini dei tag sulle icone e nell'elenco del File Manager
    taskbar.css         barra in basso
    start-menu.css      menu di avvio
```

## Architettura

### Avvio

`src/main.js` fa solo due cose: importa gli stili dell'avvio, esegue `boot()` (accesso e collegamento al kernel, vedi [Il frontend e il kernel](#il-frontend-e-il-kernel)) e poi importa `src/system.js`. Se il kernel non è raggiungibile il sistema non parte. `system.js` importa i CSS e crea i componenti in quest'ordine:

```
globalThis.__lilosHost  l'SDK e @lilos/system, per le app di sistema (/host/sdk.js, /host/system.js)
registerPackages()    le app installate nel registro (i workspace mostrano ogni app che trovano)
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
connectPackages(…)    operazioni di installazione per l'utente (la prima volta che incontra un'app)
```

Il file system si prepara prima di tutto il resto: `setupWorkspaces` deve girare quando nessun workspace è ancora impostato in `fs` (tutto è visibile), perché assegna proprietari e crea le scrivanie.

Prima di tutto `system.js` importa `systemSettings.js`, che dichiara le impostazioni e applica quelle globali (colore principale, animazioni). Poi collega le altre: `snap` al desktop, `minimap` all'HUD, e il focus delle finestre alle scorciatoie del desktop.

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

Tastiera: le scorciatoie passano tutte dal registro `shortcuts` dell'SDK. Ogni componente registra i propri comandi (con `when` per dire quando sono attivi) e un solo listener su `window` li esegue; l'utente cambia le combinazioni dall'app Sistema. Restano fuori dal registro solo i tasti di navigazione (frecce, Invio ed Esc nei menu e nei tab, Spazio + trascina). Il menu contestuale, il menu di avvio e la rinomina, quando sono attivi, fermano la propagazione dei tasti e così "possiedono" la tastiera.

### Comunicazione

I componenti si parlano in due modi:

- **Eventi del componente**: `Canvas` estende `Emitter` ed emette `camera`, `change`, `background:press`, `background:click` e `background:contextmenu`. La minimappa ascolta `change`, il desktop gli eventi `background:*`.
- **Bus di sistema** (`bus` dell'SDK): per le richieste che attraversano il sistema. Oggi `app:launch` (avviare un'app) e `item:open` (aprire una cartella o un file). Chi li emette non sa chi li gestirà: `app:launch` lo gestisce `connectLauncher`; `item:open` di una cartella la apre nel File Manager, di un file per ora viene solo scritto in console.
- **Impostazioni** (`settings` dell'SDK): chi dipende da una preferenza la segue con `settings.watch(key, fn)`.

### File system

Cartelle, file e collegamenti alle app sono nodi del file system virtuale `fs` dell'SDK, un albero con radice `root` tenuto in memoria e salvato nella cartella dell'utente del kernel (senza kernel, in `lilos:fs`). Il contenuto dei file passa dal kernel (`fs.read` / `fs.write`, asincroni; IndexedDB ne tiene una copia).

- Le cartelle di sistema condivise (Documenti, Immagini, Download) sono create da `setupFileSystem()` (`src/systemFs.js`); la cartella Scrivania è creata per ogni workspace da `setupWorkspaces()`. Nessuna di queste si può rinominare né eliminare.
- La **scrivania è la vista della cartella `/Scrivania` del workspace attuale**: il `Desktop` crea, rinomina ed elimina tramite `fs` e si aggiorna sugli eventi `change`. Le posizioni sono salvate a parte, in `lilos:ws:<id>:desktop-layout`.
- L'app **File** è un'altra vista dello stesso albero: quello che cambia da una parte si vede subito nell'altra.
- I comandi Apri, Rinomina, Elimina, Seleziona tutto e Togli la selezione sono comuni: `src/items/targets.js` li registra una volta e li esegue sulla vista attiva (il desktop se nessuna finestra ha il focus, altrimenti la finestra del File Manager attiva).

### Trascinare file e cartelle tra le viste

Scrivania, File Manager e pannello dell'Editor trascinano file e cartelle con lo stesso modulo, `src/items/itemDrag.js`, senza conoscersi: una vista marca i suoi elementi (`markItem`, attributo `data-node`), registra le aree che accettano rilasci (`dropZone`) e avvia il trascinamento su `pointerdown` (`dragItems`). Il bersaglio si cerca nel DOM sotto il puntatore, e lo spostamento (`moveNodes`) è un solo passo nella cronologia della vista da cui si parte. L'ordine della barra laterale del File Manager, con i collegamenti, è in `src/items/links.js`. Perché è fatto così: [D30](../interna/decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle). Per usarlo in una vista nuova: [ricette](ricette.md#rendere-trascinabili-file-e-cartelle-in-unapp), contratti in [api.md](api.md#itemdragjs).

### Annulla e ripeti

Ogni posto che ha azioni da annullare tiene una `UndoStack` e la collega a un suo elemento con `history.attach` (SDK): la scrivania è la cronologia **radice** (`desktop.history`), ogni finestra del File Manager ha la sua, il pannello della cartella dell'Editor la sua, il testo dell'Editor usa quella del browser. Ctrl Z e Ctrl Y (registrati da `src/systemHistory.js`) non sanno chi li riceve: `history.resolve()` parte dall'elemento con il focus e sale tra i genitori fino al primo con un gestore. Senza focus vale la finestra attiva; una finestra senza cronologia (Sistema) non fa nulla, e non tocca la scrivania dietro; senza finestra attiva vale la scrivania. Nei campi di testo Ctrl Z resta al browser, salvo gestori con `text: true`. Eliminare è annullabile perché di norma sposta nel cestino (`fs.trash`, annullare è `fs.untrash`, vedi [D28](../interna/decisioni.md#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system)); con l'eliminazione definitiva `fs.snapshot` copia i nodi e i contenuti prima di `fs.remove`. Le cronologie stanno solo in memoria. Dettagli in [api.md](api.md#sdkcorehistoryjs) e [ricette](ricette.md#aggiungere-annulla-e-ripeti-a-unapp).

### Aprire i file

Un file si apre con l'app associata alla sua estensione (se è visibile nel workspace attuale; altrimenti compare "Apri con", che propone solo le app visibili): le app dichiarano nel manifesto le estensioni che aprono (`contributes.fileTypes`, nel registro `opens`), l'utente cambia le associazioni in Sistema → Usabilità → Tipi di file. Senza app associata compare la finestra "Apri con" (`src/apps/openWith.js`). Tutto passa da `openFile(node)` in `src/apps/open.js`, usato da `system.js` (per `item:open`) e dal File Manager. L'app riceve `args.file`.

Le scorciatoie di un'app sono dichiarate nel registro (`commands`) e registrate all'avvio, così compaiono in Sistema anche prima di aprire l'app; la finestra dell'app fornisce il gestore con `handleCommand`.

### Le app di sistema e il repository ufficiale

File Manager, Editor, Sistema e AppStore **non sono in questo repository**. Sono pacchetti di [GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official) (privato), insieme ai moduli del kernel `users-basic` e `fs-postgres`. Decisioni: [D38](../interna/decisioni.md#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos), [D41](../interna/decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel). Contratti: [API → App di sistema](api.md#app-di-sistema) e [`@lilos/system`](api.md#systemapijs-lilossystem).

**Come girano.** Un'app con `system: true` nel manifesto (accettata dal kernel solo se viene dal repository ufficiale) è codice di lilOS: il sistema la importa con `import()` da `/api/apps/<id>/v/<versione>/<entry>` (`loadSystemApp` in `src/apps/packages/packages.js`), carica i fogli di stile elencati in `styles` e la esegue **nella pagina, senza sandbox**. Il suo export predefinito è `({ args, openWindow }) → Window`, come per ogni app. Con `required: true` l'app è necessaria: non si rimuove né si nasconde (nel registro è `system`).

**Come importano SDK e sistema.** Le app sono compilate a parte e non includono `@lilos/sdk` né `@lilos/system`: nel build sono "esterni" e diventano `/host/sdk.js` e `/host/system.js`. Quei file (`public/host/`, generati da `scripts/host-shims.mjs`) leggono `globalThis.__lilosHost`, che `src/system.js` imposta all'avvio con l'SDK e con `src/systemApi.js`. Così c'è una sola copia dell'SDK (un solo `fs`, una sola connessione al kernel). `@lilos/system` è l'API di sistema offerta alle app di sistema ([elenco](api.md#systemapijs-lilossystem)): è un contratto, togliere un export rompe le app installate.

**Come si lavora su un'app di sistema.** Nel repository ufficiale (clonalo accanto a questo):

1. Modifica `src/<app>/`. Ogni app ha un `app.json`, il modello del manifesto.
2. `npm install`, poi `npm run build` (o `npm run build -- editor` per una sola app). Il build scrive `apps/<id>/dist/` e `apps/<id>/lilos.json` con l'hash di ogni file.
3. Il risultato del build **si committa**: il kernel installa i file così come sono, senza compilare niente.
4. Per pubblicare: alza `version` in `src/<app>/app.json` (o in `modules/<nome>/module.json`), rifai il build, committa sorgenti e `apps/`, poi `git tag v1.1.0 && git push --follow-tags`. Il kernel prende la versione più alta tra i tag `vX.Y.Z`.

**Provare una modifica prima di pubblicarla.** Non c'è un server di sviluppo per le app: si provano dentro lilOS. Un clone locale non conta come repository ufficiale (conta solo l'indirizzo `https://github.com/GexyLab/lilos-plugins-official`), quindi un'app di sistema non si installa da una cartella. Si può invece mandare la modifica su un ramo, alzare `version` e aggiornare l'app da quel ramo, da amministratore, con la console del browser:

```js
await lilos.kernel.request('POST', '/apps/editor/update', { ref: 'mio-ramo' });
location.reload();
```

`reinstall` non serve a questo: riscrive lo stesso commit. E ogni versione ha un suo percorso in cache per sempre (`immutable`): se cambi codice senza alzare `version`, il browser tiene il vecchio.

**Se manca il repository.** Senza `git` o senza credenziali il kernel non installa le app di sistema (log: «App di sistema non installate»); lilOS parte, ma senza File Manager, Sistema e AppStore. Si ripara correggendo l'accesso e riavviando il kernel.

### Workarea

Una workarea (`src/workareas/`) è un rettangolo della scrivania con un titolo. Non possiede nulla: **l'appartenenza è geometrica**. Un elemento del desktop o una finestra appartiene alla workarea aperta che contiene il suo centro, quindi spostarlo dentro o fuori, o ridimensionare l'area, cambia il contenuto senza altro lavoro. Le workarea aperte non si sovrappongono.

L'area è un oggetto del canvas (`.wa-area.obj`, messo sotto tutto il resto) che lascia passare il puntatore: solo barra del titolo e bordi lo prendono, dentro i clic arrivano alla scrivania, quindi selezione, menu e finestre funzionano come ovunque. Trascinare la barra sposta l'area con elementi e finestre.

`Workareas` tiene anche la **workarea attuale** (l'ultima in cui l'utente ha fatto clic o la cui finestra ha il focus) e restringe ad essa le richieste: `Desktop.scopeItems()` per Seleziona tutto, il riordino e il rettangolo di selezione, `canvas.fitScope` per Mostra tutto, `setLaunchScope()` del launcher per le app (una finestra per app per ambito, aperta dentro l'area).

Ridotta a icona, una workarea chiede a ogni finestra `canClose`, salva lo stato delle finestre delle app (`Window.getState`, posizione, dimensione, ridotta o no), le chiude, nasconde gli elementi e mette sulla scrivania un `DesktopItem` con `workarea` impostato, che non è un nodo del file system. Riaprendola, `launcher.restore()` ricrea le finestre. Lo stato delle finestre delle workarea aperte viene salvato anche mentre si lavora, per sopravvivere al ricaricamento. Vedi [Workarea](api.md#workareas) e la decisione D25.

### Workspace

Un workspace (`src/workspaces/`) è una scrivania separata: ha la sua cartella Scrivania, la sua vista, le posizioni degli elementi, le workarea, le finestre aperte e le app che mostra (quelle installate meno le nascoste). Documenti, Immagini e Download sono condivise. Vedi la decisione D27.

- **L'isolamento sta in `fs`.** La Scrivania di un workspace è una cartella `private` con `workspace` = id del proprietario. Con `fs.setWorkspace(id)` impostato, `fs` fa finta che le cartelle private degli altri workspace (e tutto ciò che contengono) non esistano: File Manager, selettori e pannello dell'Editor rispettano l'isolamento senza saperlo. Ogni nodo creato porta `workspace` (chi l'ha fatto), che non cambia se lo si sposta o rinomina; le cartelle di sistema condivise non hanno proprietario. Le viste che mostrano il proprietario (la colonna Workspace di File Manager) usano `describeWorkspace` di `src/workspaces/info.js`.
- **Cambiare workspace** (`Workspaces.switchTo`) salva il workspace lasciato (finestre, workarea, posizioni, vista), poi cambia in quest'ordine `fs.setWorkspace`, `wm.setWorkspace`, `canvas.useCamera`, `desktop.load`, `workareas.load`. Le finestre del workspace lasciato **restano aperte e nascoste** (classe `ws-away`), con il testo non salvato; ogni finestra appartiene al workspace che era attuale quando è stata aperta. I cambi sono messi in coda e uno alla volta.
- **App visibili per workspace.** Le app si installano in lilOS (per tutti) e ogni workspace può solo nasconderle. Il registro sa quali app sono `system` (le necessarie: File Manager, Sistema, AppStore; sempre visibili) e chiede a un filtro (`setInstalledFilter`, impostato da `Workspaces`) quali sono visibili nel workspace attuale. Menu di avvio, `launch` e "Apri con" lo rispettano. Quando un'app viene installata o rimossa, `Workspaces` la aggiunge o toglie a ogni workspace. Le associazioni dei tipi di file restano globali; preferenze, tema, scorciatoie e menu sono globali.
- **Finestre ricordate.** Le finestre delle app fuori da ogni workarea sono salvate per workspace in `lilos:ws:<id>:windows` (400 ms dopo ogni cambiamento e alla chiusura della pagina) e riaperte la prima volta che il workspace viene mostrato nella sessione.
- **Eliminare** non cancella mai file: la Scrivania diventa `/Documenti/Scrivania di <nome>` (rimossa se vuota), le finestre delle app passano nel workspace attuale (`wm.adopt`), quelle secondarie (selettori, proprietà delle workarea…) si chiudono, e nell'elenco salvato resta una voce "rimossa" perché i file creati da quel workspace dicano ancora di chi erano.
- **Avvio e migrazione**: `setupWorkspaces` fa nascere "Principale" dai dati di prima dei workspace e ripara elenco e scrivanie. Dettagli in [Dati salvati](api.md#lilosworkspaces).

### Tag

I tag (`tags` dell'SDK, `sdk/core/tags.js`) sono etichette colorate con un nome, uguali in tutti i workspace. Vedi la decisione D29.

- **Le definizioni stanno nell'SDK, l'assegnazione sui nodi.** Un nodo ha `tags` (id dei tag); si cambia con `fs.setTags`. `fs.tagged(id)` dà tutti gli elementi con un tag, ovunque il workspace attuale veda.
- **Invisibile significa nascosto.** `tags` comunica a `fs` i tag invisibili (`fs.setHiddenTags`, all'avvio e a ogni cambio). `fs.children()` esclude i nodi che ne hanno uno: è l'unico punto, quindi scrivania, File Manager, selettore, pannello dell'Editor e conteggi lo rispettano senza saperlo. `get`, `exists`, `resolve` e `tagged` li trovano ancora, così le finestre aperte e la vista del tag continuano a funzionare.
- **Chi mostra elenchi** deve ascoltare `fs` `scope` (cambia ciò che è visibile: un altro workspace o i tag nascosti) oltre a `change`, e `tags` `change` per nomi e colori. La scrivania si riallinea da sola (`#reconcile`).
- **L'interfaccia** sta in `src/tags/tagUi.js` (pallini, `setTag`, sottomenu Tag); la gestione in Sistema → Tag, la ricerca nella vista del tag del File Manager (`launch('files', { tag })`).

### Menu configurabili

Il menu del tasto destro sulla scrivania non è scritto nel codice del desktop: il desktop dichiara azioni e disposizione predefinita nel registro `menus` dell'SDK, e l'utente la cambia in Sistema. Per un nuovo menu configurabile: `menus.defineAction`, `menus.register`, `openMenu(x, y, menus.build(id, ctx))`.

### Temi

`<html data-theme="dark" | "light">` (impostazione `theme`) cambia i token di `sdk/styles/tokens.css`. Gli stili devono usare solo token, mai colori fissi: un colore scritto a mano resta uguale in entrambi i temi.

### Finestre

La cornice (`Window`) sta nell'SDK e non sa nulla della scrivania: mostra titolo, controlli e maniglie di ridimensionamento e segnala le richieste (`minimize`, `maximize`, `close`). Ogni controllo e ogni bordo si accende e si spegne da solo (`controls`, `resizable`, `setControl`, `setResizable`). Il `WindowManager` del sistema le ospita sulla scrivania e decide: posizione, focus, trascinamento, ridimensionamento dai bordi attivi, pulsante nella barra, e rispetta i controlli spenti anche nella barra, nel doppio clic sul titolo e nelle scorciatoie.

Un'app è un modulo caricato al primo avvio (`load` nel registro). Il suo export predefinito riceve `{ args }` e restituisce una `Window`. Ogni app ha al massimo una finestra: avviarla di nuovo riporta in primo piano quella aperta ed emette su di essa l'evento `launch` con i nuovi argomenti (così il doppio clic su un'altra cartella la mostra nella finestra del File Manager già aperta).

Quando una finestra ha il focus, le scorciatoie del desktop (Canc, Invio, F2, Ctrl A, Esc) sono disattivate. Un clic su un punto della scrivania fuori dalle finestre restituisce il focus al desktop.

### Kernel

Il backend sta in `system/kernel/` ed è un processo Node (`npm run kernel`, che passa da `run.js` per poterlo riavviare) che carica **moduli**, installa le app di sistema che mancano e serve l'API sotto `/api`. Decisioni e motivi: [D31](../interna/decisioni.md#d31-un-kernel-modulare-con-il-controllo-degli-accessi-dentro-il-modulo-del-file-system), [D32](../interna/decisioni.md#d32-utenti-in-un-file-il-modulo-users-basic), [D33](../interna/decisioni.md#d33-il-file-system-del-kernel-sta-in-postgresql). Contratti: [API → Il kernel](api.md#il-kernel).

- **Moduli.** Ogni modulo è una cartella `modules/<nome>_<versione>/` con `module.json` (`provides`, `requires`) e `index.js` (`init(ctx)`, `stop()`, `commands`). Si attivano in `config.json`. Un amministratore li installa, aggiorna e toglie dall'AppStore da un repository ([D40](../interna/decisioni.md#d40-i-moduli-del-kernel-si-installano-come-pacchetti-e-valgono-dopo-il-riavvio)): ogni modifica vale dopo il riavvio del kernel (`run.js`). Si possono ancora copiare a mano. I servizi che il kernel usa sono `auth`, `users`, `fs` e (facoltativo) `runtime`. Ricette: [Aggiungere un modulo al kernel](ricette.md#aggiungere-un-modulo-al-kernel), [Pubblicare un modulo del kernel](ricette.md#pubblicare-un-modulo-del-kernel-come-pacchetto).
- **Repository.** Il kernel prende app e moduli da repository git, letti con il comando `git` del suo computer ([D39](../interna/decisioni.md#d39-i-pacchetti-si-prendono-con-git)). L'ufficiale c'è sempre; gli altri li aggiunge un amministratore (`system/kernel/repos.json`). Ogni repository ha un `catalog.json`: [Fare un repository non ufficiale](ricette.md#fare-un-repository-non-ufficiale).
- **`users-basic_1.0.0`**: utenti e accesso, tutto in `users.json` nella cartella del modulo (ignorato da git). Password con scrypt; cookie di sessione `HttpOnly`, `SameSite=Strict`, `Path=/api`, di cui il file tiene solo l'hash; limiti ai tentativi (5 per nome utente, 20 per indirizzo, poi attese crescenti).
- **`fs-postgres_1.0.0`**: il file system in PostgreSQL (tabella `lilos_nodes`, `schema.sql`), con il **controllo degli accessi dentro il modulo**. Aree: `/system/app` e `/system/commons` leggibili da tutti e scrivibili solo dal kernel; `/system/tmp` e `/home` del kernel; `/home/<utente>` solo del suo utente. Il database di sviluppo parte con `npm run db:up`.
- **`services-isolate_1.0.0`**: fornisce `runtime`, che fa girare i **servizi delle app** (punti d'ingresso `kind: 'service'`, permesso `background`) nel kernel anche a lilOS chiuso. Ogni servizio è un processo Node con il modello di permessi di Node (legge solo la cartella del modulo), e il codice dell'app gira in un isolato V8 (`isolated-vm`, 128 MB, 10 secondi per esecuzione) con solo l'oggetto `lilos`, le cui richieste il kernel controlla con i permessi. Chi li avvia e quando (`system:ready`, `user:login`, a mano), le ripartenze e il registro stanno in `apps/appServices.js`. Richiede Node da 22 a 25 (`isolated-vm` 6.2). Contratti: [API → Servizi delle app](api.md#servizi-delle-app-appsappservicesjs), decisione [D44](../interna/decisioni.md#d44-avvio-automatico-due-eventi-app-solo-nella-prima-scheda-servizi-nel-kernel).
- **Sicurezza HTTP.** Ogni risposta ha `Cache-Control: no-store`, `nosniff` e una CSP che vieta tutto. Le richieste che modificano (non GET né HEAD) devono avere `X-Lilos: 1` e, se il browser manda `Origin`, un'origine in `origins` (o, con `loopbackOrigins`, di localhost).
- **Home dell'utente.** `system/kernel/src/api/home.js` traduce gli id di lilOS in id del file system, separati per utente (`<home>/<id>`). Sotto la home ci sono `.trash` (radice del Cestino) e `.config` (un file JSON per ogni chiave di `storage`).
- **Senza modulo di accesso**: un solo utente (`local`, amministratore) e il kernel parte solo su 127.0.0.1.

### Il frontend e il kernel

`src/main.js` non monta il sistema: chiama `boot()` (`src/boot/boot.js`) e solo dopo importa `src/system.js`. Il motivo è che l'SDK legge i dati dell'utente appena viene caricato, quindi il collegamento deve esistere prima. `boot()` ripete finché non riesce:

1. `kernel.session()`: chi è collegato e se lilOS ha più utenti (`mode` `multi`) o uno (`single`).
2. In modalità `multi` senza utente: schermata di accesso (`src/boot/screens.js`, DOM puro, perché l'SDK non si può ancora importare).
3. Se il browser ha dati di prima del kernel e la home è vuota: offerta di trasferirli (`src/boot/migrate.js`, una sola volta; dopo il trasferimento si cancellano da `localStorage` e da IndexedDB `lilos`).
4. `kernel.connect()`: `GET /api/boot` restituisce utente, nodi, impostazioni e app installate.

In caso d'errore compare una schermata con **Riprova** («Il kernel di lilOS non risponde» se è spento). Poi `system.js` chiama `watchSession()` (se la sessione scade, accesso sopra lilOS, e le modifiche in attesa partono dopo) e `watchSaving()` (avvisi «Modifiche non salvate…» e «Modifiche salvate», avviso del browser se si chiude con modifiche in attesa).

Dentro l'SDK `kernel` (`sdk/core/kernel.js`) fa le richieste e tiene i **tracker**: `storage` e `fs` li usano per mandare solo le differenze, 300 ms dopo l'ultimo cambiamento (decisione [D34](../interna/decisioni.md#d34-il-frontend-tiene-i-dati-in-memoria-e-li-sincronizza-per-differenze)). Il contenuto dei file (`contents`, `sdk/core/db.js`) passa dal kernel, con una copia in IndexedDB `lilos:<id utente>` che si cancella all'uscita. Più schede continuano a sovrascriversi: vince l'ultima scrittura sul singolo nodo.

### App installate (pacchetti)

Un'app installata è un pacchetto: `lilos.json` con i suoi file. Decisioni: [D38](../interna/decisioni.md#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos), [D35](../interna/decisioni.md#d35-le-app-locali-girano-in-un-iframe-sandbox-senza-allow-same-origin), [D36](../interna/decisioni.md#d36-le-app-installate-sono-di-tutti-le-operazioni-di-installazione-sono-per-utente), [D37](../interna/decisioni.md#d37-fiducia-nei-pacchetti-origine-firma-e-permessi). Contratti: [API → apps/packages](api.md#appspackages) e [Il kernel](api.md#il-kernel).

- **Nel kernel** (`system/kernel/src/apps/`): `manifest.js` valida il manifesto, `permissions.js` elenca i permessi, `sources.js` scarica il pacchetto con `git` (o da una cartella locale), `repos.js` legge i repository e i loro cataloghi, `installer.js` installa, aggiorna e rimuove le app, `modulePackage.js` fa lo stesso per i moduli del kernel. Il pacchetto sta in `/system/app/<id>/<versione>`, le librerie con `cache: true` in `/system/commons/<libreria>/<versione>` e `/system/tmp/<id>` è riservata ai file temporanei dell'app (si toglie con l'app; oggi nessuna funzione del ponte la usa). Si tengono la versione in uso e la precedente. Installare, aggiornare e rimuovere è riservato agli amministratori.
- **Nel frontend** (`src/apps/packages/`): `packages.js` mette le app installate nel registro (`registerApp` / `unregisterApp`) e le tiene allineate quando cambiano; `isolation.js` dice come gira ogni app; `host.js` crea la finestra (iframe sandbox o Shadow DOM nella pagina); `background.js` fa girare i punti d'ingresso senza finestra; `methods.js` esegue le richieste dell'app dopo averle controllate con i permessi; `bridge.js` costruisce l'oggetto `lilos` (lo stesso in tutti i modi di girare); `permissions.js` controlla i percorsi.
- **Registro.** `src/apps/registry.js` è dinamico: `apps` si modifica con `registerApp` e `unregisterApp`, ed emette `change` su `registry`. **Nessuna app è integrata**: anche File Manager, Editor, Sistema e AppStore sono pacchetti. Nel registro `system` vuol dire app necessaria (`required`: sempre visibile) e `trusted` app di sistema (`system`: gira in lilOS).
- **Operazioni per utente.** `packages.js` (`setupUser`) esegue `install` e `update` del manifesto per l'utente che ha aperto lilOS, la prima volta che incontra l'app, e le registra in `app-setup` (versione, ciò che ha creato, passi di `uninstall`). Non sovrascrive. Se l'app non c'è più, toglie ciò che aveva creato; ciò che l'utente ha modificato va nel Cestino, i dati propri dell'app (`app:<id>:*`) si cancellano.
- **Workspace.** Un'app installata vale per tutti: `Workspaces` la aggiunge a `apps` e `known` di ogni workspace quando compare nel registro, e la toglie (chiudendone le finestre) quando sparisce. Ogni workspace può nasconderla con `setInstalled` (non le necessarie).
- **Esecuzione.** Un'app di sistema `local` gira dentro lilOS (vedi [Le app di sistema](#le-app-di-sistema-e-il-repository-ufficiale)). Un'altra app `local` gira **isolata** (il predefinito) in `<iframe sandbox="allow-scripts">` (origine opaca): lilOS scarica il codice dal kernel, ne controlla l'hash con il manifesto, costruisce il documento con una CSP (`net:` apre `connect-src`) e lo mette in `srcdoc`. Se un amministratore lo sceglie (per tutte le app o per una), un'app con `sdk` `"2"` gira invece **non isolata**: la finestra nella pagina di lilOS, in uno Shadow DOM, e i punti d'ingresso in background in un Web Worker; l'app può allora fare tutto ciò che fa l'utente. Un'app `remote` è il suo sito in un iframe (`https`, o `http://localhost`), sempre isolata, come le app con `sdk` `"1"`. Dettagli: [API → Modalità di esecuzione](api.md#modalità-di-esecuzione-isolationjs), decisione [D42](../interna/decisioni.md#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app).
- **Punti d'ingresso.** Un'app con `sdk` `"2"` esporta una funzione per ogni punto d'ingresso: `main` (la finestra che apre l'utente) e quelli di `entrypoints` nel manifesto, finestre, in background (nel browser) o servizi (nel kernel). Le avvia il sistema (`callEntrypoint` di `@lilos/system`) o un'app (`lilos.app.call`, `lilos.apps.call` con il permesso `apps.call:<id>`). Un punto d'ingresso in background si ferma dopo 5 minuti senza chiamate, a meno che chieda `lilos.app.keepAlive()`; un servizio gira nel kernel e non si ferma da solo (vedi [API → Servizi delle app](api.md#servizi-delle-app-appsappservicesjs)). Vedi [API → Punti d'ingresso](api.md#punti-dingresso-entrypointsjs).
- **Proprietà.** "Proprietà…" (menu di una cartella o un file sulla scrivania, `showProperties`; menu di avvio e collegamenti sulla scrivania per le app, `showAppProperties`) apre una finestra per elemento; quella di un'app ha le schede Generale, Permessi e Sicurezza.

### Persistenza

`storage` dell'SDK salva JSON. Collegato al kernel (sempre, nel sistema) i valori stanno in memoria e partono verso la cartella `.config` dell'utente poco dopo ogni modifica; senza kernel (l'SDK da solo) sono in `localStorage` con prefisso `lilos:`. Non lancia mai eccezioni. Nelle tabelle e nel resto della documentazione le chiavi si scrivono con il prefisso `lilos:`, che è quello di `localStorage`: nel kernel la chiave è senza prefisso.

| Chiave | Contenuto | Scritta da |
| --- | --- | --- |
| `lilos:workspaces` | `{ current, list }`: i workspace (nome, colore, cartella Scrivania, app visibili) | `Workspaces`, a ogni modifica |
| `lilos:ws:<id>:camera` | `{ x, y, s }` della vista del workspace | `Canvas`, 300 ms dopo l'ultimo movimento |
| `lilos:fs` | tutti i nodi del file system (solo senza kernel: con il kernel i nodi sono nella cartella dell'utente) | `fs`, a ogni modifica |
| `lilos:tags` | i tag: `{ id, name, color, visible }` (i tag messi sui nodi sono nel campo `tags` di `lilos:fs`) | `tags`, a ogni modifica |
| `lilos:ws:<id>:desktop-layout` | posizioni sulla scrivania, `{ id: [x, y] }` | `Desktop`, dopo spostamenti e creazioni |
| `lilos:ws:<id>:windows` | finestre delle app fuori dalle workarea, da riaprire | `Workspaces`, 400 ms dopo ogni cambiamento |
| `lilos:ws:<id>:workareas` | workarea: area, titolo, descrizione, metadati, elementi nascosti e finestre da riaprire | `Workareas`, a ogni modifica; le finestre 400 ms dopo ogni cambiamento |
| `lilos:files-view` | vista del File Manager (`"list"` o `"grid"`) | File Manager |
| `lilos:files-panels` | pannelli Informazioni e Anteprima del File Manager: `{ info: { open, width }, preview: { open, width } }` | File Manager |
| `lilos:file-apps` | app scelte per i tipi di file | `setAppFor` (Sistema, Apri con) |
| `lilos:files-sidebar` | ordine della sezione Collegamenti della barra laterale del File Manager: id di nodi (voci fisse e collegamenti) e la chiave `desk`; al massimo 80, uguali in ogni workspace | `links` |
| `lilos:editor-tree` | cartella aperta nell'Editor, cartelle espanse, larghezza del pannello | `FileTree` (Editor) |
| IndexedDB `lilos` → `contents` | contenuto dei file (solo senza kernel; con il kernel: copia in IndexedDB `lilos:<id utente>`, cancellata all'uscita) | `fs.write` |
| `lilos:app-setup` | per utente: che cosa hanno fatto le app installate, per annullarlo quando l'app viene rimossa | `packages.js` |
| `lilos:app:<id>:<chiave>` | i dati propri di un'app installata (`lilos.storage`) | il ponte, per l'app |
| `lilos:settings` | oggetto con le impostazioni | `settings`, a ogni cambiamento |
| `lilos:shortcuts` | combinazioni personalizzate | `shortcuts`, a ogni modifica |

Dettagli in [Riferimento API → Dati salvati](api.md#dati-salvati).
