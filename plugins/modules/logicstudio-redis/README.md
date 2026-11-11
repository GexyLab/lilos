# logicstudio-redis

I **blocchi Redis** di Logic Studio (categoria Database):

- **Connessione (connect)**: si collega a un server Redis e dà la **connessione** da collegare agli altri blocchi. Campi: server, porta, numero del database, utente (ACL, vuoto = default), **password** (conservata cifrata, o dall'ingresso nascosto **password**) e cifratura (TLS: sì con il certificato controllato, sì senza controllarlo, no). Si collega all'avvio (si può togliere) o con **connetti**; **chiudi** la chiude.
- **Leggi (GET)**, **Scrivi (SET)** con una scadenza in secondi e «solo se non esiste» (NX) o «solo se esiste» (XX), **Elimina (DEL)** di una chiave o di ogni chiave di una lista, **Esiste (EXISTS)**, **Incrementa (INCRBY)** di un passo (con la virgola usa INCRBYFLOAT), **Scadenza (EXPIRE · TTL)**: leggerla, impostarla o toglierla.
- **Hash: leggi (HGET · HGETALL)**: un campo, o tutto l'hash come oggetto; **Hash: scrivi campi (HSET)**: i campi di un oggetto e gli ingressi aggiunti (fino a 16, con il nome della porta).
- **Lista: aggiungi (LPUSH · RPUSH)** all'inizio o alla fine (una lista può aggiungere ognuno dei suoi elementi); **Lista: togli (LPOP · RPOP)**, uno o più valori, e può **aspettare** un valore (BLPOP · BRPOP) al massimo 25 secondi, con una connessione sua; **Lista: intervallo (LRANGE)**.
- **Pubblica (PUBLISH)** e **Iscriviti (SUBSCRIBE · PSUBSCRIBE)**: ogni messaggio dei canali (o dei modelli, come `notizie.*`) appena arriva, con il canale; ascolta appena arriva la connessione (si può togliere: allora con **ascolta**), **smetti** la ferma. Ogni iscrizione ha una connessione sua.
- **Cerca chiavi (SCAN)**: le chiavi che corrispondono a un modello, anche di un solo tipo, al massimo il limite del modulo. Mai KEYS, che bloccherebbe il server.
- **Comando (call)**: qualsiasi comando come lista, per esempio `["ZADD", "classifica", 10, "anna"]`, o come parole. Sono rifiutati i comandi di amministrazione (FLUSHALL, FLUSHDB, CONFIG, SHUTDOWN, DEBUG, MONITOR, REPLICAOF, MODULE, ACL, CLUSTER, SAVE…), quelli che cambiano o bloccano la connessione condivisa (SELECT, AUTH, HELLO, CLIENT, MULTI/EXEC, WATCH, BLPOP e gli altri bloccanti, WAIT), gli script (EVAL, FCALL, SCRIPT, FUNCTION: potrebbero usare i comandi rifiutati), MIGRATE, KEYS e la famiglia di SUBSCRIBE (c'è il blocco Iscriviti). L'amministratore può disattivare il blocco.

Valori: Redis conserva testo. Un testo resta un testo; numeri e vero/falso diventano testo, oggetti e liste JSON. Con l'opzione **JSON** dei blocchi i valori si scrivono con JSON.stringify e si rileggono con JSON.parse (oggetti, liste, numeri tornano tali).

Sicurezza:

- il client gira nel kernel, non nel programma dell'utente: password e connessioni non arrivano mai al worker; una connessione vale solo per il programma che l'ha aperta e si chiude (con le sue iscrizioni) quando il programma si ferma;
- i server su questo computer, sulla rete locale e sugli altri indirizzi non pubblici sono **bloccati**, a meno che l'amministratore non li permetta («Permetti i database su questo computer e sulla rete locale»); gli indirizzi link-local (i metadati dei cloud), multicast e «questa rete» mai; i database che lilOS stesso usa (gli indirizzi nella configurazione del kernel) mai, nemmeno con il permesso;
- il nome viene risolto e ogni indirizzo controllato, e la connessione va proprio all'indirizzo controllato (con TLS il certificato è controllato sul nome); niente Sentinel né Cluster, che manderebbero il client ad altri indirizzi;
- quello che un utente può fare davvero dipende dall'utente Redis (ACL) della connessione.

Limiti (impostazioni del modulo): tempo massimo di un'operazione (30 secondi), valori in un risultato (10000: chiavi di Cerca chiavi, elementi di Intervallo, campi di HGETALL, con l'uscita nascosta **troncato**), dimensione di un risultato (4096 KB), connessioni aperte per utente (10, ogni iscrizione e ogni attesa di Togli conta come una), operazioni al minuto per utente (600); 10 iscrizioni per connessione e 1000 messaggi in attesa (i più vecchi si perdono, e l'uscita nascosta **persi** dice quanti). L'amministratore può anche non permettere i database Redis o il blocco Comando.

Libreria: [ioredis](https://github.com/redis/ioredis) (`ioredis`, MIT).

Richiede il motore `logicstudio-engine` (1.7.0 o più recente) e i blocchi di base `logicstudio-core`.
