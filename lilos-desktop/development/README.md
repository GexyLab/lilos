# Il programma lilOS (sviluppo)

Il programma lilOS apre lilOS in una finestra, senza browser, su Windows, macOS e Linux. È un guscio [Electron](https://www.electronjs.org) che:

- apre la pagina di lilOS dall'indirizzo di un kernel: quello che il programma stesso fa girare sul computer (con PostgreSQL), oppure quello di un server;
- oppure fa girare sul computer lilOS **senza UI** (dalla versione 0.4.0): kernel e database senza finestre, usati dal comando `lilos` in un terminale, con il programma ridotto alla sua icona nell'area di notifica;
- aggiunge ciò che un browser non può fare: area di notifica, avvio con il computer, schermo intero e kiosk, numero di notifiche sull'icona, file aperti con i programmi del computer, scelta di porte seriali, USB, HID, Bluetooth e dello schermo da condividere, chiavette USB.

Questa cartella è dove si **lavora**. Perché è fatto così: [D73](../../doc/interna/decisioni.md#d73-il-programma-lilos-un-guscio-electron-con-il-kernel-e-postgresql-inclusi). Il ponte con la pagina (`window.lilosHost`) e le regole di fiducia: [riferimento API](../../doc/sviluppatore/api.md#il-programma-lilos-lilos-desktop). Chi lo usa: [guida utente](../../doc/utente/guida.md#il-programma-lilos).

## Comandi

Serve Node.js 22 o più recente. Da questa cartella:

```bash
npm install        # Electron, electron-builder, electron-updater
npm run runtime    # una volta: scarica Node, git, PostgreSQL e la release di lilOS in runtime/
npm start          # apre il programma
npm run check      # file che si leggono, testi in inglese e italiano, versions.json completo
npm run dist       # gli installer del sistema su cui sei, in dist/ (dist:win, dist:mac, dist:linux)
```

- `LILOS_DESKTOP_DATA=<cartella>` sposta la cartella dei dati del programma (impostazioni, lilOS installato, database, log). Serve per provare il primo avvio da zero senza toccare la propria copia.
- `LILOS_DEVTOOLS=1` abilita gli strumenti per sviluppatori anche nel programma installato; in sviluppo ci sono sempre e si aprono con **Ctrl Maiusc I** (quella scorciatoia c'è solo in sviluppo).
- **Dentro VS Code** il terminale integrato può avere `ELECTRON_RUN_AS_NODE=1`: Electron parte come un semplice Node e il programma non si apre. Toglila prima di `npm start` (`unset ELECTRON_RUN_AS_NODE` in bash, `Remove-Item Env:ELECTRON_RUN_AS_NODE` in PowerShell) o usa un terminale esterno.
- `npm run runtime` accetta `--platform win32|darwin|linux`, `--arch x64|arm64`, `--out <cartella>` e `--lilos <tag>|latest`. Quello che c'è già non si riscarica.
- In sviluppo `npm start` non registra il programma per i link `lilos://`, non cambia l'avvio con il computer e non cerca aggiornamenti: lo fa solo il programma installato (`app.isPackaged`).

## Struttura

```
package.json            versione del programma (in production/ diventa programVersion: version è quella di lilOS, del tag release-vX.Y.Z), script, dipendenze
versions.json           cosa porta il programma: node, git, postgres e il tag della release di lilOS
electron-builder.yml    pacchetti: appId, bersagli per sistema, icone, fuses, feed degli aggiornamenti
scripts/
  fetch-runtime.mjs     scarica Node, git, PostgreSQL e la release di lilOS in runtime/
  check.mjs             controlli prima di un commit o di un pacchetto
build/
  icon.png              l'icona
  first-run             il segno di una nuova installazione: su Windows va in resources/first-run (win.extraResources)
  installer.nsh         installer NSIS: copia lilos-install.json accanto al programma; alla disinstallazione toglie il comando lilos dal PATH
  linux/                la sessione «lilOS» per la schermata di accesso (lilos-session, install-session.sh)
src/
  main.js               avvio: istanza unica, protocollo lilos://, menu di macOS, avvio del kernel, uscita
  windows.js            le finestre di lilOS (una per server): limiti, schermo intero e kiosk, F11, navigazione
  bridge.js             risponde a window.lilosHost e applica le regole di fiducia
  preload.cjs           espone window.lilosHost (le pagine di lilOS) e window.lilosShell (le pagine del programma)
  devices.js            permessi di Chromium; porte seriali, USB, HID, Bluetooth e schermo passati a lilOS da scegliere
  files.js              file tra lilOS e il computer: aprire, esportare, mostrare nella cartella, scegliere una cartella
  drives.js             chiavette USB e schede di memoria: elenco, cambiamenti, espulsione
  tray.js               icona nell'area di notifica e numero di notifiche non lette (senza UI: il suo menu)
  noui.js               lilOS senza UI: installazione, terminale, comando da copiare, log, passaggio alla UI
  command.js, path.ps1  il comando lilos nel PATH dell'utente (Windows: HKCU\Environment; macOS e Linux: ~/.local/bin/lilos)
  terminal.js           apre il terminale del computer con lilos avviato
  license.js            il testo della licenza di lilOS per il passo «Licenza» (repository ufficiale o EULA.md della release)
  updates.js            aggiornamenti del programma (electron-updater)
  autostart.js          avvio con il computer
  installFile.js        lilos-install.json e il segno di una nuova installazione (justInstalled, forgetInstalled)
  store.js              settings.json: impostazioni, server, finestra, porte
  runtime.js            percorsi di ciò che il programma porta (Node, git, PostgreSQL, release) e dei suoi dati
  pages.js, pages/      primo avvio (welcome, anche per la domanda sull'installazione precedente) e pagina di stato (stato, errori)
  local/                il lilOS di questo computer: PostgreSQL (postgres.js), kernel (kernel.js), processi (proc.js),
                        un lilOS già installato (detect.js), l'insieme (index.js)
  i18n.js, locales.json testi del programma, in inglese e in italiano
  credits.json          i riconoscimenti delle librerie portate (Pannello di controllo → Computer → Programma)
  assets/               icone, logo, icone dell'area di notifica
```

## Il runtime incluso

`npm run runtime` mette in `runtime/` ciò che il programma porta (la cartella è ignorata da git). Le versioni sono in `versions.json`:

| Cosa | Da dove | A cosa serve |
| --- | --- | --- |
| **Node.js 22** (`runtime/<sistema>-<architettura>/node`) | nodejs.org, con l'impronta di `SHASUMS256.txt` | Fa girare il kernel e installa le dipendenze dei moduli. Separato da Electron perché `isolated-vm` (di `services-isolate`) ha i binari solo per Node |
| **git portatile** (`.../git`) | [dugite-native](https://github.com/desktop/dugite-native) | Il kernel installa app e moduli da repository git |
| **PostgreSQL 17** (`.../postgres`) | i pacchetti `@embedded-postgres/<sistema>-<architettura>` di npm (impronta del registro) | Il database di `fs-postgres`: ascolta solo su `127.0.0.1`, utente `lilos`, password casuale in `settings.json` |
| **La release di lilOS** (`runtime/lilos`, uguale per tutti) | `system/lilos` del repository ufficiale al tag di `versions.json` | Si installa al primo avvio con `tools/install.js`, poi il kernel si aggiorna dall'AppStore |

I moduli del kernel e le app di sistema **non** sono inclusi: il kernel li scarica dal repository ufficiale al primo avvio. Impacchettato, il programma li ha in `resources/runtime` e `resources/lilos` (`extraResources` di `electron-builder.yml`).

I dati del programma stanno nella cartella dati di Electron (o in `LILOS_DESKTOP_DATA`): `settings.json`, `lilos/` (il lilOS installato, con `config.json` e `current.json`), `postgres/` e `logs/`. Il kernel parte su una porta libera da 8790, PostgreSQL da 5433.

## lilOS senza UI

La terza scelta del primo avvio, **Senza UI** (programma 0.4.0, lilOS 1.34.0 o successivo nella release portata: `NO_UI_MIN` in `noui.js`; con una release più vecchia la scelta è spenta e lo dice). Installa come **Su questo computer** (PostgreSQL e kernel, `local/`), ma:

- **passi** Dove → Licenza → Amministratore → Pronto (`welcome.js`, `order()`). Le altre due scelte restano come prima: lì la licenza la accetta un amministratore al primo accesso, nella pagina di lilOS;
- **la licenza** si legge da `https://raw.githubusercontent.com/GexyLab/lilos-plugins-official/main/LICENSE.md` (8 s; `LILOS_LICENSE_URL` la cambia, come nel kernel) o, senza rete, da `EULA.md` in cima alla release portata (`runtime/lilos/EULA.md`, messa lì da `scripts/release.mjs`). Il testo è mostrato come markdown semplice, costruito a elementi (mai HTML); «Avanti» resta spento finché la casella non è spuntata;
- **`tools/install.js`** riceve `--no-ui` (`"ui": false` in `config.json`, il modulo `terminal-cli`, il repository community) e `--accept-license` (il kernel scrive l'accettazione al primo avvio, `by: "install"`). Il lanciatore `lilos.cmd` / `lilos` accanto a `run.js` lo scrive `install.js` per ogni installazione. `configure()` cambia solo porta e database: `"ui"` resta com'è a ogni avvio; `setUi()` lo toglie solo per il passaggio alla UI;
- **nessuna finestra di lilOS, mai** (`openProfile` non apre il profilo locale): `settings.local.ui = false`, il programma resta nell'area di notifica con kernel e database accesi, anche se «Resta nell'area di notifica» è spento. Il menu dell'icona: stato («lilOS senza UI · acceso», in avvio, fermo, errore) con versione e porta, **Apri il terminale lilOS**, **Copia il comando lilos** (`lilos` se il programma l'ha messo nel PATH, altrimenti il percorso del lanciatore), **Log del kernel** (`logs/kernel.log`), **Riavvia il kernel**, **Avvia all'accensione del computer**, **Passa a lilOS con la UI**, **Esci (ferma lilOS)**. Il clic sull'icona apre il menu. Avviato di nuovo a mano (non `--hidden`), il programma apre il terminale lilOS;
- **il terminale** (`terminal.js`): Windows Terminal (`wt.exe`) se c'è, altrimenti `cmd.exe /k`; su macOS Terminale con `osascript`; su Linux `x-terminal-emulator`, poi `gnome-terminal`, `konsole`, `xterm`. Sempre con il percorso assoluto del lanciatore: funziona anche senza PATH;
- **il PATH** (casella «Aggiungi il comando lilos al PATH»): su Windows `path.ps1` aggiunge la cartella di lilOS al PATH dell'utente in `HKCU\Environment` una volta sola, senza toccare il resto (il tipo `REG_EXPAND_SZ` resta), avvisa Explorer del cambiamento e annota la cartella in `HKCU\Software\GexyLab\lilOS` (`CommandPath`); su macOS e Linux crea il collegamento `~/.local/bin/lilos` e la pagina avvisa se `~/.local/bin` non è nel PATH della shell. `settings.local.command` ricorda la cartella. Lo toglie: la disinstallazione con l'installer `.exe` (`customUnInstall` di `build/installer.nsh`, non negli aggiornamenti) e «Riparti da zero»;
- **«Pronto»** dice «lilOS senza UI è acceso» e come usarlo, con **Chiudi** e **Apri il terminale lilOS**;
- **Passa a lilOS con la UI** (solo in questa direzione, per ora): una domanda, poi kernel e database si fermano, `"ui"` esce da `config.json`, `settings.local.ui` torna `true` e si apre la finestra di lilOS come per «Su questo computer»: il kernel, ripartendo con la UI e senza app, installa da sé le app di sistema;
- **`lilos-install.json`** con `"installer": { "mode": "local" }` e `"kernel": { "ui": false }` sceglie «Senza UI» senza domande se ha anche l'amministratore (o un'immagine) e `"acceptLicense": true`: la pagina di benvenuto va diretta a «Pronto» (avvio con il computer e PATH accesi). Senza `acceptLicense` chiede solo la licenza; senza amministratore preseleziona «Senza UI» e chiede tutto.

Se il kernel esce con il codice 3 (licenza non accettata e nessun terminale per chiederla), l'errore lo dice chiaramente (`local.error.license`), nella pagina di stato e nel menu dell'icona.

## Installare di nuovo il programma (solo Windows)

Disinstallare il programma non cancella `%APPDATA%\lilOS` (impostazioni, lilOS installato, database). Perciò, se si reinstalla e `settings.json` ha dei server, il primo avvio non apre il solito server ma la pagina di benvenuto in modalità `previous` («lilOS era già installato qui»), con due scelte:

- **Usa l'installazione precedente** (`welcome.keep`): cancella il segno e continua come sempre (`resume()` in `main.js`). La pagina elenca i server e, se c'è, il lilOS locale con versione e cartella (`welcome.previous`).
- **Riparti da zero** (`welcome.fresh`): `local.discard()` ferma il kernel e il database e **rinomina** le cartelle in `<cartella>.old-AAAAMMGGhhmm` (data e ora del computer; il database dentro la cartella di lilOS, con `installer.dir`, segue la cartella); con la casella «Elimina invece…» e una conferma (`erase: true`) le **cancella**. Poi `store.reset()` riporta le impostazioni a quelle di una nuova installazione, `startAtLogin` si spegne (`setAutostart(false)`) e riparte `firstStart()` (pagina di benvenuto o `lilos-install.json`). `useLilosDir()` senza argomento rimette le cartelle predefinite.

**Come il programma riconosce una nuova installazione.** `electron-builder.yml` (`win.extraResources`) mette `build/first-run` in `resources/first-run`, per `.exe` e `.msi`. `justInstalled()` (`installFile.js`) è vero se il file c'è; `forgetInstalled()` lo cancella dopo la scelta (o subito, se non ci sono server salvati). `LILOS_FIRST_RUN=<percorso>` indica un altro file (prove): si prova con `LILOS_DESKTOP_DATA` e `LILOS_FIRST_RUN`.

**Gli aggiornamenti automatici** reinstallano il segno. Per questo `updates.js`, all'evento `update-downloaded`, scrive `settings.updating = <versione scaricata>`; al primo avvio, se `updating` è uguale alla versione in esecuzione, `justInstalled()` cancella il segno e non chiede niente. Su macOS e Linux il segno non c'è e la domanda non compare.

## Chiudere il programma dalla pagina

`window.lilosHost.quit` (`host.quit()` dell'SDK, solo per profili di fiducia: non è in `OPEN` di `bridge.js`) risponde e dopo 100 ms chiama `app.quit()`. L'evento `before-quit` ferma già il lilOS locale (kernel e database). Lo usa il tasto **Arresta** della pagina utente (lilOS 1.26.0).

## Pubblicare

1. Si lavora in questa cartella. Si alza `version` in `package.json` (la versione del programma) e, se cambia la release di lilOS o una versione portata, `versions.json`. `npm run check` deve passare.
2. A «pubblica release», dopo aver pubblicato lilOS nel repository ufficiale e messo il suo tag in `versions.json`, dalla radice del repository si esegue `npm run release:desktop`: rifà `lilos-desktop/production/` da quello che è committato qui, minificato e senza quello che serve solo a sviluppare. Lì `package.json` ha `version` = **la versione di lilOS portata** e `programVersion` = la versione del programma: la release, gli installer e gli aggiornamenti dicono la versione di lilOS. Se il tag `release-v` di quella versione c'è già, lo script si ferma: serve prima una nuova versione di lilOS, anche quando cambia solo il programma.
3. Si scrive `changelog/release-vX.Y.Z.md`, si fa il commit, il push e il tag `release-vX.Y.Z` (X.Y.Z = lilOS). Il workflow `.github/workflows/lilos-desktop.yml` controlla che tag e versione siano uguali, poi costruisce da `production/`:
   - **Windows** (x64): `lilOS-Setup-<versione>.exe` (NSIS) e `lilOS-<versione>.msi`;
   - **macOS**: `lilOS-<versione>-arm64.dmg` e `-x64.dmg`, più gli zip;
   - **Linux**: `lilOS-<versione>-x64.AppImage` e `-arm64.AppImage`, `lilos_<versione>_<arch>.deb` e `lilos-<versione>.<arch>.rpm`;
   - e crea la release GitHub «lilOS X.Y.Z» (`changelog/release-vX.Y.Z.md` come note, se c'è), con i file `latest*.yml` da cui il programma si aggiorna. Le release `desktop-v*` di prima restano.
4. Con `workflow_dispatch` si possono provare i pacchetti senza creare la release.

Nessun certificato per ora: su Windows compare SmartScreen, su macOS i pacchetti sono firmati solo *ad hoc* (`identity: "-"`) e si apre con «Apri comunque». Su macOS gli aggiornamenti non si installano da soli: il programma avvisa e basta. L'aggiornamento automatico usa `releases/latest/download` del repository: la release «latest» deve essere quella del programma.

## Limiti noti

- **lilOS senza UI non è stato provato su macOS e Linux** (terminale, `~/.local/bin`, nessuna icona nel Dock), né con un vero installer Windows: il PATH lo toglie solo la disinstallazione dell'installer `.exe` (l'`.msi`, i pacchetti di Linux e macOS non hanno un passo di disinstallazione per l'utente; lì resta il collegamento o la voce nel PATH, che punta a un lanciatore senza più Node).
- **Mac con processore Intel.** `services-isolate` non ha binari `isolated-vm` per `darwin-x64`: i servizi in background delle app isolate non partono.
- **La domanda sull'installazione precedente c'è solo su Windows** (il segno di una nuova installazione è nel `win.extraResources`) e non è stata provata con un vero `.msi` o `.exe` reinstallato, né con un aggiornamento automatico.
- **Il primo avvio ha bisogno di internet.** Moduli del kernel e app di sistema si scaricano dal repository ufficiale; senza rete il primo avvio non si completa (non provato).
- **I pacchetti di macOS e Linux non sono stati provati su quei sistemi.** Sono costruiti dal workflow ma non sono mai stati aperti su un Mac o su un Linux vero: gli aggiornamenti, il kiosk, la sessione «lilOS» con `cage`, l'avvio con il computer (`~/.config/autostart/lilos.desktop`) e le icone dell'area di notifica vanno controllati.
- **Fotocamera e microfono.** Il programma concede alla pagina i permessi `media`, ma le app isolate non hanno ancora API per usarli in lilOS.
- **Keyboard Lock.** Per far arrivare a lilOS il tasto Windows e Alt+Tab a schermo intero il programma chiede `navigator.keyboard.lock()` dopo aver messo la pagina a schermo intero. Se funzioni davvero su ogni sistema è da verificare; Ctrl+Alt+Canc resta sempre di Windows.
- **Senza firma:** SmartScreen su Windows, «Apri comunque» su macOS e nessun aggiornamento automatico su macOS.
- **Sessione Linux «lilOS».** È sempre in kiosk e senza icona nell'area di notifica; uscire dal kiosk (Pannello di controllo → Computer → Schermo, da amministratore) chiude il programma e con lui la sessione.
