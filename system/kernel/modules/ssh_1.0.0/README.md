# ssh

Modulo del kernel per **SSH**: i terminali remoti del Terminale e le connessioni **SFTP** della cartella Rete, con la stessa connessione, lo stesso accesso e una sola copia di `ssh2`. Sostituisce i moduli `term-ssh` e `netfs-sftp`: gli host e le connessioni salvati restano come sono.

## Terminali remoti

- Accesso con password, con una chiave privata (un file di lilOS, con la sua passphrase) o con le domande del server (keyboard-interactive, per esempio un codice monouso).
- Quello che non è salvato lo chiede il terminale stesso, come fa `ssh`: la password (tre tentativi), la passphrase della chiave.
- Alla prima connessione lilOS mostra l'impronta della chiave del server e chiede di confermarla; se cambia, un avviso forte.
- Un comando all'avvio (per esempio `tmux new -A -s main`) parte al posto della shell.
- Dalla cartella Rete, «Apri terminale SSH qui» apre la shell nella cartella della connessione SFTP.
- Un comando fermato da un segnale (`kill -9`) lo dice alla chiusura («Terminata dal segnale SIGKILL») e dà al kernel `code` e `signal` (i comandi pianificati su un host SSH).

## SFTP

- Accesso con password o con una chiave privata (un file di lilOS, con la sua passphrase se ne ha una). Se il server fa domande (keyboard-interactive), la password salvata risponde alla prima che nasconde ciò che si scrive.
- Alla prima connessione lilOS mostra l'impronta della chiave del server e chiede di confermarla; se la chiave cambia la chiede di nuovo.
- I trasferimenti interrotti riprendono dal punto in cui si erano fermati.

Con questo modulo il protocollo compare in **Connetti a un server** (File Manager → sezione Rete → +). Ogni connessione diventa una cartella in `~/Rete`; i file si copiano trascinandoli tra la Home e la cartella, e il kernel li trasferisce anche a File Manager chiuso (finestra **Trasferimento dati**). Le password restano nel kernel, cifrate, e la pagina non le riceve mai.

Ogni connessione va solo agli indirizzi che il kernel permette (con più utenti, niente rete locale se l'amministratore non la apre): il nome del server si risolve con il kernel stesso, così non può cambiare indirizzo tra il controllo e la connessione.

Fornisce i servizi `term.ssh` e `netfs.sftp`. Dipendenza: `ssh2` 1.17.0 (licenza MIT, © Brian White). Richiede lilOS 1.21.0 o successivo.
