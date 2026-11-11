# MongoDB · Connessione (MongoClient)

`mongo.connect` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Apre una connessione a un server **MongoDB** e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi MongoDB. Funziona anche con Atlas (indirizzo `mongodb+srv://`) e con i replica set.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **connetti** (`connect`) | impulso | Qualsiasi valore che arriva qui apre la connessione (se questo blocco ne ha già una, la chiude prima). |
| **chiudi** (`close`) | impulso | Nascosta. Chiude la connessione. |
| **password** (`password`) | testo | Nascosta. La password, se non vuoi tenerla nelle impostazioni. Se ha un valore non vuoto, prende il posto della **Password** delle impostazioni. **Non avvia il blocco**: tiene il valore per la prossima connessione. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **connessione** (`connection`) | oggetto | Il riferimento alla connessione aperta. Vale solo per questo programma. |
| **connesso** (`connected`) | sì/no | `true` quando la connessione è aperta, `false` quando viene chiusa con **chiudi**. |
| **server** (`info`) | oggetto | Nascosta. Com'è fatto il server: `{ "server": "db.esempio.it:27017/vendite", "database": "vendite", "version": "7.0.5", "replicaSet": "rs0", "primary": true, "changeStreams": true }`. `replicaSet` è `null` per un server singolo; `changeStreams` dice se [MongoDB · Osserva modifiche (watch)](mongo.watch) può funzionare. |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: indirizzo non valido o non permesso, server che non c'è, accesso negato, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indirizzo (URI: mongodb:// o mongodb+srv://, senza password; vuoto = i campi qui sotto)** (`uri`) | testo | vuoto | Per esempio `mongodb://db.esempio.it:27017/vendite` o `mongodb+srv://cluster0.abcde.mongodb.net/vendite`. Se c'è, **Server** e **Porta** non contano. Può avere più server separati da virgole (al massimo 10) e alcune opzioni (vedi sotto). |
| **Server** (`host`) | testo | vuoto | Il computer del database: un nome o un indirizzo. Si usa solo senza **Indirizzo (URI)**. |
| **Porta** (`port`) | da 1 a 65535 | 27017 | La porta di MongoDB (solo senza **Indirizzo (URI)**). |
| **Database** (`database`) | testo | vuoto | Il database da usare. Vuoto: quello dell'indirizzo (URI), altrimenti `test`. Se c'è, vince su quello dell'indirizzo. Fino a 64 caratteri, senza spazi, `/`, `\`, `.`, `"`, `$`, `*`, `<`, `>`, `:`, `|`, `?`. |
| **Utente** (`user`) | testo | vuoto | L'utente. Vuoto: quello dell'indirizzo (URI), se c'è; senza utente la connessione è senza accesso. |
| **Password** (`password`) | campo password | vuota | La password dell'utente. Quello che scrivi non si vede e viene cifrato dal motore (vedi sotto). |
| **Database degli utenti (authSource, vuoto = admin)** (`authSource`) | testo | vuoto | Il database dove sta l'utente. Vuoto: quello dell'indirizzo (URI), altrimenti `admin`. |
| **Cifratura (TLS)** (`tls`) | Sì, con il certificato controllato; Sì, senza controllare il certificato; No | Sì, con il certificato controllato | Se e come cifrare la connessione. Vedi sotto. |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione e manda **connessione**, poi **connesso**, poi **server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova con le impostazioni di adesso.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, tutte le connessioni (e le osservazioni che hanno dentro) si chiudono.
- La connessione la fa il **kernel**, non il programma: il programma non vede mai la password né un collegamento di rete, solo il riferimento. Vedi [Blocchi MongoDB](logicstudio-mongodb).
- Gli errori del server arrivano su **Exception** in una riga, senza la password (al suo posto ci sono tre pallini).
- Il blocco tiene al massimo 5 connessioni verso il server (per le operazioni che arrivano insieme); per l'utente conta come **una** connessione aperta.
- Il server vede il programma come `lilOS Logic Studio` (`appName`). La connessione si apre in al massimo 10 secondi, e la scelta del server entro il tempo massimo di un'operazione (al massimo 30 secondi).

### Il server: indirizzo (URI) o campi

- Con **Server** e **Porta** il blocco parla **solo con quel server** (connessione diretta): non scopre e non usa altri membri di un replica set. Va bene per un server singolo o per parlare con un membro preciso.
- Con un **indirizzo (URI)** il blocco scopre i membri del replica set o del cluster. Un membro annunciato con un indirizzo non permesso chiude la connessione. Con `mongodb+srv://` il nome ha un solo nome con un punto, senza porta.
- Nell'indirizzo la **password non può stare**: `mongodb://anna:segreta@…` è rifiutato; scrivi solo `mongodb://anna@…` (o niente) e metti la password nel campo **Password**.
- Opzioni permesse nell'indirizzo: `replicaSet`, `authSource`, `authMechanism` (solo `SCRAM-SHA-1`, `SCRAM-SHA-256`, `PLAIN`), `retryWrites`, `retryReads`, `w`, `wtimeoutMS`, `journal`, `readPreference`, `readPreferenceTags`, `readConcernLevel`, `maxStalenessSeconds`, `connectTimeoutMS`, `socketTimeoutMS`, `serverSelectionTimeoutMS`, `heartbeatFrequencyMS`, `localThresholdMS`, `appName`, `directConnection`, `loadBalanced`, `compressors` (solo `zlib`), `zlibCompressionLevel`, `srvMaxHosts`, `srvServiceName`, `maxIdleTimeMS`, `waitQueueTimeoutMS`, `timeoutMS`.
- **Non permesse**: le opzioni `tls…` e `ssl…` (la cifratura si sceglie nel campo **Cifratura (TLS)**: così non si leggono file del computer come `tlsCAFile`), le opzioni `proxy…`, `authMechanismProperties`, i meccanismi di accesso diversi da SCRAM e PLAIN (leggerebbero i metadati dei cloud), `maxPoolSize`, `minPoolSize` e `maxConnecting`, e ogni altra opzione che non è nell'elenco.
- Con un nome di server, ogni indirizzo che ha viene controllato prima di collegarsi (vedi gli indirizzi nella pagina [Blocchi MongoDB](logicstudio-mongodb)); con `mongodb+srv://` anche le risposte SRV e i membri che il cluster annuncia.

### La password

L'impostazione **Password** è cifrata dal motore (AES-GCM) per te, su questo lilOS: nello schema resta solo il testo cifrato. Un altro utente, o lo stesso schema su un altro lilOS, non la può aprire e riceve l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)»: la password va scritta di nuovo. Può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**; un valore non vuoto sull'ingresso vince su quello delle impostazioni. Una password senza **Utente** è un errore.

### La cifratura (TLS)

| Scelta | Cosa vuol dire |
|---|---|
| **Sì, con il certificato controllato** | Cifrata, e il certificato (catena e nome del server) deve essere valido. È la scelta di partenza, e quella giusta per un server su internet (Atlas). |
| **Sì, senza controllare il certificato** | Cifrata, ma il certificato non viene controllato: protegge da chi ascolta, non da chi si finge il server. Per i server con un certificato autofirmato. |
| **No** | Niente cifratura: password e dati viaggiano in chiaro. Va bene solo su una rete di cui ti fidi, per esempio un MongoDB sul tuo computer (che l'amministratore deve aver permesso). |

Un MongoDB installato in casa senza TLS richiede quindi **No**: con la scelta di partenza la connessione fallisce.

## Esempi

### 1. Collegarsi e leggere le raccolte

Impostazioni: **Server** `db.esempio.it`, **Database** `vendite`, **Utente** `anna`, **Password** (scritta nel campo), **Cifratura (TLS)** «Sì, con il certificato controllato».

```
[MongoDB · Connessione (MongoClient)] connessione ──▶ connessione [MongoDB · Raccolte (listCollections)] nomi ──▶ valore [Print (console.log)]
                                      connesso ──▶ esegui
                                      Exception ──▶ valore [Print (console.log)]
```

All'avvio il programma si collega. [MongoDB · Raccolte (listCollections)](mongo.collections) parte solo con **esegui**: collega **connesso** a **esegui** per leggere le raccolte appena la connessione è pronta, oppure un [Pulsante](ui.button).

### 2. Atlas con un indirizzo `mongodb+srv://`

**Indirizzo (URI)** `mongodb+srv://anna@cluster0.abcde.mongodb.net/vendite`, **Password** scritta nel campo, **Cifratura (TLS)** di partenza.

```
[MongoDB · Connessione (MongoClient)] connessione ──▶ connessione [MongoDB · Conta (countDocuments): ordini] quanti ──▶ valore [Valore]
                                      connesso ──▶ esegui
```

**connesso** arriva dopo **connessione**: [MongoDB · Conta (countDocuments)](mongo.count) vede già il riferimento e conta i documenti di `ordini`.

### 3. La password chiesta a chi usa il programma

Togli la spunta da **Connetti all'avvio** e lascia vuota la **Password**.

```
[Input (readline): "Password?", Nascondi quello che si scrive] valore ──▶ password [MongoDB · Connessione (MongoClient)] connessione ──▶ connessione [MongoDB · Raccolte (listCollections)] nomi ──▶ valore [Print (console.log)]
[Pulsante: Connetti] premuto ──────────────────────────────────────────────────▶ connetti                          connesso ──▶ esegui
```

La password arriva sull'ingresso nascosto, che la tiene senza avviare il blocco; il [Pulsante](ui.button) apre la connessione.

## Errori

Gli errori di rete e di quota più comuni (indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe connessioni, password non leggibile…) sono elencati nella pagina [Blocchi MongoDB](logicstudio-mongodb). In più:

| Messaggio | Quando |
|---|---|
| Manca il server: scrivi un indirizzo (URI) oppure il server | **Indirizzo (URI)** e **Server** sono vuoti. |
| Server non valido: … | Il nome del server è più lungo di 253 caratteri o contiene spazi, `/`, `@`, `?`, `#` o virgole. |
| Numero non valido: … | **Porta** non è un numero intero tra 1 e 65535. |
| Server sconosciuto: … / Server non raggiungibile: … (…) | Il nome non esiste o la rete non arriva al server. |
| Indirizzo non permesso: … | L'indirizzo è vietato (rete locale senza il permesso dell'amministratore, link-local, multicast). |
| Indirizzo (URI) non valido: scrivi mongodb://server:27017/database oppure mongodb+srv://cluster.esempio.net/database | L'indirizzo non comincia con `mongodb://` o `mongodb+srv://` o non si può leggere. |
| L'indirizzo (URI) contiene una password: toglila e scrivila nel campo Password (viene conservata cifrata) | C'è `utente:password@` nell'indirizzo. |
| Troppi server nell'indirizzo (al massimo 10) | L'indirizzo elenca più di 10 server. |
| Un indirizzo mongodb+srv:// ha un solo nome, senza porta | Un indirizzo `mongodb+srv://` con più nomi o con una porta. |
| Nome non valido per mongodb+srv: … | Il nome ha caratteri non permessi o non ha un punto. |
| Opzione … non permessa nell'indirizzo: usa il campo TLS | L'indirizzo ha un'opzione `tls…` o `ssl…`. |
| Opzione … non permessa: i blocchi non passano da un proxy | L'indirizzo ha un'opzione `proxy…`. |
| Opzione authMechanismProperties non permessa | L'indirizzo ha `authMechanismProperties`. |
| Opzione dell'indirizzo non permessa: … | L'indirizzo ha un'opzione che non è nell'elenco di quelle permesse. |
| Meccanismo di accesso non permesso: … (solo SCRAM-SHA-1, SCRAM-SHA-256 e PLAIN) | `authMechanism` è un altro meccanismo. |
| Compressione non permessa: solo zlib | `compressors` ha un valore diverso da `zlib` e `none`. |
| Opzioni maxPoolSize, minPoolSize e maxConnecting non permesse: i blocchi usano al massimo 5 connessioni per server | L'indirizzo cambia la dimensione del pool. |
| Server non valido nell'indirizzo: … / Nome utente non valido nell'indirizzo / Nome del database non valido nell'indirizzo | Una parte dell'indirizzo non si può leggere. |
| Nome del database non valido: … | **Database** ha caratteri non permessi o è più lungo di 64 caratteri. |
| C'è la password ma manca l'utente | **Password** (o l'ingresso **password**) ha un valore ma non c'è l'utente. |
| L'amministratore non permette i database MongoDB | MongoDB è disattivato nelle impostazioni del modulo logicstudio-mongodb. |
| Accesso negato: utente o password non validi | Il server rifiuta l'utente o la password (o l'**Database degli utenti** è sbagliato). |
| Permesso negato dal database: … | L'utente esiste ma non ha il permesso richiesto. |
| Server MongoDB non raggiungibile: … | Nessun server risponde (spento, porta sbagliata, TLS sì/no sbagliato, replica set senza primario…). Dopo i due punti, il motivo del driver. |
| Il server indica un membro a un indirizzo non permesso (…): connessione chiusa. … | Il cluster annuncia un membro a un indirizzo vietato (per esempio una rete locale non permessa). |
| MongoDB non ha risposto in 30 s | Il server non ha risposto entro il tempo massimo di un'operazione. |

## Vedi anche

- [MongoDB · Trova (find)](mongo.find), [MongoDB · Inserisci (insertOne · insertMany)](mongo.insert), [MongoDB · Osserva modifiche (watch)](mongo.watch), [MongoDB · Raccolte (listCollections)](mongo.collections)
- [Blocchi MongoDB](logicstudio-mongodb), per gli indirizzi, i limiti, le quote e le impostazioni del modulo
- [Blocchi database (SQL)](logicstudio-db), per i database SQL
- [Input (readline)](core.consoleRead), per chiedere la password a chi usa il programma
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
