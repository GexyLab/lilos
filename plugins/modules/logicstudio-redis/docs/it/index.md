# Blocchi Redis

`logicstudio-redis` · richiede il motore `logicstudio-engine` (1.7.0 o successivo) e i [Blocchi di base](logicstudio-core)

I blocchi che fanno parlare un programma di Logic Studio con un server **Redis**: leggere e scrivere valori (anche con una scadenza), contatori, hash, liste (code di lavoro), messaggi pubblicati e ricevuti appena arrivano, ricerca delle chiavi e, per tutto il resto, qualsiasi comando. Nell'elenco dei blocchi dell'IDE sono nella categoria **Database**, con il nome che comincia per «Redis ·».

## Come si installa

Il pacchetto non arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore**, scheda **Kernel** («Blocchi Redis»). L'AppStore installa insieme anche il motore e i blocchi di base, se mancano. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE.

## I blocchi

Il blocco di **connessione** apre la connessione e manda un riferimento dall'uscita **connessione**; quel riferimento si collega all'ingresso **connessione** di tutti gli altri blocchi.

| Blocco | Tipo | Cosa fa |
|---|---|---|
| [Redis · Connessione (connect)](redis.connect) | `redis.connect` | La connessione a un server Redis (server, porta, numero del database, utente, password, TLS). |
| [Redis · Leggi (GET)](redis.get) | `redis.get` | Il valore di una chiave di testo (vuoto se non c'è). |
| [Redis · Scrivi (SET)](redis.set) | `redis.set` | Scrive il valore di una chiave, con una scadenza e «solo se non esiste» (NX) o «solo se esiste» (XX). |
| [Redis · Elimina (DEL)](redis.del) | `redis.del` | Elimina una chiave, o ogni chiave di una lista. |
| [Redis · Esiste (EXISTS)](redis.exists) | `redis.exists` | Se una chiave esiste (con una lista: se esistono tutte, e quante). |
| [Redis · Incrementa (INCRBY)](redis.incr) | `redis.incr` | Aggiunge un passo al numero di una chiave (con la virgola, INCRBYFLOAT). |
| [Redis · Scadenza (EXPIRE · TTL)](redis.expire) | `redis.expire` | Legge, imposta o toglie la scadenza di una chiave. |
| [Redis · Hash: leggi (HGET · HGETALL)](redis.hget) | `redis.hget` | Un campo di un hash, o tutto l'hash come oggetto. |
| [Redis · Hash: scrivi campi (HSET)](redis.hset) | `redis.hset` | Scrive i campi di un oggetto in un hash; ogni ingresso aggiunto è un campo. |
| [Redis · Lista: aggiungi (LPUSH · RPUSH)](redis.push) | `redis.push` | Aggiunge un valore (o ognuno di una lista) all'inizio o alla fine di una lista. |
| [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop) | `redis.pop` | Toglie uno o più valori dall'inizio o dalla fine di una lista; può aspettarne uno (al massimo 25 secondi). |
| [Redis · Lista: intervallo (LRANGE)](redis.range) | `redis.range` | I valori di una lista da inizio a fine, senza toglierli. |
| [Redis · Pubblica (PUBLISH)](redis.publish) | `redis.publish` | Manda un messaggio su un canale a chi è iscritto. |
| [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) | `redis.subscribe` | Riceve ogni messaggio dei canali (o dei modelli) appena arriva, con una connessione sua. |
| [Redis · Cerca chiavi (SCAN)](redis.scan) | `redis.scan` | Le chiavi che corrispondono a un modello, mai con KEYS. |
| [Redis · Comando (call)](redis.command) | `redis.command` | Qualsiasi comando come lista; i comandi di amministrazione sono rifiutati. |

## Un primo esempio

```
[Redis · Connessione (connect)] connessione ──▶ connessione [Redis · Incrementa (INCRBY): visite] valore ──▶ valore [Valore: visite]
[Pulsante: Visita] premuto ──▶ esegui
```

Il programma si collega a Redis all'avvio. Ogni volta che premi **Visita**, [Redis · Incrementa (INCRBY)](redis.incr) aggiunge 1 al numero della chiave `visite` e il [Valore](ui.value) mostra il totale. Un altro programma che usa la stessa chiave aumenta lo stesso contatore.

## Da sapere

### Le connessioni le fa il kernel

Le connessioni non partono dal tuo browser né dal programma, ma dal **kernel**, cioè dal computer su cui gira lilOS, a nome dell'utente che possiede il programma. Per questo:

- funziona anche quando lilOS è chiuso nel browser, se il programma è attivo;
- il programma non vede mai né la password né un collegamento di rete: tiene solo un **riferimento** (un oggetto che esce dall'uscita **connessione**), che vale per lui soltanto. Un riferimento copiato in un altro programma non funziona («Connessione chiusa (o di un altro programma)»);
- quando il programma si ferma, tutte le sue connessioni e le sue iscrizioni si chiudono;
- un programma attivo usa davvero il server, anche quando non guardi: provalo prima con **Prova**, soprattutto con i blocchi che scrivono o eliminano;
- quello che un utente può fare davvero dipende anche dall'**utente Redis (ACL)** della connessione.

### Il riferimento alla connessione (handle)

L'uscita **connessione** è un piccolo oggetto che contiene solo un codice casuale, il tipo di database (`redis`) e il nome del server. Si porta con un [collegamento](ide/blocks) a tutti i blocchi che devono usare quella connessione. Un riferimento di un altro tipo di database (per esempio quello di [Blocchi MongoDB](logicstudio-mongodb)) non si può usare qui: «Questa connessione è a mongodb: questo blocco non la può usare». Il numero del database e la connessione sono uno: per un altro numero serve un altro blocco di connessione.

Alcune operazioni usano una **connessione in più**, fatta dal kernel con le stesse impostazioni: ogni [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) e ogni attesa di [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop). Contano tutte nelle connessioni aperte dell'utente.

### La password

L'impostazione **Password** del blocco di connessione è un campo fatto apposta: quello che scrivi non si vede e non torna mai indietro. Il motore lo **cifra** (AES-GCM) per te, su questo lilOS, e nello schema resta solo il testo cifrato. Quindi:

- chi apre lo schema (o un file del progetto) non vede la password;
- un altro utente, o lo stesso schema su un altro lilOS, **non la può aprire**: la connessione dà l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)», e la password va scritta di nuovo;
- la password può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**: in quel caso non viene salvata da nessuna parte. Un valore non vuoto sull'ingresso vince su quello delle impostazioni.

Gli errori del server, e quindi anche quelli che potrebbero contenere la password, arrivano su **Exception** in una riga e senza la password (al suo posto ci sono tre pallini).

### La cifratura (TLS)

Il blocco di connessione ha la scelta **Cifratura (TLS)**: «Sì, con il certificato controllato» (di partenza), «Sì, senza controllare il certificato» e «No». Un Redis in casa che non ha TLS ha bisogno di **No**. Per un server su internet lascia la scelta di partenza. I dettagli sono nella pagina [Redis · Connessione (connect)](redis.connect).

### Gli indirizzi e l'impostazione dell'amministratore

Il nome del server viene risolto e **ogni** indirizzo che ha viene controllato prima di collegarsi; poi la connessione va proprio all'indirizzo controllato (con TLS il certificato è controllato sul nome del server). Così un nome non può essere spostato su un indirizzo vietato tra il controllo e la connessione. Non ci sono Sentinel né Cluster, che manderebbero il programma ad altri indirizzi.

- **Mai permessi**, nemmeno dall'amministratore: gli indirizzi «link-local» `169.254.x.x` e `fe80::…` (lì molti cloud tengono i dati segreti della macchina), gli indirizzi multicast, `0.x.x.x`, `255.255.255.255` e `::`.
- **Bloccati se l'amministratore non li permette**: questo computer (`127.x.x.x`, `localhost`, `::1`), le reti locali (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`, `fc00::…`), la rete condivisa dei gestori (`100.64.x.x`–`100.127.x.x`), gli indirizzi riservati e di documentazione, e gli indirizzi IPv6 che contengono dentro un indirizzo IPv4.
- Per permettere i secondi, un amministratore spunta **Permetti i database su questo computer e sulla rete locale** nelle impostazioni del modulo.

Un Redis nella tua rete di casa o dell'ufficio ha quindi bisogno che un amministratore spunti quella casella.

### Il database di lilOS non si apre mai

I database che lilOS usa per sé (gli indirizzi scritti nella configurazione del kernel) **non sono raggiungibili** dai blocchi, neanche con la rete locale permessa e neanche con un altro nome dello stesso computer: la connessione dà «Questo è il database di lilOS: i blocchi non possono usarlo». Per lo stesso server puoi usare un'altra porta, non quella di lilOS.

### I valori

Redis conserva **testo**. I blocchi si comportano così:

- Un **testo** resta un testo; un numero o un sì/no diventano testo (`5`, `true`); `null` il testo vuoto; un oggetto o una lista sono scritti come testo JSON.
- I dati binari `{ "$bytes": "base64" }` (come negli altri pacchetti database) sono scritti come dati binari.
- Con l'opzione **JSON** dei blocchi che leggono e scrivono, il valore è scritto con `JSON.stringify` e riletto con `JSON.parse`: oggetti, liste, numeri e sì/no tornano tali. Se il testo letto non è JSON, il blocco dà l'errore «Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo». In [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) un messaggio che non è JSON resta un testo, senza errore.
- Le risposte di [Redis · Comando (call)](redis.command) diventano valori di Logic Studio (testi, numeri, `null`, liste).

### Impostazioni del modulo

Le cambia un amministratore, nelle impostazioni del modulo `logicstudio-redis`, e valgono dall'operazione successiva per tutti i programmi.

| Impostazione | Predefinito | Valori | Cosa fa |
|---|---|---|---|
| **Permetti i database su questo computer e sulla rete locale** | no | sì / no | Se è spuntata, le connessioni possono andare a `localhost`, `192.168.x.x`, `10.x.x.x` e alle altre reti non pubbliche. Gli indirizzi link-local e multicast e i database di lilOS restano vietati. |
| **Tempo massimo di un'operazione (secondi)** | 30 | da 1 a 600 | Quanto può durare una connessione o un comando. Allo scadere l'operazione si ferma con un errore. |
| **Valori in un risultato, al massimo (chiavi, elementi di una lista, campi di un hash)** | 10000 | da 1 a 1000000 | Il numero più alto di valori che [Redis · Cerca chiavi (SCAN)](redis.scan), [Redis · Lista: intervallo (LRANGE)](redis.range), [Redis · Hash: leggi (HGET · HGETALL)](redis.hget) e [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop) (con **Quanti**) danno. Se ce ne sono di più, **troncato** è vero e gli altri non escono. |
| **Dimensione massima di un risultato (KB)** | 4096 | da 16 a 65536 | Quanto può essere grande un risultato (misurato come JSON). Se è più grande, errore. |
| **Connessioni aperte per utente, al massimo (ogni iscrizione conta come una)** | 10 | da 1 a 100 | Le connessioni aperte insieme da tutti i programmi di un utente, comprese quelle delle iscrizioni e delle attese. |
| **Operazioni al minuto per utente, al massimo** | 600 | da 1 a 100000 | Le operazioni (connessioni, comandi, apertura di un'iscrizione…) che un utente può fare in un minuto. |
| **Permetti i database Redis** | sì | sì / no | Se è tolta, la connessione dà «L'amministratore non permette i database Redis». |
| **Permetti il blocco «Comando» (qualsiasi comando tranne quelli di amministrazione)** | sì | sì / no | Se è tolta, [Redis · Comando (call)](redis.command) dà «L'amministratore ha disattivato il blocco Comando (impostazioni del modulo)». |

### Quote e limiti

| Cosa | Limite |
|---|---|
| Operazioni al minuto, per utente | 600 di serie (impostazione del modulo); vale per tutti i suoi programmi insieme, prove comprese |
| Connessioni aperte, per utente | 10 di serie (impostazione del modulo); ogni iscrizione e ogni attesa di Togli ne conta una |
| Tempo di un comando | 30 secondi di serie (impostazione del modulo) |
| Valori di un risultato | 10000 di serie (impostazione del modulo) |
| Dimensione di un risultato | 4096 KB di serie (impostazione del modulo) |
| Lunghezza di una chiave, di un campo o di un canale | 10000 caratteri |
| Chiavi in un [Redis · Elimina (DEL)](redis.del) o [Redis · Esiste (EXISTS)](redis.exists) | 10000 |
| Argomenti di un comando | 10000 |
| Attesa di [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop) | 25 secondi |
| Iscrizioni ([Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe)) per connessione | 10; al massimo 32 canali per iscrizione |
| Messaggi in attesa di essere letti, per iscrizione | 1000 (i più vecchi si perdono; l'uscita nascosta **persi** dice quanti) |
| Tempo massimo di un blocco | 30 secondi di serie (Pannello di controllo → Logic Studio → **Limiti**): vale anche se il tempo massimo di un comando è più lungo |

Le operazioni sono quelle del database; non si confondono con le richieste di rete del pacchetto [Blocchi di rete](logicstudio-net). Vedi anche [Limiti](logicstudio-engine/limits).

### Le app fatte con Crea app

Un'app fatta con **Crea app** che contiene blocchi Redis usa il server a nome di chi la lancia, con le sue quote. Vedi [Permessi](logicstudio-engine/permissions) e [Fare un'app](ide/create-app).

### Gli errori più comuni

Gli errori arrivano sull'uscita **Exception** del blocco, in italiano e su una riga. Quelli che valgono per tutti i blocchi:

| Messaggio | Quando |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa (da **chiudi**, da una nuova **connetti** o perché il programma si è fermato). |
| Questa connessione è a …: questo blocco non la può usare | Il riferimento è di un altro tipo di database. |
| Connessione a Redis chiusa: riaprila con il blocco di connessione | La rete è caduta e la connessione non si è riaperta. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo. |
| Redis non ha risposto in tempo (limite del modulo) | Il comando ha superato il tempo massimo dentro la libreria. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Troppe connessioni aperte: al massimo 10 per utente | Hai troppe connessioni aperte. |
| Il programma non è in esecuzione | Il programma si stava fermando. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | La chiave esiste ma è di un altro tipo (`WRONGTYPE`). |
| Questo è il database di lilOS: i blocchi non possono usarlo | Il server è un database che lilOS usa per sé. |
| Indirizzo non permesso: … | L'indirizzo è vietato (rete locale senza il permesso dell'amministratore, link-local, multicast). |
| Server sconosciuto: … / Server non raggiungibile: … (…) | Il nome non esiste o la rete non arriva al server. |
| Connessione rifiutata dal server Redis | Il server non accetta connessioni su quella porta. |
| Accesso negato: utente o password non validi | Il server rifiuta l'utente o la password. |
| Permesso negato dal database: … | L'utente ACL non può usare quel comando o quella chiave. |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…) | La password è stata cifrata da un altro utente o su un altro lilOS. |
| L'amministratore non permette i database Redis | Redis è disattivato nelle impostazioni del modulo. |

Gli errori di connessione (server, porta, numero del database…) sono elencati nella pagina [Redis · Connessione (connect)](redis.connect); quelli di ogni comando, nella pagina del blocco; gli altri messaggi che arrivano dal server Redis (`ERR …`) sono nella lingua del server, cioè in inglese.

## Librerie

Il server è raggiunto con questa libreria, inclusa nel modulo:

| Libreria | Per | Licenza |
|---|---|---|
| [ioredis](https://github.com/redis/ioredis) (`ioredis`) | Redis | MIT |

La licenza è anche in Pannello di controllo → Informazioni → Riconoscimenti.

## Limiti noti

- Niente Sentinel né Cluster: la connessione è a un solo server.
- Non ci sono blocchi per le transazioni (`MULTI`/`EXEC`), gli script (`EVAL`) e le funzioni, e [Redis · Comando (call)](redis.command) li rifiuta.
- I messaggi pubblicati non si conservano: [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) riceve solo quelli che arrivano mentre ascolta. Per code che non devono perdere lavori usa una lista.
- I valori sono testo: i numeri tornano numeri solo con l'opzione **JSON** (o con [Cast (converti tipo)](core.convert)).

## Vedi anche

- [Blocchi database (SQL)](logicstudio-db), [Blocchi MongoDB](logicstudio-mongodb)
- [Blocchi di base](logicstudio-core), [Blocchi di rete](logicstudio-net), [Blocchi di lilOS](logicstudio-lilos)
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits), [Permessi](logicstudio-engine/permissions)
- [Come funziona un blocco](ide/blocks)
