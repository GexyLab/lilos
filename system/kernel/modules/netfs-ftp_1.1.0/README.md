# netfs-ftp

Modulo del kernel per le connessioni **FTP** e **FTPS** (FTP con TLS) nella cartella Rete.

- FTPS esplicito (`AUTH TLS`, di solito porta 21) o implicito (di solito porta 990).
- Il certificato del server si verifica prima di mandare utente e password; se non è valido (fatto da sé, scaduto, per un altro nome) lilOS mostra la sua impronta e chiede di confermarla. Anche i canali dei dati devono avere lo stesso certificato.
- Con FTP semplice la password viaggia in chiaro: usalo solo dove non c'è alternativa.
- I trasferimenti interrotti riprendono dal punto in cui si erano fermati, quando il server lo permette.

Con questo modulo il protocollo compare in **Connetti a un server** (File Manager → sezione Rete → +). Ogni connessione diventa una cartella in `~/Rete`; i file si copiano trascinandoli tra la Home e la cartella, e il kernel li trasferisce anche a File Manager chiuso (finestra **Trasferimento dati**). Le password restano nel kernel, cifrate, e la pagina non le riceve mai.

Fornisce i servizi `netfs.ftp` e `netfs.ftps`. Dipendenza: `basic-ftp` 6.2.3.

Versione 1.1.0: il nome del server si risolve con il kernel, che dà solo gli indirizzi permessi (con più utenti, niente rete locale se l'amministratore non la apre): il nome non può cambiare indirizzo tra il controllo del kernel e la connessione. Anche i canali dei dati vanno a quell'indirizzo. Richiede lilOS 1.21.0 o successivo.
