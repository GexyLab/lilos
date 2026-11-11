# lilOS 1.38.1 — 11 novembre 2026

lilOS nel suo programma, senza browser, su Windows, macOS e Linux. Questa release porta **lilOS 1.38.1** (repository ufficiale v1.66.0) e il **programma 0.5.1**. Chi ha una release precedente la riceve come aggiornamento.

La novità è **NetWave Browser**, un browser dentro lilOS: le pagine le mostra il programma, ognuna isolata da lilOS e dalle altre.

## Programma lilOS 0.4.2 → 0.5.1

- **Nuova funzionalità — le pagine web di NetWave Browser.** Il programma mostra le pagine aperte in NetWave dentro la sua finestra. Ogni scheda gira in un processo separato, senza alcun accesso a lilOS. I dati dei siti (accessi, cookie) sono di ogni utente di lilOS e condivisi dalle sue finestre normali. Quelli delle finestre private restano solo in memoria e spariscono alla chiusura. Funziona solo con un server di fiducia del programma.
- **Sicurezza — le pagine non raggiungono lilOS.** Una pagina non può aprire né chiamare lilOS o il suo kernel, con nessuno dei nomi del computer (anche via WebSocket), né i file del computer.
- **Sicurezza — permessi e nuove schede chiesti a te.** Posizione, fotocamera, microfono e gli altri permessi sono negati finché non rispondi nella barra di NetWave. Prima che una pagina apra una nuova scheda NetWave chiede, e comunque una pagina non ne apre più di 5 ogni 10 secondi. Bluetooth, USB, porte seriali e HID restano chiusi alle pagine.
- **Sicurezza — download controllati.** Al massimo 4 insieme, fino a 1 GB l'uno. Il file passa in una cartella privata del programma e lilOS lo legge un pezzo alla volta, così un file grande non riempie la memoria del programma, che regge anche il kernel locale.

## lilOS 1.36.0 → 1.38.1

- **Nuova funzionalità — NetWave Browser** (dall'AppStore, 1.1.0). Schede in più finestre, ogni finestra salvabile come sessione (`.nwsession` in Documenti › Sessioni NetWave), cronologia di pagine e sessioni, finestre private, download nella cartella Download. Dettagli nelle note del repository ufficiale v1.66.0.
- **Miglioramento — collegamenti web nel browser di lilOS.** I collegamenti web della scrivania si aprono in NetWave quando è installato, altrimenti nel tuo browser come prima.
- **Nuova funzionalità — Logic Studio** (1.37.0). Blocchi logici collegati tra loro, disegnati nell'app Logic Studio IDE (dall'AppStore) e fatti girare dal kernel, anche a lilOS chiuso. Le finestre dei progetti attivi si aprono dal menu applicazioni, scheda **Progetti**.
- **Sicurezza — permesso prima di eseguire un'app fatta con Logic Studio** (1.37.0). Un'app ricevuta da altri parte solo dopo che chi la apre ha visto cosa può fare e ha accettato.

## Quale file scaricare

| Sistema | File |
| --- | --- |
| Windows (x64) | `lilOS-Setup-1.38.1.exe` (oppure il `.msi`) |
| macOS (Apple Silicon e Intel) | `.dmg` della tua architettura (`arm64` o `x64`) |
| Linux (x64, arm64) | `.AppImage`, oppure `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, openSUSE) |

## Da sapere

- **Il programma non è firmato.** Windows mostra SmartScreen: «Ulteriori informazioni» → «Esegui comunque». macOS lo blocca la prima volta: Impostazioni di sistema → Privacy e sicurezza → «Apri comunque».
- **Il primo avvio su questo computer ha bisogno di internet** e dura qualche minuto. I successivi qualche secondo.
- **La licenza:** al primo accesso dopo l'installazione, entra come amministratore e accettala (con «Senza UI» la accetti nel programma).
- **Limiti di NetWave.** Se una notifica o un menu di lilOS copre la pagina, finché resta lì al suo posto c'è un'immagine della pagina. Mentre scrivi nella pagina le scorciatoie globali di lilOS non arrivano (quelle di NetWave sì). Schermo intero delle pagine e strumenti per sviluppatori non ci sono. Da un browser normale NetWave non mostra le pagine: le apre nel tuo browser.
- **Altri limiti.** Sui Mac Intel le app con una parte in background (servizi isolati) non partono. I pacchetti per macOS e Linux, e «Senza UI» fuori da Windows, non sono ancora stati provati su sistemi veri: segnala i problemi.
- **Aggiornare.**
  - Il programma si aggiorna da solo su Windows e Linux; su macOS avvisa.
  - Un lilOS già installato si aggiorna da AppStore → Aggiornamenti → lilOS, poi i pacchetti di lingua; NetWave Browser si installa dall'AppStore.
