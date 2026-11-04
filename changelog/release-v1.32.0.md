# lilOS 1.32.0 — 4 novembre 2026

lilOS nel suo programma, senza browser, su Windows, macOS e Linux. Questa release porta **lilOS 1.32.0** (repository ufficiale v1.60.0); il programma in sé resta alla 0.3.0. Chi ha il programma 0.1.1, 0.2.0 o le release 1.27.0 e 1.30.0 lo riceve come aggiornamento.

## lilOS 1.30.0 → 1.32.0

- **Nuova funzionalità — lilOS in altre lingue.** I testi di lilOS (scrivania, barra, menu applicazioni, pagina utente, finestre di sistema, accesso) e i messaggi del kernel arrivano da un pacchetto di lingua: si installa da AppStore → Lingue e si sceglie in Pannello di controllo → Lingua. 20 lingue: italiano, inglese, cinese semplificato, hindi, spagnolo, tedesco, francese, portoghese (Brasile), russo, arabo, giapponese, polacco, ucraino, rumeno, olandese, greco, indonesiano, urdu, turco, coreano. Qualsiasi utente può installarne uno ed è per tutti; lo rimuove chi l'ha installato o un amministratore. *Perché:* per aggiungere lingue a lilOS.
- **Nuova funzionalità — arabo e urdu da destra a sinistra.** lilOS si specchia: barra, menu, finestre di sistema e frecce della tastiera seguono la lingua; le app restano nella direzione della loro lingua.
- **Compatibilità — l'italiano ora è un pacchetto.** Senza pacchetto lilOS è in inglese: per averlo in italiano installa «Italiano» da AppStore → Lingue e sceglilo in Pannello di controllo → Lingua. Le app usano le proprie traduzioni.
- **Nuova funzionalità — note adesive e widget sulla scrivania** (lilOS 1.31.0). Con l'app Note adesive (dall'AppStore), tasto destro sulla scrivania → Nuovo → Nota adesiva: foglietti colorati da scrivere lì sopra.

Le traduzioni diverse dall'italiano sono state scritte con agenti AI: per hindi, urdu, arabo e greco è consigliata una revisione di madrelingua.

## Programma lilOS 0.3.0

Nessuna modifica: cambia solo la versione di lilOS che installa.

## Quale file scaricare

| Sistema | File |
| --- | --- |
| Windows (x64) | `lilOS-Setup-1.32.0.exe` (oppure il `.msi`) |
| macOS (Apple Silicon e Intel) | `.dmg` della tua architettura (`arm64` o `x64`) |
| Linux (x64, arm64) | `.AppImage`, oppure `.deb` (Debian, Ubuntu) o `.rpm` (Fedora, openSUSE) |

## Da sapere

- **Il programma non è firmato.** Windows mostra SmartScreen: «Ulteriori informazioni» → «Esegui comunque». macOS lo blocca la prima volta: Impostazioni di sistema → Privacy e sicurezza → «Apri comunque».
- **Il primo avvio su questo computer ha bisogno di internet** e dura qualche minuto. I successivi qualche secondo.
- **La licenza:** al primo accesso dopo l'installazione, entra come amministratore e accettala.
- **Limiti.** Sui Mac Intel le app con una parte in background (servizi isolati) non partono. I pacchetti per macOS e Linux non sono ancora stati provati su sistemi veri: segnala i problemi.
- **Aggiornare.**
  - Il programma si aggiorna da solo su Windows e Linux; su macOS avvisa.
  - Un lilOS già installato si aggiorna da AppStore → Aggiornamenti → lilOS; poi AppStore → Lingue per la tua lingua.
