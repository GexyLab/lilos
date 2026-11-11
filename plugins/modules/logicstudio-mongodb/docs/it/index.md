# Blocchi MongoDB

`logicstudio-mongodb` · richiede il motore `logicstudio-engine` (1.7.0 o successivo) e i [Blocchi di base](logicstudio-core)

I blocchi che fanno parlare un programma di Logic Studio con un database **MongoDB**: leggere, inserire, aggiornare ed eliminare documenti, contare, aggregare, elencare le raccolte e ricevere le modifiche appena avvengono. Funzionano con un MongoDB tuo e con Atlas. Nell'elenco dei blocchi dell'IDE sono nella categoria **Database**, con il nome che comincia per «MongoDB ·».

## Come si installa

Il pacchetto non arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore**, scheda **Kernel** («Blocchi MongoDB»). L'AppStore installa insieme anche il motore e i blocchi di base, se mancano. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE.

## I blocchi

Il blocco di **connessione** apre la connessione e manda un riferimento dall'uscita **connessione**; quel riferimento si collega all'ingresso **connessione** di tutti gli altri blocchi.

| Blocco | Tipo | Cosa fa |
|---|---|---|
| [MongoDB · Connessione (MongoClient)](mongo.connect) | `mongo.connect` | La connessione a un server MongoDB (indirizzo `mongodb://` o `mongodb+srv://`, oppure server e porta). |
| [MongoDB · Trova (find)](mongo.find) | `mongo.find` | I documenti di una raccolta che corrispondono al filtro, con campi, ordine, limite e salto; ogni ingresso aggiunto è un campo del filtro. |
| [MongoDB · Inserisci (insertOne · insertMany)](mongo.insert) | `mongo.insert` | Inserisce un documento o una lista di documenti; ogni ingresso aggiunto è un campo del documento. |
| [MongoDB · Aggiorna (updateOne · updateMany)](mongo.update) | `mongo.update` | Cambia il primo documento (o tutti) che corrisponde al filtro: `$set`, `$inc`…; con **upsert** lo inserisce se manca. |
| [MongoDB · Elimina (deleteOne · deleteMany)](mongo.delete) | `mongo.delete` | Elimina il primo documento (o tutti) che corrisponde al filtro; un filtro vuoto solo con «Tutti i documenti». |
| [MongoDB · Conta (countDocuments)](mongo.count) | `mongo.count` | Quanti documenti corrispondono al filtro. |
| [MongoDB · Aggrega (aggregate)](mongo.aggregate) | `mongo.aggregate` | Una pipeline di aggregazione: una lista di passi `$match`, `$group`, `$sort`…. |
| [MongoDB · Osserva modifiche (watch)](mongo.watch) | `mongo.watch` | Manda ogni modifica di una raccolta (o del database) appena avviene. Serve un replica set o un cluster. |
| [MongoDB · Raccolte (listCollections)](mongo.collections) | `mongo.collections` | I nomi (e i tipi) delle raccolte del database. |

## Un primo esempio

```
[MongoDB · Connessione (MongoClient)] connessione ──▶ connessione [MongoDB · Trova (find): ordini] documenti ──▶ righe [Tabella]
[Campo di testo: stato] testo ──▶ stato
[Pulsante: Cerca] premuto ──▶ esegui
```

Il programma si collega al database all'avvio. Aggiungi a [MongoDB · Trova (find)](mongo.find) un ingresso e chiamalo `stato`; quando premi **Cerca**, il blocco cerca i documenti di `ordini` con `stato` uguale al testo del campo, e la [Tabella](ui.table) li mostra.

## Da sapere

### Le connessioni le fa il kernel

Le connessioni non partono dal tuo browser né dal programma, ma dal **kernel**, cioè dal computer su cui gira lilOS, a nome dell'utente che possiede il programma. Per questo:

