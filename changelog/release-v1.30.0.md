# lilOS 1.30.0 — 4 novembre 2026

lilOS nel suo programma, senza browser, su Windows, macOS e Linux. Questa release porta **lilOS 1.30.0** (repository ufficiale v1.58.0); il programma in sé resta alla 0.3.0. Chi ha il programma 0.1.1, 0.2.0 o la release 1.27.0 lo riceve come aggiornamento.

## lilOS 1.27.0 → 1.30.0

- **Nuova funzionalità — nuova schermata di accesso.** Accesso, licenza, avvio e messaggi prima di lilOS hanno due metà: a sinistra il pannello di lilOS con lo stato della connessione e la versione, a destra il modulo. È scura di default; il pulsante in alto a destra la fa chiara. Il blocco e la sessione scaduta mostrano l'ora e l'avatar, con solo la password.
- **Nuova funzionalità — «Resta connesso».** Spento, la sessione finisce quando si chiude la finestra; acceso (come prima), dura finché non scade. *Perché:* sui computer condivisi si restava dentro per giorni anche senza volerlo.
- **Miglioramento — password e tentativi.** L'occhio mostra la password, compare l'avviso del Bloc Maiusc, e dopo troppi tentativi sbagliati il pulsante conta i secondi. «Password dimenticata?» spiega a chi chiedere.
- **Miglioramento — avvio.** Dopo l'accesso si vedono i passi fino al desktop. Se il kernel non risponde, lilOS riprova da solo (5, 10, poi ogni 30 secondi).
- **Nuova funzionalità — «Mostra sul desktop».** Con il tasto destro su un'app del menu applicazioni la rimetti sul desktop, se l'avevi tolta. *Perché:* prima un'app tolta dal desktop non si poteva più rimettere.

## Programma lilOS 0.3.0

Nessuna modifica: cambia solo la versione di lilOS che installa.

## Quale file scaricare

| Sistema | File |
| --- | --- |
| Windows (x64) | `lilOS-Setup-1.30.0.exe` (oppure il `.msi`) |
| macOS (Apple Silicon e Intel) | `.dmg` della tua architettura (`arm64` o `x64`) |
| Linux (x64, arm64) | `.AppImage`, oppure `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, openSUSE) |

## Da sapere

- **Il programma non è firmato.** Windows mostra SmartScreen: «Ulteriori informazioni» → «Esegui comunque». macOS lo blocca la prima volta: Impostazioni di sistema → Privacy e sicurezza → «Apri comunque».
- **Il primo avvio su questo computer ha bisogno di internet** e dura qualche minuto. I successivi qualche secondo.
- **La licenza:** al primo accesso dopo l'installazione, entra come amministratore e accettala.
- **Limiti.** Sui Mac Intel le app con una parte in background (servizi isolati) non partono. I pacchetti per macOS e Linux non sono ancora stati provati su sistemi veri: segnala i problemi.
- **Aggiornare.**
  - Il programma si aggiorna da solo su Windows e Linux; su macOS avvisa.
  - Un lilOS già installato si aggiorna da AppStore → Aggiornamenti → lilOS.
