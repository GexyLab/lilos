# lilOS
LilOS è un sistema operativo web basato su un backend in nodejs che fà da kernel e un frontend che fà  da ambiente desktop in cui possono essere installate app o usate web app ospitate in altri ambienti. Il backend è fatto a moduli per astrarre filesystem, autenticazione, e tutti gli altri aspetti, in modo da poter utilizzare altri prodotti cloud(come OpenBack, Google, AWS, etc) ed esporli all'utente come classici componenti di un sistema operativo(file, directory, finestre, widget, etc). L'idea alla base di LilOS è avere il proprio ambiente di lavoro ovunque che possa integrare e raggruppare tutti i prodotti propri e di terze parti in un unico ambiente.

L'ambiente desktop è pensato come un canvas infinito, elementi del desktop (cartelle, file, app), workarea (aree della scrivania che tengono insieme icone e finestre), workspace (scrivanie separate, ognuna con i suoi elementi, finestre e app), barra delle applicazioni e menu di avvio.
Desktop web su una scrivania infinita: canvas con zoom e spostamento. I dati stanno in un backend, il **kernel** (`system/kernel/`), con un account per ogni utente. Le app (File Manager, Editor, Pannello di controllo, AppStore e Pianificazione comprese) e i moduli del kernel sono pacchetti che si installano dai repository: quello ufficiale è [GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official), che ha solo i pacchetti già costruiti. I sorgenti delle app e dei moduli ufficiali stanno in questo repository, sotto `plugins/`.

Documentazione completa in [doc/](doc/README.md): [guida utente](doc/utente/guida.md), [sviluppatore](doc/sviluppatore/README.md), [interna](doc/interna/README.md). SDK: [sdk/README.md](sdk/README.md).

