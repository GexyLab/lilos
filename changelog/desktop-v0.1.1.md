# lilOS (programma) 0.1.1 — 3 novembre 2026

La prima versione del **programma lilOS**: lilOS nella sua finestra, senza browser, su Windows, macOS e Linux. Al primo avvio installa lilOS 1.23.0 (repository ufficiale v1.55.0).

## Programma lilOS 0.1.1 (nuovo)

- **Nuova funzionalità — tre modi di usarlo.** Al primo avvio scegli: **Su questo computer** (il programma installa lilOS con kernel, PostgreSQL 17, Node 22 e git inclusi: niente da installare a parte), **Collegato a un server** (un lilOS su un altro computer, anche più server con profili separati), oppure **il lilOS già installato** su questo computer, se il programma lo trova. *Perché:* usare lilOS come un programma del computer, non come un sito.
- **Nuova funzionalità — come un programma del computer.** Icona nell'area di notifica (chiudendo la finestra lilOS resta acceso; **Esci** lo spegne), numero di notifiche sull'icona, notifiche del sistema, avvio con il computer, link `lilos://`, i tasti di scelta rapida vanno a lilOS.
- **Nuova funzionalità — finestra, schermo intero o kiosk.** In kiosk lilOS occupa tutto lo schermo; si esce solo con la password di un amministratore di lilOS.
- **Nuova funzionalità — file del computer.** Apri sul computer, Mostra nella cartella del computer ed Esporta sul computer dal File Manager; file trascinati dal computer in lilOS; le cartelle del computer e le chiavette USB in **Rete › Questo computer**.
- **Nuova funzionalità — dispositivi.** Porte seriali, USB e gli altri dispositivi si scelgono da lilOS; nel Pannello di controllo → Computer → Hardware si decide se le app li usano chiedendo ogni volta, solo quelle che lo dichiarano, o tutte.
- **Nuova funzionalità — aggiornamenti.** Il programma controlla le nuove versioni in queste release e si aggiorna da solo su Windows e Linux; su macOS avvisa e basta. lilOS dentro il programma si aggiorna dall'AppStore come sempre.

## Quale file scaricare

| Sistema | File |
| --- | --- |
| Windows (x64) | `lilOS-Setup-0.1.1.exe` (oppure il `.msi`) |
| macOS (Apple Silicon e Intel) | `.dmg` della tua architettura (`arm64` o `x64`) |
| Linux (x64, arm64) | `.AppImage`, oppure `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, openSUSE) |

## Da sapere

- **Il programma non è firmato.** Windows mostra SmartScreen: «Ulteriori informazioni» → «Esegui comunque». macOS lo blocca la prima volta: Impostazioni di sistema → Privacy e sicurezza → «Apri comunque».
- **Il primo avvio su questo computer ha bisogno di internet** e dura qualche minuto (scarica moduli e app di lilOS); i successivi qualche secondo.
- **Limiti.** Sui Mac Intel le app con una parte in background (servizi isolati) non partono. I pacchetti per macOS e Linux e il kiosk su quei sistemi non sono ancora stati provati: segnala i problemi. Su Linux la sessione «lilOS» (lilOS come desktop intero) si installa con `sudo sh /opt/lilOS/resources/session/install-session.sh` (serve `cage`).