- funziona anche quando lilOS è chiuso nel browser, se il programma è attivo;
- il programma non vede mai né la password né un collegamento di rete: tiene solo un **riferimento** (un oggetto che esce dall'uscita **connessione**), che vale per lui soltanto. Un riferimento copiato in un altro programma non funziona («Connessione chiusa (o di un altro programma)»);
- quando il programma si ferma, tutte le sue connessioni e le sue osservazioni si chiudono;
- un programma attivo usa davvero il database, anche quando non guardi: provalo prima con **Prova**, soprattutto con i blocchi che scrivono o eliminano.

### Il riferimento alla connessione (handle)

L'uscita **connessione** è un piccolo oggetto che contiene solo un codice casuale, il tipo di database (`mongodb`) e il nome del server. Si porta con un [collegamento](ide/blocks) a tutti i blocchi che devono usare quella connessione. Un riferimento di un altro tipo di database (per esempio quello di [Blocchi Redis](logicstudio-redis)) non si può usare qui: «Questa connessione è a redis: questo blocco non la può usare». Il database e la connessione sono uno: per un altro database serve un altro blocco di connessione.

### La password

L'impostazione **Password** del blocco di connessione è un campo fatto apposta: quello che scrivi non si vede e non torna mai indietro. Il motore lo **cifra** (AES-GCM) per te, su questo lilOS, e nello schema resta solo il testo cifrato. Quindi:

- chi apre lo schema (o un file del progetto) non vede la password;
- un altro utente, o lo stesso schema su un altro lilOS, **non la può aprire**: la connessione dà l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)», e la password va scritta di nuovo;
- la password può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**: in quel caso non viene salvata da nessuna parte. Un valore non vuoto sull'ingresso vince su quello delle impostazioni;
- nell'**indirizzo (URI)** la password non può stare: viene rifiutato.

Gli errori del server, e quindi anche quelli che potrebbero contenere la password, arrivano su **Exception** in una riga e senza la password (al suo posto ci sono tre pallini).

### La cifratura (TLS)

Il blocco di connessione ha la scelta **Cifratura (TLS)**: «Sì, con il certificato controllato» (di partenza), «Sì, senza controllare il certificato» e «No». Un MongoDB in casa che non ha TLS ha bisogno di **No**. Per un server su internet (Atlas) lascia la scelta di partenza. I dettagli sono nella pagina [MongoDB · Connessione (MongoClient)](mongo.connect).

### Gli indirizzi e l'impostazione dell'amministratore

Il nome del server viene risolto e **ogni** indirizzo che ha viene controllato prima di collegarsi; poi la connessione va proprio all'indirizzo controllato. Così un nome non può essere spostato su un indirizzo vietato tra il controllo e la connessione. Vale anche per le risposte SRV di `mongodb+srv://` e per i membri che un replica set annuncia.

- **Mai permessi**, nemmeno dall'amministratore: gli indirizzi «link-local» `169.254.x.x` e `fe80::…` (lì molti cloud tengono i dati segreti della macchina), gli indirizzi multicast, `0.x.x.x`, `255.255.255.255` e `::`.
- **Bloccati se l'amministratore non li permette**: questo computer (`127.x.x.x`, `localhost`, `::1`), le reti locali (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`, `fc00::…`), la rete condivisa dei gestori (`100.64.x.x`–`100.127.x.x`), gli indirizzi riservati e di documentazione, e gli indirizzi IPv6 che contengono dentro un indirizzo IPv4.
- Per permettere i secondi, un amministratore spunta **Permetti i database su questo computer e sulla rete locale** nelle impostazioni del modulo.
- Con **Server** e **Porta** il blocco parla solo con quel server; con un indirizzo (URI) scopre i membri del replica set, e uno annunciato con un indirizzo non permesso chiude la connessione: «Il server indica un membro a un indirizzo non permesso (…): connessione chiusa».
- Nell'indirizzo (URI) non sono permesse le opzioni che leggerebbero file del computer (`tlsCAFile`…), i proxy e i meccanismi di accesso diversi da SCRAM e PLAIN (che leggerebbero i metadati dei cloud): l'elenco è nella pagina [MongoDB · Connessione (MongoClient)](mongo.connect).

Un MongoDB nella tua rete di casa o dell'ufficio ha quindi bisogno che un amministratore spunti quella casella.

### Il database di lilOS non si apre mai

I database che lilOS usa per sé (per esempio quello di `fs-postgres`, scritto nella configurazione del kernel) **non sono raggiungibili** dai blocchi, neanche con la rete locale permessa e neanche con un altro nome dello stesso computer: la connessione dà «Questo è il database di lilOS: i blocchi non possono usarlo». Per lo stesso server puoi usare un altro database o un'altra porta, non quello di lilOS.

