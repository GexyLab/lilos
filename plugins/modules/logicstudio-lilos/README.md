# logicstudio-lilos

I **blocchi di lilOS** di Logic Studio:

- **Notify**: ti manda una notifica di lilOS a nome del programma. Titolo e testo vengono dalle impostazioni o dagli ingressi; nel testo `{nome}` prende il valore dell'ingresso aggiunto con quel nome (fino a 8). Le notifiche hanno un limite al minuto: oltre, il blocco dà errore.
- **readFile**, **writeFile**, **appendFile** (leggi, scrivi, aggiungi a un file): i file della tua home (`~/…` oppure `/home/<utente>/…`), come testo o come JSON (appendFile: un JSON per riga). Si leggono al massimo 5 MB; si scrivono al massimo 5 MB alla volta; un file cresce con appendFile fino a 64 MB. Un file che non c'è viene creato, ma la sua cartella deve esserci.
- **readdir** (elenca cartella): gli elementi di una cartella (nome, tipo, dimensione, data, percorso), solo file o solo cartelle, con o senza i nascosti.
- **exists**: dice se un file o una cartella c'è, di che tipo è e quanto è grande.
- **Emit** (evento a lilOS): manda l'evento `logicstudio.event` alle tue pagine di lilOS aperte, con il nome scelto e i dati (per usi futuri).

I blocchi lavorano sempre **come l'utente** che possiede il programma: vedono e cambiano solo quello che lui può vedere e cambiare, e lo spazio usato conta nella sua quota. Non usano la cartella `.config` della home (le impostazioni di lilOS) né i file il cui contenuto è protetto da un'app (FileCrypt).

Un ingresso **percorso** collegato prende il posto del percorso scritto nelle impostazioni. Gli ingressi aggiunti di Notify tengono solo il loro valore: la notifica parte con **invia**.

I nomi richiamano le funzioni equivalenti di Node.js (dalla 1.1.0).

Richiede il motore `logicstudio-engine` e il servizio delle notifiche (`notifications-basic`).
