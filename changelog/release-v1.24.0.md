# lilOS 1.24.0 — 3 novembre 2026

lilOS nel suo programma, senza browser, su Windows, macOS e Linux. Da questa release il numero è quello di **lilOS** che il programma installa (qui lilOS 1.24.0, repository ufficiale v1.56.0); il programma in sé è alla 0.2.0. Chi ha il programma 0.1.1 lo riceve come aggiornamento.

## lilOS 1.23.0 → 1.24.0

- **Nuova funzionalità — impostazioni di installazione.** Un file `lilos-install.json` dice dove installare lilOS, quale versione usare (quella portata dall'installer o la più recente del repository ufficiale), quali moduli e con quale configurazione, quali repository e app aggiungere, quali utenti creare e con quali impostazioni iniziali (tema, colore, sfondo…). *Perché:* installare lilOS già pronto per un ufficio o una scuola.
- **Nuova funzionalità — immagini del sistema.** Un lilOS installato e configurato (app, utenti, file) diventa un'immagine con `tools/image.js`; con `"image"` nel file di installazione si installa quella al posto della release ufficiale. *Perché:* copiare un sistema già configurato su altri computer.
- **Sicurezza.** Le password del file di installazione vengono cancellate al primo avvio; le sessioni aperte non entrano mai in un'immagine; un'app non verificata si installa dal file solo con `"allowUnsigned": true` per quell'app.

## Programma lilOS 0.1.1 → 0.2.0

- **Nuova funzionalità — installazione senza domande.** Metti `lilos-install.json` accanto al setup (l'installer di Windows lo copia), accanto all'AppImage o a lilOS.app, oppure nella cartella dati del programma. Con `"mode": "local"` e un amministratore con password (o un'immagine) il programma installa lilOS da solo e apre la finestra con l'accesso già fatto; con `"mode": "server"` apre direttamente il server indicato. *Perché:* preparare molti computer nello stesso modo.
- **Nuova funzionalità — cartella a scelta.** Con `installer.dir` lilOS e il suo database vanno nella cartella indicata invece che nella cartella dati del programma.
- **Correzione bug.** Un'installazione interrotta a metà ora cancella solo quello che l'installazione aveva scritto, non tutta la cartella.
- **Manutenzione.** Il programma pubblicato è più leggero (codice minificato) e la release porta il numero di lilOS.
- **Sicurezza.** Dopo il primo avvio il programma toglie le password dal file nella sua cartella dati; il file messo accanto al programma resta com'è: non lasciarci password.

## Quale file scaricare

| Sistema | File |
| --- | --- |
| Windows (x64) | `lilOS-Setup-1.24.0.exe` (oppure il `.msi`) |
| macOS (Apple Silicon e Intel) | `.dmg` della tua architettura (`arm64` o `x64`) |
| Linux (x64, arm64) | `.AppImage`, oppure `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, openSUSE) |

## Da sapere

- **Il programma non è firmato.** Windows mostra SmartScreen: «Ulteriori informazioni» → «Esegui comunque». macOS lo blocca la prima volta: Impostazioni di sistema → Privacy e sicurezza → «Apri comunque».
- **Il primo avvio su questo computer ha bisogno di internet** e dura qualche minuto; i successivi qualche secondo.
- **Limiti.** Sui Mac Intel le app con una parte in background (servizi isolati) non partono. I pacchetti per macOS e Linux non sono ancora stati provati su quei sistemi: segnala i problemi.
- **Aggiornare.** Il programma 0.1.1 si aggiorna da solo su Windows e Linux (su macOS avvisa). lilOS già installato si aggiorna dall'AppStore → Aggiornamenti → lilOS.
