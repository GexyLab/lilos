# lilOS 1.27.0 — 3 novembre 2026

lilOS nel suo programma, senza browser, su Windows, macOS e Linux. Questa release porta **lilOS 1.27.0** (repository ufficiale v1.57.0); il programma in sé passa dalla 0.2.0 alla 0.3.0. Chi ha il programma 0.1.1 o 0.2.0 lo riceve come aggiornamento.

## lilOS 1.24.0 → 1.27.0

- **Nuova funzionalità — la licenza di lilOS si accetta al primo avvio.** Dopo l'accesso un amministratore legge la [licenza d'uso](https://github.com/GexyLab/lilos-plugins-official/blob/main/LICENSE.md) e la accetta, una volta per tutta l'installazione.
  - Finché non l'ha fatto, gli altri utenti non entrano. Se il testo cambia si accetta di nuovo.
  - Senza rete si usa la copia inclusa.
  - Con `"acceptLicense": true` in `lilos-install.json` la accetta chi prepara l'installazione.

  *Perché:* chi installa lilOS deve accettarne la licenza.
- **Nuova funzionalità — NetTest**, dall'AppStore. Prova API e servizi di rete: HTTP, GraphQL, WebSocket, SSE, TCP, TLS, UDP, gRPC e MQTT. Le richieste le fa il kernel.
- **Sicurezza — i valori segreti di NetTest restano nel kernel.** Sono sigillati e la pagina li mostra come ••••. Credenziali e corpo non seguono un reindirizzamento verso un altro server.
- **Nuova funzionalità — l'eccezione per la rete decisa dall'amministratore.** In Pannello di controllo → Rete l'amministratore può aprire al kernel questo computer, la rete locale o solo alcuni indirizzi.
- **Nuova funzionalità — Arresta.** Nella pagina utente, solo per gli amministratori: spegne lilOS per tutti. Nel programma, con il lilOS di questo computer, si chiude anche il programma.

## Programma lilOS 0.2.0 → 0.3.0

- **Nuova funzionalità — reinstallare su Windows.** Se reinstalli il programma e restano le impostazioni di prima, al primo avvio compare «lilOS era già installato qui». Puoi scegliere tra due strade:
  - **Usa l'installazione precedente**;
  - **Riparti da zero**: il lilOS di questo computer viene messo da parte con il nome `.old-<data>`, oppure cancellato se lo chiedi tu.

  *Perché:* disinstallare non cancella i dati, e prima il programma ripartiva senza dirlo.
- **Nuova funzionalità — Arresta chiude il programma.** Il tasto Arresta di lilOS ferma il kernel, il database e il programma.
- **Correzione bug — download più affidabili nella costruzione dei pacchetti.** I download di Node, git e PostgreSQL riprovano sugli errori temporanei di GitHub. Prima un errore 503 faceva fallire il build per macOS.

## Quale file scaricare

| Sistema | File |
| --- | --- |
| Windows (x64) | `lilOS-Setup-1.27.0.exe` (oppure il `.msi`) |
| macOS (Apple Silicon e Intel) | `.dmg` della tua architettura (`arm64` o `x64`) |
| Linux (x64, arm64) | `.AppImage`, oppure `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, openSUSE) |

## Da sapere

- **Il programma non è firmato.** Windows mostra SmartScreen: «Ulteriori informazioni» → «Esegui comunque». macOS lo blocca la prima volta: Impostazioni di sistema → Privacy e sicurezza → «Apri comunque».
- **Il primo avvio su questo computer ha bisogno di internet** e dura qualche minuto. I successivi qualche secondo.
- **La licenza:** al primo accesso dopo l'installazione o l'aggiornamento di lilOS, entra come amministratore e accettala.
- **Limiti.** Sui Mac Intel le app con una parte in background (servizi isolati) non partono. I pacchetti per macOS e Linux, e la domanda sulla reinstallazione su Windows, non sono ancora stati provati su sistemi veri: segnala i problemi.
- **Aggiornare.**
  - Il programma si aggiorna da solo su Windows e Linux; su macOS avvisa.
  - Un lilOS già installato si aggiorna da AppStore → Aggiornamenti → lilOS.
