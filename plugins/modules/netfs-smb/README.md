# netfs-smb

Modulo del kernel per le connessioni **SMB 2 e 3** nella cartella Rete: le condivisioni dei computer Windows e dei NAS.

- SMB da 2.0.2 a 3.1.1: la firma è obbligatoria (una casella la toglie, solo per i vecchi NAS), la cifratura si usa quando il server la offre. Il vecchio SMB1 (CIFS) non è supportato: non è sicuro e Windows lo tiene spento.
- Accesso con utente, password e dominio (o gruppo di lavoro), oppure come ospite. «Elenca…» mostra le condivisioni del server.
- Una cartella aperta nel File Manager si aggiorna da sola quando qualcuno cambia i file sul server.
- I trasferimenti interrotti riprendono dal punto in cui si erano fermati.

Con questo modulo il protocollo compare in **Connetti a un server** (File Manager → sezione Rete → +). Ogni connessione diventa una cartella in `~/Rete`; i file si copiano trascinandoli tra la Home e la cartella, e il kernel li trasferisce anche a File Manager chiuso (finestra **Trasferimento dati**). Le password restano nel kernel, cifrate, e la pagina non le riceve mai.

Fornisce il servizio `netfs.smb`. Il protocollo è [smb3-client](https://github.com/euricojardim/smb3-client) di Eurico Jardim (licenza MIT), incluso in `lib/` con alcune correzioni proposte all'autore: vedi `lib/smb3-client/VENDORED.md`.

Versione 1.1.0: il nome del server si risolve con il kernel, che dà solo gli indirizzi permessi (con più utenti, niente rete locale se l'amministratore non la apre): il nome non può cambiare indirizzo tra il controllo del kernel e la connessione. Richiede lilOS 1.22.0 o successivo.
