# netfs-webdav

Modulo del kernel per le connessioni **WebDAV** nella cartella Rete: Nextcloud, ownCloud, NAS, Apache, rclone…

- Si indica l'indirizzo completo della cartella (`https://cloud.example.com/remote.php/dav/files/utente/`) con utente e password; accesso Basic o Digest.
- Con un certificato non valido lilOS mostra la sua impronta e chiede di confermarla prima di mandare qualsiasi dato.
- Le letture interrotte riprendono dal punto in cui si erano fermate; gli invii ricominciano da capo (WebDAV non permette di aggiungere a un file).
- Con `http://` la password viaggia in chiaro.

Con questo modulo il protocollo compare in **Connetti a un server** (File Manager → sezione Rete → +). Ogni connessione diventa una cartella in `~/Rete`; i file si copiano trascinandoli tra la Home e la cartella, e il kernel li trasferisce anche a File Manager chiuso (finestra **Trasferimento dati**). Le password restano nel kernel, cifrate, e la pagina non le riceve mai.

Fornisce il servizio `netfs.webdav`. Nessuna dipendenza.

Versione 1.1.0: il nome del server si risolve con il kernel, che dà solo gli indirizzi permessi (con più utenti, niente rete locale se l'amministratore non la apre): il nome non può cambiare indirizzo tra il controllo del kernel e la connessione. Richiede lilOS 1.21.0 o successivo.
