# lilOS 1.36.0 — 10 novembre 2026

lilOS nel suo programma, senza browser, su Windows, macOS e Linux. Questa release porta **lilOS 1.36.0** (repository ufficiale v1.64.0) e il **programma 0.4.2**. Chi ha una release precedente la riceve come aggiornamento.

## Programma lilOS 0.4.1 → 0.4.2

- **Correzione bug — errore alla chiusura.** Chiudendo lilOS compariva la finestra «Uncaught Exception: Object has been destroyed». Il programma, a finestra già chiusa, cercava ancora di leggerne il contenuto per toglierla dall'elenco delle finestre aperte. Ora si chiude senza errori.

## lilOS 1.35.0 → 1.36.0

- **Nuova funzionalità — Ctrl + doppio clic apre una finestra nuova** (1.36.0). Ctrl (⌘ su macOS) + doppio clic su una cartella della scrivania la apre in una finestra nuova del File Manager. Prima finiva sempre nella finestra già aperta. Vale anche per Home, Documenti, Cestino e i collegamenti a una cartella. Il doppio clic normale continua a usare la finestra già aperta.
- **Correzione bug — citazioni nella lingua giusta** (1.35.2). Nelle schermate di accesso e di blocco compaiono solo le citazioni tradotte nella lingua di lilOS, mai quelle inglesi di ripiego.
- **Miglioramento — pacchetti di lingua aggiornati da soli** (1.35.2). A ogni avvio il kernel aggiorna i pacchetti di lingua installati. Prima un lilOS aggiornato poteva tenere un pacchetto vecchio senza i testi nuovi.
- **Miglioramento — citazioni come si conoscono** (1.35.1). Le citazioni non hanno più le virgolette. In ogni lingua le battute dei film sono quelle note lì (doppiaggi e sottotitoli), non traduzioni dell'italiano.
- **Correzione bug — Pianificazione 1.2.1** (dall'AppStore). Dopo aver aperto Pianificazione, nell'Editor i numeri di riga finivano sopra il testo: le due app usavano gli stessi nomi di stile.

## Quale file scaricare

| Sistema | File |
| --- | --- |
| Windows (x64) | `lilOS-Setup-1.36.0.exe` (oppure il `.msi`) |
| macOS (Apple Silicon e Intel) | `.dmg` della tua architettura (`arm64` o `x64`) |
| Linux (x64, arm64) | `.AppImage`, oppure `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, openSUSE) |

## Da sapere

- **Il programma non è firmato.** Windows mostra SmartScreen: «Ulteriori informazioni» → «Esegui comunque». macOS lo blocca la prima volta: Impostazioni di sistema → Privacy e sicurezza → «Apri comunque».
- **Il primo avvio su questo computer ha bisogno di internet** e dura qualche minuto. I successivi qualche secondo.
- **La licenza:** al primo accesso dopo l'installazione, entra come amministratore e accettala (con «Senza UI» la accetti nel programma).
- **Limiti.** Sui Mac Intel le app con una parte in background (servizi isolati) non partono. I pacchetti per macOS e Linux, e «Senza UI» fuori da Windows, non sono ancora stati provati su sistemi veri: segnala i problemi.
- **Aggiornare.**
  - Il programma si aggiorna da solo su Windows e Linux; su macOS avvisa.
  - Un lilOS già installato si aggiorna da AppStore → Aggiornamenti → lilOS; poi aggiorna Pianificazione se la usi.
