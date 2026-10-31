# lilOS
LilOS è un sistema operativo web basato su un backend in nodejs che fà da kernel e un frontend che fà  da ambiente desktop in cui possono essere installate app o usate web app ospitate in altri ambienti. Il backend è fatto a moduli per astrarre filesystem, autenticazione, e tutti gli altri aspetti, in modo da poter utilizzare altri prodotti cloud(come OpenBack, Google, AWS, etc) ed esporli all'utente come classici componenti di un sistema operativo(file, directory, finestre, widget, etc). L'idea alla base di LilOS è avere il proprio ambiente di lavoro ovunque che possa integrare e raggruppare tutti i prodotti propri e di terze parti in un unico ambiente.

L'ambiente desktop è pensato come un canvas infinito, elementi del desktop (cartelle, file, app), workarea (aree della scrivania che tengono insieme icone e finestre), workspace (scrivanie separate, ognuna con i suoi elementi, finestre e app), barra delle applicazioni e menu di avvio.
Desktop web su una scrivania infinita: canvas con zoom e spostamento. I dati stanno in un backend, il **kernel** (`system/kernel/`), con un account per ogni utente. Le app (File Manager, Editor, Sistema e AppStore comprese) e i moduli del kernel sono pacchetti che si installano dai repository: quello ufficiale è [GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official).

Documentazione completa in [doc/](doc/README.md): [guida utente](doc/utente/guida.md), [sviluppatore](doc/sviluppatore/README.md), [interna](doc/interna/README.md). SDK: [sdk/README.md](sdk/README.md).

## Dove gira
Può essere self-hosted in docker oppure in versione cloud gestita in OpenBack

## Avvio

