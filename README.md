# lilOS

Desktop web su una scrivania infinita: canvas con zoom e spostamento, elementi del desktop (cartelle, file, app), barra delle applicazioni e menu di avvio.

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build in dist/
```

## Struttura

```
src/
  main.js               bootstrap: monta canvas, HUD, desktop, taskbar
  core/
    dom.js              h() per creare elementi, svg(), trackDrag(), isEditing()
    events.js           Emitter + bus di sistema ('app:launch', 'item:open')
    storage.js          persistenza JSON su localStorage, uid()
    session.js          utente e locale correnti
  canvas/
    Canvas.js           scrivania infinita: camera (pan/zoom), oggetti in coordinate mondo
    Minimap.js          panoramica cliccabile
    Hud.js              pannello minimappa + controlli zoom
  desktop/
    Desktop.js          selezione, trascinamento, rinomina, elimina, menu contestuali, salvataggio
    DesktopItem.js      componente singolo (cartella / file / app)
    itemIcons.js        icone grandi di cartelle e file
    fileTypes.js        tipo, colore ed etichetta in base all'estensione
    seed.js             elementi al primo avvio
  apps/
    registry.js         app installate + launch()
    appIcon.js          riquadro icona dell'app
  taskbar/
    Taskbar.js          pulsante logo · area finestre · utente e orologio
    StartMenu.js        menu di avvio con ricerca app
    Clock.js
  ui/
    icons.js            glifi SVG e logo
    ContextMenu.js      menu a comparsa riutilizzabile
    avatar.js
  styles/               token, base, componenti e uno stile per area
design/mockup.html      mockup statico di riferimento (finestre, app)
```

## Comandi

| Azione | Comando |
| --- | --- |
| Zoom | rotella, Ctrl + rotella, pizzico, Ctrl + / Ctrl − / Ctrl 0 |
| Spostarsi | trascina lo sfondo, tasto centrale, Spazio + trascina |
| Mostra tutto | Shift 1 |
| Menu di avvio | pulsante logo, Ctrl K |
| Elementi | doppio clic apre, F2 rinomina, Canc elimina, Ctrl A seleziona tutto, Ctrl/Shift + clic selezione multipla |
| Nuova cartella / file | tasto destro sullo sfondo |

## Convenzioni

- Tutto ciò che sta sulla scrivania si aggiunge con `canvas.add(el)` e ha `data-kind` (usato dalla minimappa).
- Gli elementi con `data-wheel="native"` (es. contenuto delle finestre) scorrono con la rotella invece di zoomare.
- Le app comunicano col sistema tramite `bus` (`core/events.js`); aprire app e file oggi emette solo eventi, il window manager li gestirà.