### I valori: Extended JSON

I documenti entrano e escono in **Extended JSON (relaxed)**, cioè JSON con qualche oggetto speciale per i tipi che JSON non ha:

| Tipo di MongoDB | Come si scrive |
|---|---|
| ObjectId | `{"$oid": "65a1b2c3d4e5f60718293a4b"}` |
| Data | `{"$date": "2026-11-11T10:05:00Z"}` (esce così: `{"$date": "2026-11-11T10:05:00.000Z"}`) |
| Dato binario | `{"$bytes": "base64"}` (come negli altri pacchetti database); dentro il documento diventa un binario di MongoDB |
| Numeri, testi, sì/no, `null`, liste, oggetti | Come in JSON |

- I numeri molto grandi (`Long`, `Decimal128`) escono come numeri, o come testo se un numero di Logic Studio non li rappresenterebbe senza perdere cifre.
- **Il filtro, la modifica, la pipeline e le altre opzioni** possono essere un oggetto o un testo. Se il testo non è JSON, il blocco lo prova a leggere come nella shell di MongoDB: chiavi senza virgolette (`{stato: 'nuovo'}`), testi tra apici, `ObjectId("…")`, `ISODate("…")` o `new Date("…")`, virgole alla fine.
- Un valore che arriva su un **ingresso aggiunto** (un campo del filtro o del documento) è usato così com'è: un testo resta un testo, un oggetto è Extended JSON (`{"$oid": "…"}`, `{"$date": "…"}`).
- Un ingresso aggiunto chiamato `_id` con un testo di 24 cifre esadecimali trova sia l'ObjectId sia il testo uguale.

### Impostazioni del modulo

Le cambia un amministratore, nelle impostazioni del modulo `logicstudio-mongodb`, e valgono dall'operazione successiva per tutti i programmi.

| Impostazione | Predefinito | Valori | Cosa fa |
|---|---|---|---|
| **Permetti i database su questo computer e sulla rete locale** | no | sì / no | Se è spuntata, le connessioni possono andare a `localhost`, `192.168.x.x`, `10.x.x.x` e alle altre reti non pubbliche. Gli indirizzi link-local e multicast e i database di lilOS restano vietati. |
| **Tempo massimo di un'operazione (secondi)** | 30 | da 1 a 600 | Quanto può durare una connessione o un'operazione. Allo scadere l'operazione si ferma con un errore (anche sul server, con `maxTimeMS`). |
| **Documenti in un risultato, al massimo** | 10000 | da 1 a 1000000 | Il numero di documenti più alto che una lettura o un'aggregazione danno. Se ce ne sono di più, **troncato** è vero e gli altri non escono. |
| **Dimensione massima di un risultato (KB)** | 4096 | da 16 a 65536 | Quanto può essere grande un risultato (misurato come JSON). Se è più grande, errore. |
| **Connessioni aperte per utente, al massimo** | 10 | da 1 a 100 | Le connessioni aperte insieme da tutti i programmi di un utente. |
| **Operazioni al minuto per utente, al massimo** | 600 | da 1 a 100000 | Le operazioni (connessioni, letture, scritture, conteggi, aggregazioni, apertura di un ascolto…) che un utente può fare in un minuto. |
| **Permetti i database MongoDB** | sì | sì / no | Se è tolta, la connessione dà «L'amministratore non permette i database MongoDB». |

### Quote e limiti

