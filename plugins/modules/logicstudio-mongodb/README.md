# logicstudio-mongodb

I **blocchi MongoDB** di Logic Studio (categoria Database):

- **Connessione (MongoClient)**: si collega a un server MongoDB e dà la **connessione** da collegare agli altri blocchi. Il server si scrive come indirizzo (URI `mongodb://server:27017/database` o `mongodb+srv://cluster.esempio.net/database`) oppure con i campi server, porta, database, utente, database degli utenti (authSource) e cifratura (TLS: sì con il certificato controllato, sì senza controllarlo, no). La **password** va sempre nel campo Password, che la conserva cifrata (o arriva dall'ingresso nascosto **password**): un indirizzo che contiene una password è rifiutato. Si collega all'avvio (si può togliere) o con **connetti**; **chiudi** la chiude.
- **Trova (find)**: i documenti di una raccolta che corrispondono al **filtro**, con campi (projection), ordine (sort), al massimo (limit) e salta (skip). Escono i **documenti** (lista), il **primo** e **quanti**. Ogni ingresso aggiunto (fino a 16) è un campo del filtro, con il nome della porta (uguaglianza).
- **Inserisci (insertOne · insertMany)**: un documento, o ognuno di una lista; ogni ingresso aggiunto è un campo del documento. Escono gli **id**.
- **Aggiorna (updateOne · updateMany)**: cambia il primo documento (o tutti) che corrisponde al filtro: `{"$set": …}`, `{"$inc": …}`…; un oggetto senza operatori diventa un `$set`. Con **upsert** inserisce il documento se nessuno corrisponde. Escono **trovati**, **modificati** e l'id inserito.
- **Elimina (deleteOne · deleteMany)**: elimina il primo documento (o tutti) che corrisponde al filtro; con il filtro vuoto rifiuta, a meno di spuntare **Tutti i documenti**.
- **Conta (countDocuments)**: quanti documenti corrispondono al filtro.
- **Aggrega (aggregate)**: una pipeline di aggregazione, lista di passi `[{"$match": …}, {"$group": …}]`.
- **Osserva modifiche (watch)**: ogni modifica di una raccolta (o di tutto il database) appena avviene: escono il **documento** (intero anche per gli aggiornamenti), l'**operazione** (insert, update, replace, delete), la chiave e la modifica completa. Si possono scegliere solo gli inserimenti, gli aggiornamenti o le eliminazioni, e aggiungere passi alla pipeline. Ascolta appena arriva la connessione (si può togliere: allora con **ascolta**); **smetti** la ferma. Serve un replica set o un cluster (anche un replica set di un solo server): con un server singolo dà un errore chiaro.
- **Raccolte (listCollections)**: i nomi delle raccolte del database.

I valori sono Extended JSON (relaxed), in uscita e nei filtri: un ObjectId è `{"$oid": "…"}`, una data `{"$date": "…"}`. I filtri si possono scrivere anche come nella shell di MongoDB (chiavi senza virgolette, `'testo'`, `ObjectId("…")`, `ISODate("…")`). Un ingresso aggiunto chiamato `_id` con 24 cifre esadecimali trova anche l'ObjectId.

Sicurezza:

- il driver gira nel kernel, non nel programma dell'utente: password e connessioni non arrivano mai al worker; una connessione vale solo per il programma che l'ha aperta e si chiude quando il programma si ferma;
- i server su questo computer, sulla rete locale e sugli altri indirizzi non pubblici sono **bloccati**, a meno che l'amministratore non li permetta («Permetti i database su questo computer e sulla rete locale»); gli indirizzi link-local (i metadati dei cloud), multicast e «questa rete» mai; i database che lilOS stesso usa (gli indirizzi nella configurazione del kernel) mai, nemmeno con il permesso;
- ogni nome viene risolto e ogni indirizzo controllato, anche le risposte SRV e i membri che un replica set annuncia; con server e porta il blocco parla solo con quel server (nessun altro membro scoperto); con un indirizzo URI un membro annunciato a un indirizzo non permesso chiude la connessione;
- nell'indirizzo URI non sono permesse le opzioni che leggono file del computer (`tlsCAFile`…), i proxy e i meccanismi di accesso diversi da SCRAM e PLAIN (che leggerebbero i metadati dei cloud); la cifratura si sceglie nel campo TLS.

Limiti (impostazioni del modulo): tempo massimo di un'operazione (30 secondi, anche sul server con maxTimeMS), documenti in un risultato (10000, con l'uscita nascosta **troncato**), dimensione di un risultato (4096 KB), connessioni aperte per utente (10), operazioni al minuto per utente (600); al massimo 5 connessioni verso il server per ogni blocco di connessione, 10 osservazioni per connessione e 1000 modifiche in attesa (le più vecchie si perdono, e l'uscita nascosta **perse** dice quante). L'amministratore può anche non permettere i database MongoDB.

Libreria: [MongoDB Node.js Driver](https://github.com/mongodb/node-mongodb-native) (`mongodb`, Apache-2.0).

Richiede il motore `logicstudio-engine` (1.7.0 o più recente) e i blocchi di base `logicstudio-core`.
