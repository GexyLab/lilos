# lilOS
LilOS è un sistema operativo web basato su un backend in nodejs che fà da kernel e un frontend che fà  da ambiente desktop in cui possono essere installate app o usate web app ospitate in altri ambienti. Il backend è fatto a moduli per astrarre filesystem, autenticazione, e tutti gli altri aspetti, in modo da poter utilizzare altri prodotti cloud(come OpenBack, Google, AWS, etc) ed esporli all'utente come classici componenti di un sistema operativo(file, directory, finestre, widget, etc). L'idea alla base di LilOS è avere il proprio ambiente di lavoro ovunque che possa integrare e raggruppare tutti i prodotti propri e di terze parti in un unico ambiente.

L'ambiente desktop è pensato come un canvas infinito, elementi del desktop (cartelle, file, app), workarea (aree della scrivania che tengono insieme icone e finestre), workspace (scrivanie separate, ognuna con i suoi elementi, finestre e app), barra delle applicazioni e menu di avvio.
Desktop web su una scrivania infinita: canvas con zoom e spostamento.

Documentazione completa in [doc/](doc/README.md): [guida utente](doc/utente/guida.md), [sviluppatore](doc/sviluppatore/README.md), [interna](doc/interna/README.md). SDK: [sdk/README.md](sdk/README.md).

## Dove gira
Può essere self-hosted in docker oppure in versione cloud gestita in OpenBack

## Avvio

