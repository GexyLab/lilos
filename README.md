# lilOS

Desktop web su una scrivania infinita: canvas con zoom e spostamento, elementi del desktop (cartelle, file, app), barra delle applicazioni e menu di avvio.

Documentazione completa in [doc/](doc/README.md): [guida utente](doc/utente/guida.md), [sviluppatore](doc/sviluppatore/README.md), [interna](doc/interna/README.md). SDK: [sdk/README.md](sdk/README.md).

## Avvio

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
    itemIcons.js        icone grandi di cartelle e file
    seed.js             elementi della Scrivania al primo avvio
  systemSettings.js     impostazioni del sistema
  systemFs.js           cartelle di sistema, primo avvio, migrazione
  items/                comandi comuni a desktop e File, conferma di eliminazione
  apps/
    registry.js         app installate + launch()
    launcher.js         apre le app in finestre
    settings/           app Impostazioni
    files/              app File (File Manager)
    editor/             app Editor (testo, numeri di riga, evidenziazione)
    open.js             quale app apre quale tipo di file
    openWith.js         finestra "Apri con"
    commands.js         scorciatoie delle app
  windows/
    WindowManager.js    finestre sulla scrivania e nella barra
  taskbar/
    Taskbar.js          pulsante logo · area finestre · utente e orologio
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
| Elementi | doppio clic apre, F2 rinomina, Canc elimina, Ctrl A seleziona tutto, Ctrl/Shift + clic selezione multipla |
| Nuova cartella / file | tasto destro sullo sfondo |
| Finestre | trascina il titolo, bordi e angoli per ridimensionare, doppio clic sul titolo per ingrandire, pulsante nella barra per riaprire o ridurre, Alt W chiude, Alt N passa alla successiva |
| Editor | Ctrl S salva, Ctrl Alt N nuovo documento, Tab / Shift Tab rientro |

Tutte le scorciatoie (tranne Spazio + trascina e i tasti di navigazione nei menu) si cambiano in Impostazioni → Usabilità → Scorciatoie.

## Convenzioni

- Le basi riutilizzabili nascono nell'SDK e si importano da `@lilos/sdk`. L'SDK non importa mai da `src/`.
- Tutto ciò che sta sulla scrivania si aggiunge con `canvas.add(el)` e ha `data-kind` (usato dalla minimappa).
- Gli elementi con `data-wheel="native"` (es. contenuto delle finestre) scorrono con la rotella invece di zoomare.
- Le app comunicano col sistema tramite `bus` dell'SDK. Un'app è un modulo con `load` nel registro che restituisce una `Window`; le cartelle si aprono nell'app File, i file con l'app associata al tipo (Impostazioni → Usabilità → Tipi di file) o con la finestra "Apri con".
- Ogni finestra che modifica impostazioni usa `SettingsWindow` dell'SDK.
- Cartelle e file passano dal file system dell'SDK (`fs`); la scrivania è la vista della cartella `/Scrivania`.
- Ogni scorciatoia è un comando registrato con `shortcuts.register` dell'SDK, così l'utente può cambiarla.
