# netfs-nfs

Modulo del kernel che porta le cartelle **NFS** di server Linux e NAS (Synology, QNAP, TrueNAS…) nella cartella Rete.

- Parla **NFS versione 3** su TCP da solo, con una libreria scritta per lilOS (`lib/`): non monta niente nel sistema operativo, quindi funziona anche dove il sistema non ha un client NFS (Windows Home).
- In **Connetti a un server** compare **NFS (Linux, NAS)**: il server e la cartella esportata (con **Elenca** si sceglie tra quelle che il server esporta). NFSv4.1 e l'autenticazione **Kerberos** si vedono nella finestra ma non si scelgono ancora: arriveranno in una versione successiva.
- Lettura e scrittura riprendono da dove si erano fermate. I collegamenti simbolici si leggono se puntano dentro la cartella esportata. NFS non avvisa dei cambiamenti: una cartella si rilegge quando si apre.
- **Eliminare è definitivo.** In alto c'è lo spazio del file system.

## Identità: UID e GID

Con NFSv3 (AUTH_SYS) non c'è una password: il server si fida dei numeri UID e GID che il client dichiara e controlla solo l'indirizzo da cui arriva. Per questo gli utenti non li scrivono mai: li assegna un **amministratore**, uno per ogni utente di lilOS, in **Pannello di controllo → NFS**:

```
mario = 1026:100
anna = 1027:100,101
```

(nome utente di lilOS = UID:GID, altri gruppi dopo una virgola). Un utente senza riga non si connette: il messaggio gli dice di chiedere all'amministratore.

## Sul server

- La cartella va esportata all'indirizzo del computer su cui gira il kernel di lilOS, con NFSv3 su TCP.
- Molti server accettano solo connessioni da una porta sotto la 1024 (l'opzione `secure` di Linux, di serie). Il modulo prova prima una di quelle; se il sistema non lo permette (Linux senza privilegi) bisogna permettere le altre porte: `insecure` in `/etc/exports`, **Consenti connessioni da porte non privilegiate** su Synology.
- Con più utenti in lilOS la rete locale è chiusa di serie: l'amministratore la apre con `net.allowPrivate` o `net.allow` in `config.json`.

La libreria (XDR, ONC RPC con record marking, portmapper, MOUNT v3, NFS v3) sta solo in questo modulo. Fornisce il servizio `netfs.nfs`. Nessuna dipendenza. Richiede lilOS 1.22.0 o successivo.

Versione 1.1.0: il nome del server si risolve con il kernel, che dà solo gli indirizzi permessi (con più utenti, niente rete locale se l'amministratore non la apre): il nome non può cambiare indirizzo tra il controllo del kernel e la connessione. Portmapper, MOUNT e NFS vanno tutti a quell'indirizzo.

## Soglie dei file grandi

Dalla 1.2.0. La dimensione di ogni lettura e scrittura è un'impostazione del modulo (un amministratore la cambia; vale per le connessioni che si aprono dopo averla cambiata):

| Chiave | Cosa | Predefinito |
|---|---|---|
| `ioKb` | Quanti KB lilOS chiede a ogni lettura e scrittura; mai più di quanto il server permette | 256 (da 4 a 1024) |