lilOS non ha dipendenze a runtime (solo Vite per lo sviluppo). File Manager, Editor, Sistema e AppStore **non sono in questo repository**: stanno nel repository ufficiale e il kernel installa da solo, all'avvio, quelle che mancano. Per questo al primo avvio servono il comando `git` e l'accesso a quel repository (che è privato: si usano le credenziali git del computer). Dettagli in [doc/sviluppatore](doc/sviluppatore/README.md#il-kernel-il-backend).

```bash
npm install
npm run kernel:setup                                    # una volta: dipendenze dei moduli del kernel (anche isolated-vm, per i servizi)
npm run db:up                                           # PostgreSQL in Docker (127.0.0.1:5433)
npm run kernel:cli -- users-basic add <nome> --admin    # una volta: crea un utente
npm run kernel                                          # il kernel su http://127.0.0.1:8790 (al primo avvio installa le app di sistema)
npm run dev                                             # lilOS su http://localhost:5173 (/api va al kernel)
npm run build                                           # build in dist/
```

Il sistema non parte senza il kernel. Serve Node.js 22 o più recente e, per il database di sviluppo, Docker. Dettagli in [doc/sviluppatore](doc/sviluppatore/README.md#il-kernel-il-backend).

## Struttura

```
sdk/                    @lilos/sdk: basi riutilizzabili da sistema e app
  index.js              unico punto d'ingresso
  core/                 h(), svg(), trackDrag(), Emitter + bus, storage, session
  core/kernel.js        client del kernel: richieste, accesso, sincronizzazione delle modifiche
  core/apps.js          app installate: elenco, installa, aggiorna, rimuovi
  core/settings.js      preferenze dell'utente
  core/fs.js            file system virtuale (cartelle, file, collegamenti; salvato nel kernel)
  core/tags.js          tag colorati per ritrovare file e cartelle, anche nascondendoli
  ui/                   icone, menu, controlli, Window, SettingsView, SettingsWindow
  styles/               token, base, componenti, finestre (@lilos/sdk/styles.css)
scripts/
  host-shims.mjs        genera public/host/sdk.js e system.js (predev, prebuild)
public/host/            i moduli che le app di sistema importano come @lilos/sdk e @lilos/system (generati)
system/
  kernel/               il backend: moduli (users-basic, fs-postgres, services-isolate: fa girare i servizi delle app), API, repository, installazione di app e moduli, riga di comando; run.js lo avvia e lo riavvia
examples/apps/note/     app di esempio (lilos.json, index.js)
src/                    il sistema, costruito sull'SDK
  main.js               avvio: accesso e collegamento al kernel (boot/), poi system.js
  system.js             bootstrap: monta canvas, HUD, desktop, taskbar
  systemApi.js          @lilos/system: l'API di sistema per le app di sistema
  boot/                 schermate di accesso e avvio, trasferimento dei dati di prima del kernel
  canvas/
    Canvas.js           scrivania infinita: camera (pan/zoom), oggetti in coordinate mondo
    Minimap.js          panoramica cliccabile
    Hud.js              pannello minimappa + controlli zoom
  desktop/
    Desktop.js          selezione, trascinamento, rinomina, elimina, menu contestuali, salvataggio
    DesktopItem.js      componente singolo (cartella / file / app)
    itemIcons.js        icone grandi di cartelle, file e workarea
    fixedItems.js       elementi fissi: Home, Documenti, Immagini, File Manager, Download, Cestino
    seed.js             elementi della Scrivania al primo avvio
  systemSettings.js     impostazioni del sistema
  systemHistory.js      annulla e ripeti (Ctrl Z, Ctrl Y)
  systemTrash.js        pulizia automatica del cestino
  systemFs.js           cartelle di sistema, primo avvio, migrazione
  items/                "Proprietà…" di file e cartelle, comandi comuni a desktop e File Manager, eliminazione (cestino, conferma), trascinamento tra viste, ordine e collegamenti della barra del File Manager
  tags/                 pallini e menu dei tag, usati da scrivania, File Manager e Sistema
  apps/
    registry.js         le app installate (nessuna è integrata), quali sono visibili nel workspace + launch()
    packages/           app installate: nel registro; le app di sistema girano in lilOS, le altre isolate (sandbox, con l'oggetto lilos) o, se un amministratore lo sceglie, nella pagina di lilOS; punti d'ingresso in background; operazioni per utente
    launcher.js         apre le app in finestre
    entrypoints.js      punti d'ingresso delle app (finestre e background)
    startup.js          app che si aprono da sole all'ingresso (Sistema → Avvio)
    services.js         servizi delle app nel kernel: client e avvisi
    appProperties.js    "Proprietà…" di un'app: Generale, Permessi, Sicurezza
    open.js             quale app apre quale tipo di file
    openWith.js         finestra "Apri con"
    commands.js         scorciatoie delle app
  workareas/            aree della scrivania con icone e finestre: ridurre a icona, riaprire, proprietà
  workspaces/           scrivanie separate: elenco salvato, avvio e migrazione, cambio, pulsante nella barra
  windows/
    WindowManager.js    finestre sulla scrivania e nella barra
  taskbar/
    Taskbar.js          pulsante logo · pulsante workspace · area finestre · utente e orologio
    StartMenu.js        menu di avvio con ricerca app (tasto destro: Apri, Proprietà…)
    BackgroundApps.js   icona delle app in background rimaste attive, con "Ferma"
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
| Menu di avvio | pulsante logo, Ctrl K; in fondo Sistema ed Esci (con più utenti) |
| Elementi | doppio clic apre, F2 rinomina, Canc elimina (nel Cestino), Ctrl A seleziona tutto, Ctrl/Shift + clic selezione multipla |
| Spostare file e cartelle | trascina un elemento (o la selezione) su una cartella: sulla scrivania, nel File Manager (elenco, percorso, barra laterale) o nel pannello dell'Editor, anche da una vista all'altra; Esc annulla; rilasciato sul Cestino lo elimina; tra due voci della sezione Collegamenti del File Manager crea un collegamento, e le voci si riordinano trascinandole (con × o Canc si elimina un collegamento) |
| Annulla / ripeti | Ctrl Z / Ctrl Y (o Ctrl Shift Z), dove stai lavorando: scrivania, finestra del File Manager, testo e pannello dell'Editor |
| Nuova cartella / file / workarea | tasto destro sullo sfondo → Nuovo |
| Workarea | tasto destro su un'icona selezionata → Crea una workarea con la selezione; trascina la barra del titolo per spostarla, bordi e angoli per ridimensionarla, doppio clic sul titolo per rinominarla, pulsante con il trattino per ridurla a icona (doppio clic o Invio sull'icona la riapre) |
| Workspace | pulsante accanto al logo (menu: elenco, Nuovo workspace, Gestisci), Ctrl Alt → / Ctrl Alt ← per passare al successivo o al precedente |
| Tag | tasto destro su un elemento → Tag (assegna, "Nuovo tag…", "Gestisci i tag…"); nel File Manager, voce del tag nella barra laterale per vedere tutti gli elementi con quel tag; Sistema → Tag per colori e visibilità (un tag invisibile nasconde i suoi elementi) |
| Finestre | trascina il titolo, bordi e angoli per ridimensionare, doppio clic sul titolo per ingrandire, pulsante nella barra per riaprire o ridurre, Alt W chiude, Alt N passa alla successiva |
| Editor (app opzionale) | Ctrl S salva, Ctrl Alt N nuovo documento, Ctrl O apri un file, Ctrl Alt O apri una cartella (pannello a destra), Ctrl B mostra o nasconde la cartella, Ctrl Spazio suggerimenti (compaiono anche da soli), Tab / Shift Tab rientro |

Tutte le scorciatoie (tranne Spazio + trascina e i tasti di navigazione nei menu) si cambiano in Sistema → Usabilità → Scorciatoie.

## Convenzioni

- Le basi riutilizzabili nascono nell'SDK e si importano da `@lilos/sdk`. L'SDK non importa mai da `src/`.
- Tutto ciò che sta sulla scrivania si aggiunge con `canvas.add(el)` e ha `data-kind` (usato dalla minimappa).
- Gli elementi con `data-wheel="native"` (es. contenuto delle finestre) scorrono con la rotella invece di zoomare.
- Le app comunicano col sistema tramite `bus` dell'SDK. Ogni app è un pacchetto (`lilos.json`) installato dal kernel: un'app di sistema (File Manager, Editor, Sistema, AppStore: dal repository ufficiale) gira dentro lilOS e usa `@lilos/sdk` e `@lilos/system`; un'altra app gira, per impostazione predefinita, in un iframe isolato e parla con lilOS solo con l'oggetto `lilos` (un amministratore può farla girare non isolata: allora può fare tutto ciò che fa l'utente) e può avere punti d'ingresso in background (nel browser) o servizi (nel kernel, anche a lilOS chiuso); le cartelle si aprono nel File Manager, i file con l'app associata al tipo (Sistema → Usabilità → Tipi di file) o con la finestra "Apri con".
- Ogni finestra che modifica impostazioni usa `SettingsWindow` dell'SDK.
- Cartelle e file passano dal file system dell'SDK (`fs`); la scrivania è la vista della cartella `/Scrivania` del workspace attuale (privata: gli altri workspace non la vedono). Ogni nodo creato ricorda il workspace che l'ha fatto.
- Ogni scorciatoia è un comando registrato con `shortcuts.register` dell'SDK, così l'utente può cambiarla.
