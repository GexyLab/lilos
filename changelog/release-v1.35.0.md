# lilOS 1.35.0 — 7 novembre 2026

lilOS nel suo programma, senza browser, su Windows, macOS e Linux. Questa release porta **lilOS 1.35.0** (repository ufficiale v1.62.0) e il **programma 0.4.1**. Chi ha una release precedente la riceve come aggiornamento.

## lilOS 1.32.0 → 1.35.0

- **Correzione bug — installazione nuova.** Con le release 1.32.0 (e lilOS 1.33.0) un'installazione nuova che prendeva i moduli dal repository ufficiale si fermava: l'installatore non sapeva leggere il catalogo, che ha anche i pacchetti di lingua. Ora funziona.
- **Nuova funzionalità — citazioni nelle schermate di accesso e di blocco.** Al posto dell'elenco a sinistra c'è una citazione da film e scienziati, con l'autore sotto: scelta a caso, cambia ogni 2 minuti con una dissolvenza.
- **Nuova funzionalità — lilOS senza interfaccia** (lilOS 1.34.0). Il kernel può girare senza la pagina di lilOS e si gestisce dalla riga di comando con il comando `lilos` (modulo `terminal-cli`): accesso, AppStore per moduli, lingue e lilOS stesso, licenza.
- **Nuova funzionalità — file fino a 1 GB e quote per utente** (lilOS 1.33.0). Il limite di 10 MB per file non c'è più; un amministratore imposta il limite e le quote in Pannello di controllo → Archiviazione. I file grandi si caricano a pezzi e un invio interrotto riparte.
- **Sicurezza — users-basic 1.2.0.** Cambiare la password dalla console chiede la vecchia password (o un amministratore con `--reset`); dopo 3 password sbagliate l'utente è bloccato per 5 minuti.

## Programma lilOS 0.3.0 → 0.4.1

- **Nuova funzionalità — «Senza UI».** Terza scelta al primo avvio: kernel e database girano sul computer senza finestre, il programma resta come icona nell'area di notifica (stato, terminale lilOS, comando `lilos` da copiare, log, riavvio, passaggio a lilOS con la UI). Il comando `lilos` può essere aggiunto al PATH. Si può scegliere anche da `lilos-install.json`. Richiede lilOS 1.34.0 o successivo, che questa release porta.

## Quale file scaricare

| Sistema | File |
| --- | --- |
| Windows (x64) | `lilOS-Setup-1.35.0.exe` (oppure il `.msi`) |
| macOS (Apple Silicon e Intel) | `.dmg` della tua architettura (`arm64` o `x64`) |
| Linux (x64, arm64) | `.AppImage`, oppure `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, openSUSE) |

## Da sapere

- **Il programma non è firmato.** Windows mostra SmartScreen: «Ulteriori informazioni» → «Esegui comunque». macOS lo blocca la prima volta: Impostazioni di sistema → Privacy e sicurezza → «Apri comunque».
- **Il primo avvio su questo computer ha bisogno di internet** e dura qualche minuto. I successivi qualche secondo.
- **La licenza:** al primo accesso dopo l'installazione, entra come amministratore e accettala (con «Senza UI» la accetti nel programma).
- **Limiti.** Sui Mac Intel le app con una parte in background (servizi isolati) non partono. I pacchetti per macOS e Linux, e «Senza UI» fuori da Windows, non sono ancora stati provati su sistemi veri: segnala i problemi.
- **Aggiornare.**
  - Il programma si aggiorna da solo su Windows e Linux; su macOS avvisa.
  - Un lilOS già installato si aggiorna da AppStore → Aggiornamenti → lilOS; poi aggiorna users-basic e la tua lingua.