| Cosa | Limite |
|---|---|
| Operazioni al minuto, per utente | 600 di serie (impostazione del modulo); vale per tutti i suoi programmi insieme, prove comprese |
| Connessioni aperte, per utente | 10 di serie (impostazione del modulo) |
| Tempo di un'operazione | 30 secondi di serie (impostazione del modulo), anche sul server |
| Documenti di un risultato | 10000 di serie (impostazione del modulo) |
| Dimensione di un risultato | 4096 KB di serie (impostazione del modulo) |
| Documenti di un unico inserimento | quanti i documenti massimi di un risultato |
| Testo di un filtro, di una modifica o di una pipeline | 1 MB (se scritto come testo) |
| Server in un indirizzo (URI) | 10 |
| Connessioni verso il server, per blocco di connessione | 5 |
| Ascolti ([MongoDB · Osserva modifiche (watch)](mongo.watch)) per connessione | 10 |
| Modifiche in attesa di essere lette, per ascolto | 1000 (le più vecchie si perdono; l'uscita nascosta **perse** dice quante) |
| Tempo massimo di un blocco | 30 secondi di serie (Pannello di controllo → Logic Studio → **Limiti**): vale anche se il tempo massimo di un'operazione è più lungo |

Le operazioni sono quelle del database; non si confondono con le richieste di rete del pacchetto [Blocchi di rete](logicstudio-net). Vedi anche [Limiti](logicstudio-engine/limits).

### Le app fatte con Crea app

Un'app fatta con **Crea app** che contiene blocchi MongoDB usa il database a nome di chi la lancia, con le sue quote. Vedi [Permessi](logicstudio-engine/permissions) e [Fare un'app](ide/create-app).

### Gli errori più comuni

Gli errori arrivano sull'uscita **Exception** del blocco, in italiano e su una riga. Quelli che valgono per tutti i blocchi:

| Messaggio | Quando |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa (da **chiudi**, da una nuova **connetti** o perché il programma si è fermato). |
| Questa connessione è a …: questo blocco non la può usare | Il riferimento è di un altro tipo di database. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| MongoDB non ha risposto in 30 s | L'operazione ha superato il tempo massimo. |
| Il database ha impiegato troppo tempo (limite del modulo) | Il server ha fermato l'operazione per il suo tempo massimo (`maxTimeMS`). |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Troppe connessioni aperte: al massimo 10 per utente | Hai troppe connessioni aperte. |
| Il programma non è in esecuzione | Il programma si stava fermando. |
| Questo è il database di lilOS: i blocchi non possono usarlo | Il server è un database che lilOS usa per sé. |
| Indirizzo non permesso: … | L'indirizzo è vietato (rete locale senza il permesso dell'amministratore, link-local, multicast). |
| Server sconosciuto: … / Server non raggiungibile: … (…) | Il nome non esiste o la rete non arriva al server. |
| Accesso negato: utente o password non validi | Il server rifiuta l'utente o la password. |
| Permesso negato dal database: … | L'utente non ha il permesso per quell'operazione. |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…) | La password è stata cifrata da un altro utente o su un altro lilOS. |
| L'amministratore non permette i database MongoDB | MongoDB è disattivato nelle impostazioni del modulo. |

Gli errori di connessione (server, indirizzo, opzioni dell'indirizzo…) sono elencati nella pagina [MongoDB · Connessione (MongoClient)](mongo.connect); quelli del filtro e dei documenti, nella pagina di ogni blocco; i messaggi che arrivano dal server MongoDB (chiave duplicata, validazione…) sono nella lingua del server, cioè in inglese.

## Librerie

Il database è raggiunto con questa libreria, inclusa nel modulo:

| Libreria | Per | Licenza |
|---|---|---|
| [MongoDB Node.js Driver](https://github.com/mongodb/node-mongodb-native) (`mongodb`) | MongoDB | Apache-2.0 |

La licenza è anche in Pannello di controllo → Informazioni → Riconoscimenti.

## Limiti noti

- Il database è quello scelto nella connessione: per un altro database serve un altro blocco di connessione.
- Non ci sono blocchi per gli indici, le transazioni, GridFS o le scritture in blocco con operazioni miste.
- [MongoDB · Osserva modifiche (watch)](mongo.watch) funziona solo con un replica set o un cluster (anche un replica set di un solo server), non con un server singolo.
- Le operazioni in corso non si possono annullare da un blocco, solo fermare con il tempo massimo.

## Vedi anche

- [Blocchi database (SQL)](logicstudio-db), [Blocchi Redis](logicstudio-redis)
- [Blocchi di base](logicstudio-core), [Blocchi di rete](logicstudio-net), [Blocchi di lilOS](logicstudio-lilos)
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits), [Permessi](logicstudio-engine/permissions)
- [Come funziona un blocco](ide/blocks)