Le dipendenze (per l'Editor: Shiki per TextMate, web-tree-sitter, i servizi di linguaggio di VS Code) sono bloccate a versioni precise e vengono caricate solo quando servono. Le grammatiche Tree-sitter sono già in `public/tree-sitter/`; per aggiornarle: `node scripts/vendor-tree-sitter.mjs`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build in dist/
```

## Struttura

```
sdk/                    @lilos/sdk: basi riutilizzabili da sistema e app
  index.js              unico punto d'ingresso
  core/                 h(), svg(), trackDrag(), Emitter + bus, storage, session
  core/settings.js      preferenze dell'utente
  core/fs.js            file system virtuale (cartelle, file, collegamenti; contenuti su IndexedDB)
  core/tags.js          tag colorati per ritrovare file e cartelle, anche nascondendoli
  ui/                   icone, menu, controlli, Window, SettingsView, SettingsWindow
  styles/               token, base, componenti, finestre (@lilos/sdk/styles.css)
src/                    il sistema, costruito sull'SDK
  main.js               bootstrap: monta canvas, HUD, desktop, taskbar
  canvas/
    Canvas.js           scrivania infinita: camera (pan/zoom), oggetti in coordinate mondo
    Minimap.js          panoramica cliccabile
    Hud.js              pannello minimappa + controlli zoom
  desktop/
    Desktop.js          selezione, trascinamento, rinomina, elimina, menu contestuali, salvataggio
    DesktopItem.js      componente singolo (cartella / file / app)
    itemIcons.js        icone grandi di cartelle, file e workarea
    seed.js             elementi della Scrivania al primo avvio
  systemSettings.js     impostazioni del sistema
  systemHistory.js      annulla e ripeti (Ctrl Z, Ctrl Y)
  systemTrash.js        pulizia automatica del cestino
  systemFs.js           cartelle di sistema, primo avvio, migrazione
  items/                comandi comuni a desktop e File, eliminazione (cestino, conferma), trascinamento tra viste, ordine e collegamenti della barra di File
  tags/                 pallini e menu dei tag, usati da scrivania, File e Impostazioni
  apps/
    registry.js         app note, quali sono installate nel workspace + launch()
    launcher.js         apre le app in finestre
    settings/           app Impostazioni
    files/              app File (File Manager)
    editor/             app Editor: Tree-sitter, TextMate, Language Server (JSON, CSS, HTML), schemi JSON
    open.js             quale app apre quale tipo di file
    openWith.js         finestra "Apri con"
    commands.js         scorciatoie delle app
  workareas/            aree della scrivania con icone e finestre: ridurre a icona, riaprire, proprietà
  workspaces/           scrivanie separate: elenco salvato, avvio e migrazione, cambio, pulsante nella barra
  windows/
    WindowManager.js    finestre sulla scrivania e nella barra
  taskbar/
    Taskbar.js          pulsante logo · pulsante workspace · area finestre · utente e orologio
    StartMenu.js        menu di avvio con ricerca app
    Clock.js
  styles/               uno stile per area del sistema
design/                 render statici di riferimento (finestre, app, finestra impostazioni)
doc/                    documentazione utente, sviluppatore e interna
.claude/agents/         agenti di Claude Code: qa-tester, security-tester, doc-writer
```

## Comandi

| Azione | Comando |
| --- | --- |
| Zoom | rotella, Ctrl + rotella, pizzico, Ctrl + / Ctrl − / Ctrl 0 |
| Spostarsi | Spazio + trascina, tasto centrale (un dito sugli schermi touch) |
| Selezionare | clic, trascina sullo sfondo (rettangolo), Alt + trascina (mano libera, modificabile), Ctrl/Shift per aggiungere |
| Mostra tutto | Shift 1 |
| Menu di avvio | pulsante logo, Ctrl K |
| Elementi | doppio clic apre, F2 rinomina, Canc elimina (nel Cestino), Ctrl A seleziona tutto, Ctrl/Shift + clic selezione multipla |
| Spostare file e cartelle | trascina un elemento (o la selezione) su una cartella: sulla scrivania, in File (elenco, percorso, barra laterale) o nel pannello dell'Editor, anche da una vista all'altra; Esc annulla; rilasciato sul Cestino lo elimina; tra due voci della sezione Collegamenti di File crea un collegamento, e le voci si riordinano trascinandole (con × o Canc si elimina un collegamento) |
| Annulla / ripeti | Ctrl Z / Ctrl Y (o Ctrl Shift Z), dove stai lavorando: scrivania, finestra File, testo e pannello dell'Editor |
| Nuova cartella / file / workarea | tasto destro sullo sfondo → Nuovo |
| Workarea | tasto destro su un'icona selezionata → Crea una workarea con la selezione; trascina la barra del titolo per spostarla, bordi e angoli per ridimensionarla, doppio clic sul titolo per rinominarla, pulsante con il trattino per ridurla a icona (doppio clic o Invio sull'icona la riapre) |
| Workspace | pulsante accanto al logo (menu: elenco, Nuovo workspace, Gestisci), Ctrl Alt → / Ctrl Alt ← per passare al successivo o al precedente |
| Tag | tasto destro su un elemento → Tag (assegna, "Nuovo tag…", "Gestisci i tag…"); in File, voce del tag nella barra laterale per vedere tutti gli elementi con quel tag; Impostazioni → Tag per colori e visibilità (un tag invisibile nasconde i suoi elementi) |
| Finestre | trascina il titolo, bordi e angoli per ridimensionare, doppio clic sul titolo per ingrandire, pulsante nella barra per riaprire o ridurre, Alt W chiude, Alt N passa alla successiva |
| Editor | Ctrl S salva, Ctrl Alt N nuovo documento, Ctrl O apri un file, Ctrl Alt O apri una cartella (pannello a destra), Ctrl B mostra o nasconde la cartella, Ctrl Spazio suggerimenti (compaiono anche da soli), Tab / Shift Tab rientro |

Tutte le scorciatoie (tranne Spazio + trascina e i tasti di navigazione nei menu) si cambiano in Impostazioni → Usabilità → Scorciatoie.

## Convenzioni

- Le basi riutilizzabili nascono nell'SDK e si importano da `@lilos/sdk`. L'SDK non importa mai da `src/`.
- Tutto ciò che sta sulla scrivania si aggiunge con `canvas.add(el)` e ha `data-kind` (usato dalla minimappa).
- Gli elementi con `data-wheel="native"` (es. contenuto delle finestre) scorrono con la rotella invece di zoomare.
- Le app comunicano col sistema tramite `bus` dell'SDK. Un'app è un modulo con `load` nel registro che restituisce una `Window`; le cartelle si aprono nell'app File, i file con l'app associata al tipo (Impostazioni → Usabilità → Tipi di file) o con la finestra "Apri con".
- Ogni finestra che modifica impostazioni usa `SettingsWindow` dell'SDK.
- Cartelle e file passano dal file system dell'SDK (`fs`); la scrivania è la vista della cartella `/Scrivania` del workspace attuale (privata: gli altri workspace non la vedono). Ogni nodo creato ricorda il workspace che l'ha fatto.
- Ogni scorciatoia è un comando registrato con `shortcuts.register` dell'SDK, così l'utente può cambiarla.
