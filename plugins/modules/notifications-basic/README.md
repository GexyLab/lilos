# notifications-basic

Modulo del kernel che conserva le **notifiche** degli utenti: i messaggi che lilOS e le app mandano con `lilos.ui.notify()` e che compaiono nell'area di notifica della barra delle applicazioni.

- Tutto è in `notifications.json`, nella cartella del modulo: niente database. Le notifiche restano dopo un riavvio del kernel.
- Ogni utente ne tiene al massimo quante sceglie nel Pannello di controllo → Notifiche (`defaultKeep`, 20, finché non sceglie): quando ne arriva una in più si cancella la più vecchia.
- Ogni app manda al massimo `perMinute` notifiche al minuto (10) a un utente; il testo è lungo al massimo 300 caratteri.
- Quando arriva una notifica il modulo lo dice alle pagine lilOS aperte da quell'utente (evento `notification.new`); quando ne vengono lette o cancellate, con `notification.change`.

Fornisce il servizio `notifications`. Senza questo modulo lilOS mostra le notifiche lo stesso, ma le tiene solo nella pagina: ricaricandola si perdono.

Versione 1.1.0: `notifications.json` lo legge e lo scrive il kernel (`ctx.jsonStore`); niente di diverso per chi lo usa. Richiede lilOS 1.22.0 o successivo.