## Dove gira
Può essere self-hosted in docker oppure in versione cloud gestita in OpenBack. Sul proprio computer si usa anche con il **programma lilOS** (`lilos-desktop/`): lilOS in una finestra, senza browser, con kernel e database inclusi; vedi la [guida utente](doc/utente/guida.md#il-programma-lilos) e il [README del programma](lilos-desktop/development/README.md).

## Avvio

lilOS non ha dipendenze a runtime (solo Vite per lo sviluppo). File Manager, Editor, Pannello di controllo, AppStore e Pianificazione si installano come pacchetti: il kernel installa da solo, all'avvio, quelle che mancano. Un lilOS installato le prende dal repository ufficiale (privato: servono `git` e le credenziali git del computer); questa copia di sviluppo dal suo repository di sviluppo, costruito da `plugins/` con `npm run dev:update`. Dettagli in [doc/sviluppatore](doc/sviluppatore/README.md#il-kernel-il-backend).

```bash
npm install
npm run kernel:setup                                    # una volta: dipendenze dei moduli del kernel (anche isolated-vm, per i servizi)
npm run db:up                                           # PostgreSQL in Docker (127.0.0.1:5433)
npm run kernel:cli -- users-basic add <nome> --admin    # una volta: crea un utente
npm run dev:start                                       # aggiorna da development (app e moduli di plugins/ compresi), avvia kernel (8791) e pagina
                                                        # lilOS su http://localhost:5173 (/api va al kernel)
npm run build                                           # build in dist/
```

Il sistema non parte senza il kernel. Serve Node.js 22 o più recente e, per il database di sviluppo, Docker.

### Installare da una release

Un lilOS installato non usa Vite né i sorgenti: il kernel serve anche la pagina, e un amministratore lo aggiorna dall'AppStore (voce **lilOS**: la versione nuova parte al riavvio del kernel, e se non parte lilOS torna da solo alla precedente). La release sta nella cartella `system/lilos` del repository ufficiale; da lì:

```bash
node system/kernel/tools/install.js <cartella>                  # una nuova installazione (moduli dal repository ufficiale)
node system/kernel/tools/install.js <cartella> --from <system/kernel di questa copia>   # con configurazione, moduli e utenti
node system/kernel/tools/install.js --settings lilos-install.json     # utenti, app, moduli e impostazioni scritti in un file (anche da un'immagine del sistema)
cd <cartella> && node run.js
```

Per fare la release di questa versione (la versione di lilOS è `version` di `package.json`): `npm run release -- <cartella del repository ufficiale>`. Nel repository ufficiale vanno solo la build, `README.md` e `CHANGELOG.md`. Il file `lilos-install.json` e le immagini del sistema: [ricette](doc/sviluppatore/ricette.md#installare-lilos-con-un-file-di-impostazioni) e [riferimento](doc/sviluppatore/api.md#impostazioni-di-installazione-lilos-installjson-e-immagini-del-sistema). La release del programma lilOS (tag `release-vX.Y.Z`): `npm run release:desktop` ([processo](doc/interna/processo.md#rilascio)). Dettagli: [ricette](doc/sviluppatore/ricette.md#pubblicare-una-versione-di-lilos). Dettagli in [doc/sviluppatore](doc/sviluppatore/README.md#il-kernel-il-backend).

## Struttura

```
sdk/                    @lilos/sdk: basi riutilizzabili da sistema e app
  index.js              unico punto d'ingresso
  core/                 h(), svg(), trackDrag(), Emitter + bus, storage, session
  core/kernel.js        client del kernel: richieste, accesso, sincronizzazione delle modifiche
  core/apps.js          app installate: elenco, installa, aggiorna, rimuovi; repository, moduli del kernel e versioni di lilOS (systemReleases)
  core/settings.js      preferenze dell'utente
  core/kernelSettings.js  le impostazioni del kernel e i limiti dei file (dimensione massima, quota, soglie dei pezzi)
  core/locale.js        lingua del sistema, traduzioni delle app e pacchetti di lingua di lilOS (con core/i18n.js, il motore, e core/strings.js)
  core/fs.js            file system virtuale (cartelle, file, collegamenti; salvato nel kernel)
  core/net.js           rete: connessioni a server remoti (cartella Rete) e trasferimenti fatti dal kernel
  core/serial.js        porte seriali del computer dell'utente (Web Serial), con un canale per porta
  core/term.js          terminali remoti: host salvati e sessioni (SSH, Telnet, rlogin, SUPDUP) nel kernel
  core/calls.js         richieste di rete fatte dal kernel (NetTest): HTTP, GraphQL, collezioni, OAuth 2.0, sessioni vive
  core/pipes.js         pipe sugli eventi: le app si mettono in mezzo a ciò che succede (con core/pipeCatalog.js, gli eventi)
  core/automation.js    automazioni: azioni, registrazione di ciò che fa l'utente e gestori per rifarlo (app Automata)
  core/schedule.js      pianificazione: operazioni a una data e ora o ripetute, fatte dal kernel (con core/scheduleRules.js, le regole)
  core/tags.js          tag colorati per ritrovare file e cartelle, anche nascondendoli
  ui/                   icone, menu, controlli, Window, SettingsView, SettingsWindow
  styles/               token, base, componenti, finestre (@lilos/sdk/styles.css)
scripts/
  host-shims.mjs        genera public/host/sdk.js e system.js (predev, prebuild)
  release.mjs           la build di lilOS per il repository ufficiale (npm run release)
  lilos-strings.mjs     legge i testi di lilOS dal codice (la base dei pacchetti di lingua)
plugins/                sorgenti delle app, dei moduli e dei pacchetti di lingua ufficiali (src/<app>, src/shared, modules/<nome>, languages/<lingua>, scripts/, catalog.json); npm install e npm run build si fanno qui
public/host/            i moduli che le app di sistema importano come @lilos/sdk e @lilos/system (generati)
system/
  kernel/               il backend: moduli (users-basic, fs-postgres, services-isolate: fa girare i servizi delle app, scheduler: la Pianificazione, un modulo obbligatorio, notifications-basic: le notifiche, ssh (anche SFTP), netfs-ftp, netfs-webdav, netfs-smb: i protocolli di rete della cartella Rete; OneDrive, Google (Drive e Foto), S3, Azure Blob Storage e NFS sono moduli del repository ufficiale; ssh, term-telnet, term-rlogin, term-supdup: i protocolli dei terminali remoti, usati dall'app Terminale; call-grpc e call-mqtt: i protocolli in più di NetTest), API, repository, installazione di app e moduli, aggiornamenti di lilOS (releases/ e current.json in un lilOS installato), limiti dei file, quote e impostazioni del kernel (settings.js, files.js), riga di comando; run.js lo avvia, lo riavvia e prova le versioni nuove
examples/apps/note/     app di esempio (lilos.json, index.js)
lilos-desktop/          il programma lilOS (Electron, per Windows, macOS e Linux): development/ per lavorare, production/ da cui si pubblica (la rifà npm run release:desktop; vedi lilos-desktop/development/README.md)
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
    DeskWidget.js       un file disegnato dal widget della sua app (Note adesive)
    widgets.js          quale widget mostra un file (widgetFor) e come si carica
    reveal.js           mostrare o portare un elemento da un'altra scrivania (revealOnDesk, bringToDesk)
    DesktopItem.js      componente singolo (cartella / file / app)
    itemIcons.js        icone grandi di cartelle, file e workarea, con i segni delle app
    fixedItems.js       elementi fissi: Home, Documenti, Immagini, File Manager, Download, Cestino
    seed.js             elementi della Scrivania al primo avvio
  systemSettings.js     impostazioni del sistema
  systemHistory.js      annulla e ripeti (Ctrl Z, Ctrl Y)
  systemTrash.js        pulizia automatica del cestino
  systemFs.js           cartelle di sistema, primo avvio, migrazione
  items/                "Proprietà…" di file e cartelle, comandi comuni a desktop e File Manager, eliminazione (cestino, conferma), trascinamento tra viste, ordine e collegamenti della barra del File Manager
  tags/                 pallini e menu dei tag, usati da scrivania, File Manager e Pannello di controllo
  apps/
    registry.js         le app installate (nessuna è integrata), quali sono visibili nel workspace + launch()
    packages/           app installate: nel registro; le app di sistema girano in lilOS, le altre isolate (sandbox, con l'oggetto lilos) o, se un amministratore lo sceglie, nella pagina di lilOS; punti d'ingresso in background; operazioni per utente
    launcher.js         apre le app in finestre
    entrypoints.js      punti d'ingresso delle app (finestre e background)
    startup.js          app che si aprono da sole all'ingresso (Pannello di controllo → Avvio)
    services.js         servizi delle app nel kernel: client e avvisi
    appProperties.js    "Proprietà…" di un'app: Generale, Permessi, Sicurezza
    open.js             quale app apre quale tipo di file
    pipes.js            le app installate nelle pipe sugli eventi (iscrizioni, permessi)
    appActions.js       voci che le app aggiungono al menu di file e cartelle
    systemEvents.js     eventi del sistema per le pipe: finestre, workspace, impostazioni, app, sessione
    openWith.js         finestra "Apri con"
    commands.js         scorciatoie delle app
  workareas/            aree della scrivania con icone e finestre: ridurre a icona, riaprire, proprietà
  workspaces/           scrivanie separate: elenco salvato, avvio e migrazione, cambio, pulsante nella barra delle applicazioni
  input/
    sendKey.js          tasti mandati senza tastiera (tastiere a schermo)
  windows/
    WindowManager.js    finestre sulla scrivania e nella barra delle applicazioni
  user/                 pagina utente a tutto schermo (nome, foto, Blocca, Esci, Riavvia il sistema, Arresta, tema, lingua)
  net/                  rete: connessioni come cartelle in Rete, finestra Trasferimento dati e suo pulsante nella barra
  notifications/        notifiche: campanella e barra delle notifiche nell'area di notifica, finestra Notifiche
  automation/           automazioni: azioni di lilOS, registratore, file .automata, esecuzione ed elenco (REC nell'area di notifica)
  schedule/             pianificazione: le operazioni che girano nel browser (aprire app e file, automazioni) e la finestra Operazioni in attesa
  taskbar/
    Taskbar.js          barra delle applicazioni: pulsante logo · pulsante workspace · area finestre · area di notifica · utente (apre la pagina utente) e orologio
    StartMenu.js        menu di avvio a schermo intero: ricerca, preferite, app per schede (recenti e frequenti, workarea, categorie), file recenti e frequenti, un pulsante per workspace
    usage.js            preferite e cronologia di app e file del menu di avvio, per workspace
    BackgroundApps.js   icona delle app in background rimaste attive, con "Ferma" (area di notifica)
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
| Menu di avvio | pulsante logo, Ctrl K; in alto il tuo nome (apre la pagina utente), Pannello di controllo ed Esci (con più utenti); Esc lo chiude |
| Pagina utente | clic sul tuo nome nella barra delle applicazioni o nel menu di avvio; Esc la chiude |
| Notifiche | campanella nell'area di notifica (in basso a destra) apre la finestra Notifiche; la barra delle notifiche si chiude con Esc o la ×; scorciatoia «Apri o chiudi le notifiche» (senza tasto di serie); Pannello di controllo → Notifiche |
| Automazioni (app Automata) | pulsante REC nell'area di notifica mentre si registra (riapre il Registratore); tasto destro su file o cartelle → Automazioni (esegue o «Registra partendo da qui»); Ctrl Z / Ctrl Y mentre si registra tolgono e rimettono l'ultimo passo; scorciatoia scelta in Automata; nel Terminale `automata list` e `automata run <nome> [file…]` |
| NetTest (app di sistema, da installare) | menu di avvio → NetTest; Ctrl Invio invia la richiesta (o collega la sessione), Ctrl S salva la collezione, Ctrl Alt N nuova richiesta HTTP, Ctrl Alt W chiude la scheda; nel Terminale `nettest run`, `nettest send`, `nettest list`; Pannello di controllo → Rete (amministratori) per le regole di rete |
| Pianificazione (app di sistema) | menu di avvio → Pianificazione: Elenco e Storico delle operazioni, Nuova operazione (Cosa, Quando, Opzioni); tasto destro su file o cartelle → Pianifica (copia, comando, apri, automazione, promemoria) |
| Note adesive (app di sistema, dall'AppStore) | tasto destro sulla scrivania → Nuovo → Nota adesiva; doppio clic o Invio per scrivere, Esc per finire; campanella per il promemoria; menu di avvio → Note adesive: le note di ogni workspace (Mostra, Porta qui) |
| Elementi | doppio clic apre, F2 rinomina, Canc elimina (nel Cestino), Ctrl A seleziona tutto, Ctrl/Shift + clic selezione multipla |
| Spostare file e cartelle | trascina un elemento (o la selezione) su una cartella: sulla scrivania, nel File Manager (elenco, percorso, barra laterale) o nel pannello dell'Editor, anche da una vista all'altra; Esc annulla; rilasciato sul Cestino lo elimina; tra due voci della sezione Collegamenti del File Manager crea un collegamento, e le voci si riordinano trascinandole (con × o Canc si elimina un collegamento) |
| Annulla / ripeti | Ctrl Z / Ctrl Y (o Ctrl Shift Z), dove stai lavorando: scrivania, finestra del File Manager, testo e pannello dell'Editor |
| Nuova cartella / file / workarea | tasto destro sullo sfondo → Nuovo |
| Workarea | tasto destro su un'icona selezionata → Crea una workarea con la selezione; trascina la barra del titolo per spostarla, bordi e angoli per ridimensionarla, doppio clic sul titolo per rinominarla, pulsante con il trattino per ridurla a icona (doppio clic o Invio sull'icona la riapre) |
| Workspace | pulsante accanto al logo (menu: elenco, Nuovo workspace, Gestisci), Ctrl Alt → / Ctrl Alt ← per passare al successivo o al precedente |
| Tag | tasto destro su un elemento → Tag (assegna, "Nuovo tag…", "Gestisci i tag…"); nel File Manager, voce del tag nella barra laterale per vedere tutti gli elementi con quel tag; Pannello di controllo → Tag per colori e visibilità (un tag invisibile nasconde i suoi elementi) |
| Spazio e limiti dei file | Pannello di controllo → Archiviazione → Il mio spazio: spazio usato (cestino compreso), quota e file più grande (di serie 1 GB); per gli amministratori le schede Limiti e Utenti |
| Finestre | trascina il titolo, bordi e angoli per ridimensionare, doppio clic sul titolo per ingrandire, pulsante nella barra delle applicazioni per riaprire o ridurre, Alt W chiude, Alt N passa alla successiva |
| Editor (app opzionale) | Ctrl S salva, Ctrl Alt N nuovo documento, Ctrl O apri un file, Ctrl Alt O apri una cartella (pannello a destra), Ctrl B mostra o nasconde la cartella, Ctrl Spazio suggerimenti (compaiono anche da soli), Tab / Shift Tab rientro |

Tutte le scorciatoie (tranne Spazio + trascina e i tasti di navigazione nei menu) si cambiano nel Pannello di controllo → Usabilità → Scorciatoie.

## Convenzioni

- Le basi riutilizzabili nascono nell'SDK e si importano da `@lilos/sdk`. L'SDK non importa mai da `src/`.
- Tutto ciò che sta sulla scrivania si aggiunge con `canvas.add(el)` e ha `data-kind` (usato dalla minimappa).
- Gli elementi con `data-wheel="native"` (es. contenuto delle finestre) scorrono con la rotella invece di zoomare.
- Le app comunicano col sistema tramite `bus` dell'SDK. Ogni app è un pacchetto (`lilos.json`) installato dal kernel: un'app di sistema (File Manager, Editor, Pannello di controllo, AppStore, Pianificazione: dal repository ufficiale) gira dentro lilOS e usa `@lilos/sdk` e `@lilos/system`; un'altra app gira, per impostazione predefinita, in un iframe isolato e parla con lilOS solo con l'oggetto `lilos` (un amministratore può farla girare non isolata: allora può fare tutto ciò che fa l'utente) e può avere punti d'ingresso in background (nel browser) o servizi (nel kernel, anche a lilOS chiuso); le cartelle si aprono nel File Manager, i file con l'app associata al tipo (Pannello di controllo → Usabilità → Tipi di file) o con la finestra "Apri con".
- Ogni finestra che modifica impostazioni usa `SettingsWindow` dell'SDK.
- Cartelle e file passano dal file system dell'SDK (`fs`); la scrivania è la vista della cartella `/Scrivania` del workspace attuale (privata: gli altri workspace non la vedono). Ogni nodo creato ricorda il workspace che l'ha fatto.
- Ogni scorciatoia è un comando registrato con `shortcuts.register` dell'SDK, così l'utente può cambiarla.

## Licenza

- **Sorgenti** (questo repository): [PolyForm Strict 1.0.0](LICENSE.md), © 2026 Eugenio Liguori. Si possono leggere e usare solo per scopi non commerciali (studio, prove, progetti personali, scuole, enti senza scopo di lucro). **Non si possono ridistribuire, modificare né usare per farne altri prodotti**, nemmeno non commerciali.
- **SDK** (`sdk/`): [MIT](sdk/LICENSE). Serve a chiunque scriva app per lilOS.
- **lilOS già costruito** (il programma e gli installer delle release, i pacchetti del repository ufficiale): [licenza d'uso](EULA.md). Tutti, aziende comprese, possono installarlo e usarlo gratis; non si può ridistribuire, modificare, offrire come servizio a terzi né usare per farne prodotti.
- **Componenti di terzi**: restano con le loro licenze, per esempio `plugins/modules/netfs-smb/lib/smb3-client/` (MIT), le grammatiche tree-sitter in `plugins/src/editor/public/tree-sitter/` e le dipendenze npm. L'elenco è in lilOS, in Pannello di controllo → Informazioni → Riconoscimenti.

Per altri usi (prodotti, servizi, ridistribuzione, una licenza commerciale): e.liguori@gexy.it.

*License: sources under PolyForm Strict 1.0.0 (noncommercial use only, no distribution, no changes or derivative works); SDK under MIT; the built program and packages under the [lilOS License Agreement](EULA.md) (free use for everyone, companies included; no redistribution, changes, hosting for others or derivative products).*
