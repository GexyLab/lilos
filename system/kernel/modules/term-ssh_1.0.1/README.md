# term-ssh

Modulo del kernel per i terminali remoti **SSH** (sessioni remote del Terminale).

- Accesso con password, con una chiave privata (un file di lilOS, con la sua passphrase) o con le domande del server (keyboard-interactive, per esempio un codice monouso).
- Quello che non è salvato lo chiede il terminale stesso, come fa `ssh`: la password (tre tentativi), la passphrase della chiave.
- Alla prima connessione lilOS mostra l'impronta della chiave del server e chiede di confermarla; se cambia, un avviso forte.
- Un comando all'avvio (per esempio `tmux new -A -s main`) parte al posto della shell.
- Dalla cartella Rete, «Apri terminale SSH qui» apre la shell nella cartella della connessione SFTP.

Versione 1.0.1: confermare la chiave del server dopo più di 20 secondi non ferma più il kernel (il tempo per la connessione si ferma quando il server risponde).

Fornisce il servizio `term.ssh`. Dipendenza: `ssh2` 1.17.0 (licenza MIT, © Brian White).
