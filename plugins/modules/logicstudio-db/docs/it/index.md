# Blocchi database (SQL)

`logicstudio-db` · richiede il motore `logicstudio-engine` (1.7.0 o successivo) e i [Blocchi di base](logicstudio-core)

I blocchi che fanno parlare un programma di Logic Studio con un database SQL: **PostgreSQL**, **MySQL e MariaDB**, **Microsoft SQL Server** (anche Azure SQL), **SQLite** (un file della tua home, oppure in memoria), **Oracle** (12c o successivo) e **ClickHouse**. Si può scrivere l'SQL a mano, con parametri sicuri, oppure leggere, inserire, aggiornare e cancellare righe senza scrivere SQL. Ci sono anche le transazioni, i cursori per le tabelle grandi, l'elenco di tabelle e colonne e, per PostgreSQL, le notifiche. Nell'elenco dei blocchi dell'IDE sono nella categoria **Database**.

## Come si installa

Il pacchetto non arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore**, scheda **Kernel** («Blocchi database (SQL)»). L'AppStore installa insieme anche il motore e i blocchi di base, se mancano. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE.

## I blocchi

Un blocco di **connessione** (uno per database) apre la connessione e manda un riferimento dall'uscita **connessione**; quel riferimento si collega all'ingresso **connessione** di tutti gli altri blocchi.

| Blocco | Tipo | Cosa fa |
|---|---|---|
| [SQL · PostgreSQL (connect)](db.postgres) | `db.postgres` | La connessione a un server PostgreSQL (porta 5432). |
| [SQL · MySQL · MariaDB (connect)](db.mysql) | `db.mysql` | La connessione a un server MySQL o MariaDB (porta 3306). |
| [SQL · SQL Server (connect)](db.mssql) | `db.mssql` | La connessione a Microsoft SQL Server o Azure SQL (porta 1433, o un'istanza). |
| [SQL · SQLite (open)](db.sqlite) | `db.sqlite` | Un database SQLite in un file della tua home (creato se manca), oppure in memoria. |
| [SQL · Oracle (connect)](db.oracle) | `db.oracle` | La connessione a un server Oracle Database (porta 1521, nome del servizio). |
| [SQL · ClickHouse (connect)](db.clickhouse) | `db.clickhouse` | La connessione a un server ClickHouse, con la sua interfaccia HTTP (porta 8123). |
| [SQL · Query (query)](db.query) | `db.query` | Esegue l'SQL che scrivi; `:nome` è un parametro e ogni ingresso aggiunto con quel nome ne dà il valore. Manda righe, prima riga, righe modificate. |
| [SQL · Leggi tabella (SELECT)](db.select) | `db.select` | Legge le righe di una tabella senza SQL; ogni ingresso aggiunto è una condizione colonna = valore. |
| [SQL · Inserisci (INSERT)](db.insert) | `db.insert` | Inserisce una riga o una lista di righe; senza **riga**, gli ingressi aggiunti sono le colonne. |
| [SQL · Aggiorna (UPDATE)](db.update) | `db.update` | Cambia le colonne di **valori** nelle righe che rispettano le condizioni. |
| [SQL · Elimina (DELETE)](db.delete) | `db.delete` | Cancella le righe che rispettano le condizioni. |
| [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) | `db.transaction` | Apre una transazione: i blocchi collegati alla sua uscita **transazione** si confermano o si annullano insieme. |
| [SQL · Scorri righe (cursor)](db.cursor) | `db.cursor` | Esegue una query e manda le righe una alla volta (o a gruppi): per le tabelle grandi. |
| [SQL · Tabelle e colonne (schema)](db.tables) | `db.tables` | L'elenco delle tabelle e delle viste, o le colonne di una tabella. |
| [SQL · Ascolta (LISTEN)](db.listen) | `db.listen` | Solo PostgreSQL: riceve le notifiche di un canale finché il programma gira. |
| [SQL · Notifica (NOTIFY)](db.notify) | `db.notify` | Solo PostgreSQL: manda una notifica su un canale. |

## Un primo esempio

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Query (query): SELECT * FROM ordini WHERE cliente = :cliente] righe ──▶ righe [Tabella]
[Campo di testo: cliente] testo ──▶ cliente
[Pulsante: Cerca] premuto ──▶ esegui
```

Il programma si collega al database all'avvio. Quando premi **Cerca**, la query parte con il valore del campo di testo come parametro `:cliente`, e le righe vanno nella [Tabella](ui.table). Il valore non finisce mai nel testo SQL: il database lo riceve a parte, quindi anche un nome come `Rossi'; DROP TABLE ordini; --` è solo un nome.

## Da sapere

### Le connessioni le fa il kernel

Le connessioni non partono dal tuo browser né dal programma, ma dal **kernel**, cioè dal computer su cui gira lilOS, a nome dell'utente che possiede il programma. Per questo:

- funziona anche quando lilOS è chiuso nel browser, se il programma è attivo;
- il programma non vede mai né la password né un collegamento di rete: tiene solo un **riferimento** (un oggetto che esce dall'uscita **connessione**), che vale per lui soltanto. Un riferimento copiato in un altro programma non funziona («Connessione chiusa (o di un altro programma)»);
- quando il programma si ferma, tutte le sue connessioni, transazioni, cursori e ascolti si chiudono;
- un programma attivo usa davvero il database, anche quando non guardi: provalo prima con **Prova**, soprattutto con i blocchi che scrivono.

### Il riferimento alla connessione (handle)

L'uscita **connessione** è un piccolo oggetto che contiene solo un codice casuale, il tipo di database e il nome del server. Si porta con un [collegamento](ide/blocks) a tutti i blocchi che devono usare quella connessione. Un blocco di [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) manda a sua volta un riferimento (**transazione**): collegato al posto della connessione, fa stare quel blocco dentro la transazione.

### La password

L'impostazione **Password** dei blocchi di connessione è un campo nuovo, fatto apposta: quello che scrivi non si vede e non torna mai indietro. Il motore lo **cifra** (AES-GCM) per te, su questo lilOS, e nello schema resta solo il testo cifrato. Quindi:

- chi apre lo schema (o un file del progetto) non vede la password;
- un altro utente, o lo stesso schema su un altro lilOS, **non la può aprire**: la connessione dà l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)», e la password va scritta di nuovo;
- la password può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**: in quel caso non viene salvata da nessuna parte. Un valore non vuoto sull'ingresso vince su quello delle impostazioni.

Gli errori del server, e quindi anche quelli che potrebbero contenere la password, arrivano su **Exception** in una riga e senza la password (al suo posto ci sono tre pallini).

### La connessione cifrata (TLS)

I blocchi di connessione (tranne SQLite) hanno la scelta **Connessione cifrata (TLS)**:

| Scelta | Cosa vuol dire |
|---|---|
| **No (non cifrata)** | Niente cifratura: password e dati viaggiano in chiaro. Va bene solo su una rete di cui ti fidi. |
| **Cifrata, certificato non controllato** | I dati viaggiano cifrati, ma il certificato del server non viene controllato: protegge da chi ascolta, non da chi si finge il server. |
| **Cifrata e controllata** | Cifrata, e il certificato (catena e nome del server) deve essere valido: un certificato scaduto, autofirmato o di un altro nome dà errore. |

Il valore di partenza è **No** per PostgreSQL, MySQL e MariaDB, Oracle e ClickHouse, e **Cifrata (certificato non controllato)** per SQL Server. Per un server su internet usa **Cifrata e controllata**.

### Gli indirizzi e l'impostazione dell'amministratore

Il nome del server viene risolto e **ogni** indirizzo che ha viene controllato prima di collegarsi; poi la connessione va proprio all'indirizzo controllato. Così un nome non può essere spostato su un indirizzo vietato tra il controllo e la connessione.

- **Mai permessi**, nemmeno dall'amministratore: gli indirizzi «link-local» `169.254.x.x` e `fe80::…` (lì molti cloud tengono i dati segreti della macchina), gli indirizzi multicast, `0.x.x.x`, `255.255.255.255` e `::`.
- **Bloccati se l'amministratore non li permette**: questo computer (`127.x.x.x`, `localhost`, `::1`), le reti locali (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`, `fc00::…`), la rete condivisa dei gestori (`100.64.x.x`–`100.127.x.x`), gli indirizzi riservati e di documentazione, e gli indirizzi IPv6 che contengono dentro un indirizzo IPv4.
- Per permettere i secondi, un amministratore spunta **Permetti i database su questo computer e sulla rete locale** nelle impostazioni del modulo.

Un database nella tua rete di casa o dell'ufficio ha quindi bisogno che un amministratore spunti quella casella. SQLite non usa la rete e non è toccato da queste regole.

### Il database di lilOS non si apre mai

I database che lilOS usa per sé (per esempio quello di `fs-postgres`, scritto nella configurazione del kernel o nella variabile `LILOS_PG_URL`) e l'API del kernel stesso **non sono raggiungibili** dai blocchi, neanche con la rete locale permessa e neanche con un altro nome dello stesso computer: la connessione dà «Questo è il database di lilOS: i blocchi non possono usarlo». Per lo stesso server puoi usare un altro database o un'altra porta, non quello di lilOS.

### I valori

- I numeri grandi (`bigint`, `numeric`, `NUMBER`…) escono come numeri quando sono esatti, come **testo** quando un numero di Logic Studio non li rappresenterebbe senza perdere cifre.
- Date e ore escono come **testo ISO** (`2026-11-11T10:05:00.000Z`).
- I dati binari escono come `{ "$bytes": "base64" }`; un oggetto con quella forma, mandato a un blocco, torna a essere binario.
- Oggetti e liste mandati a un database che non ha un tipo per loro (MySQL, SQL Server, SQLite, Oracle) diventano testo JSON; PostgreSQL li riceve come JSON.
- I valori `null` sono il «niente» del database.
- Ogni database ha le sue particolarità: sono nella pagina del suo blocco di connessione.

### Le condizioni dei blocchi senza SQL

Per [SQL · Leggi tabella (SELECT)](db.select), [SQL · Aggiorna (UPDATE)](db.update) ed [SQL · Elimina (DELETE)](db.delete), ogni ingresso aggiunto è una condizione `colonna = valore` (il nome dell'ingresso è il nome della colonna), unite con **AND**. Un valore `null` diventa `IS NULL`; una lista diventa `IN (…)` (una lista vuota non trova nessuna riga). L'oggetto sull'ingresso nascosto **condizioni** aggiunge altre colonne. Nomi di tabelle e di colonne sono controllati (lettere, cifre e `_`, al massimo 63 caratteri) e messi tra virgolette per quel database; `schema.tabella` indica uno schema. Aggiorna ed Elimina **senza** condizioni non fanno niente: danno errore, a meno che **Tutte le righe** sia spuntato.

### Impostazioni del modulo

Le cambia un amministratore, nelle impostazioni del modulo `logicstudio-db`, e valgono dall'operazione successiva per tutti i programmi.

| Impostazione | Predefinito | Valori | Cosa fa |
|---|---|---|---|
| **Permetti i database su questo computer e sulla rete locale** | no | sì / no | Se è spuntata, le connessioni possono andare a `localhost`, `192.168.x.x`, `10.x.x.x` e alle altre reti non pubbliche. Gli indirizzi link-local e multicast e i database di lilOS restano vietati. |
| **Tempo massimo di un'operazione (secondi)** | 30 | da 1 a 600 | Quanto può durare una connessione o una query. Allo scadere l'operazione si ferma con un errore. |
| **Righe massime di un risultato** | 10000 | da 1 a 1000000 | Il numero di righe più alto che una query, una lettura o un cursore danno. Se ce ne sono di più, **troncato** (o **altre righe**) è vero e le altre non escono. |
| **Dimensione massima di un risultato (KB)** | 4096 | da 16 a 65536 | Quanto può essere grande un risultato (misurato come JSON). Se è più grande, errore. |
| **Connessioni aperte per utente, al massimo** | 10 | da 1 a 100 | Le connessioni aperte insieme da tutti i programmi di un utente. |
| **Operazioni al minuto per utente, al massimo** | 600 | da 1 a 100000 | Le operazioni (query, letture, scritture, passi di un cursore, apertura di connessioni…) che un utente può fare in un minuto. |
| **Dimensione massima di un file SQLite (MB)** | 1024 | da 1 a 1024 | Quanto può essere grande il file di un database SQLite. |
| **Permetti PostgreSQL**, **MySQL e MariaDB**, **SQL Server**, **SQLite**, **Oracle**, **ClickHouse** | sì | sì / no | Quali database si possono usare. Un tipo disattivato dà errore alla connessione. |

### Quote e limiti

| Cosa | Limite |
|---|---|
| Operazioni al minuto, per utente | 600 di serie (impostazione del modulo); vale per tutti i suoi programmi insieme, prove comprese |
| Connessioni aperte, per utente | 10 di serie (impostazione del modulo) |
| Tempo di un'operazione | 30 secondi di serie (impostazione del modulo) |
| Righe di un risultato | 10000 di serie (impostazione del modulo) |
| Dimensione di un risultato | 4096 KB di serie (impostazione del modulo) |
| Testo di una query | 100000 caratteri |
| Parametri di una query | 2000 (SQL Server), 1000 (Oracle, ClickHouse), 999 (SQLite), 30000 (PostgreSQL, MySQL e MariaDB) |
| Righe di un'unica [SQL · Inserisci (INSERT)](db.insert) | quante le righe massime di un risultato |
| Tempo massimo di un blocco | 30 secondi di serie (Pannello di controllo → Logic Studio → **Limiti**): vale anche se il tempo massimo di un'operazione è più lungo |

Le operazioni sono quelle del database; non si confondono con le richieste di rete del pacchetto [Blocchi di rete](logicstudio-net). Vedi anche [Limiti](logicstudio-engine/limits).

### I file SQLite

SQLite non ha un server: il database è un file della **tua home**, per esempio `~/Documenti/dati.sqlite`. Il file è letto e scritto **come te**, quindi valgono le tue regole e la tua quota di spazio. Solo i file della tua home (`~/…` oppure `/home/<utente>/…`): mai la cartella `.config`, mai un file il cui contenuto è protetto da un'app.

- Il file viene letto **tutto in memoria** quando il blocco si collega e riscritto **un secondo dopo l'ultima modifica**, a ogni **conferma** di una transazione e alla chiusura. Se la query troppo lunga viene fermata, le modifiche non ancora salvate si perdono.
- Un file aperto **in scrittura** appartiene a **un programma alla volta**; un altro programma riceve un errore, oppure lo può aprire con **Sola lettura**.
- Con **In memoria** non c'è nessun file: il database vive finché il programma gira.
- Un file nuovo viene creato (vuoto) quando ti colleghi, nella cartella che indichi, che deve esistere.
- SQLite gira in un **thread a parte**: una query troppo lunga viene fermata senza bloccare lilOS.
- La dimensione massima è l'impostazione **Dimensione massima di un file SQLite (MB)** (al massimo 1024).

I dettagli sono nella pagina [SQL · SQLite (open)](db.sqlite).

### Le app fatte con Crea app

Un'app fatta con **Crea app** che contiene blocchi database usa il database a nome di chi la lancia, con le sue quote. Vedi [Permessi](logicstudio-engine/permissions) e [Fare un'app](ide/create-app).

### Gli errori più comuni

Gli errori arrivano sull'uscita **Exception** del blocco, in italiano e su una riga. Quelli che valgono per tutti i blocchi:

| Messaggio | Quando |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa (da **chiudi**, da una nuova **connetti** o perché il programma si è fermato). |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| Il database non ha risposto in 30 s | L'operazione ha superato il tempo massimo (i driver dicono anche «… non ha risposto in 30 s: la query è stata annullata»). |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Troppe connessioni aperte: al massimo 10 per utente | Hai troppe connessioni aperte. |
| Il programma non è in esecuzione | Il programma si stava fermando. |

Gli errori di connessione (server, indirizzo, password…) sono elencati nella pagina di ogni blocco di connessione; quelli dell'SQL (tabella che non c'è, colonna sbagliata…) sono scritti dal database.

## Librerie

I database sono raggiunti con queste librerie, incluse nel modulo:

| Libreria | Per | Licenza |
|---|---|---|
| `pg` | PostgreSQL | MIT |
| `mysql2` | MySQL e MariaDB | MIT |
| `tedious` | SQL Server | MIT |
| `sql.js` | SQLite (SQLite compilato in WebAssembly) | MIT |
| `oracledb` (modalità *thin*, senza Oracle Client) | Oracle | Apache-2.0 o UPL-1.0 |

ClickHouse usa la sua interfaccia HTTP, senza librerie. Le licenze sono anche in Pannello di controllo → Informazioni → Riconoscimenti.

## Limiti noti

- MySQL e MariaDB accettano una sola istruzione per query.
- ClickHouse non ha transazioni.
- SQL · Ascolta (LISTEN) e SQL · Notifica (NOTIFY) ci sono solo per PostgreSQL.
- MongoDB, Redis, InfluxDB ed Elasticsearch hanno i loro pacchetti: [Blocchi MongoDB](logicstudio-mongodb), [Blocchi Redis](logicstudio-redis), [Blocchi InfluxDB](logicstudio-influxdb), [Blocchi Elasticsearch](logicstudio-elasticsearch).
- Su una connessione ci sono al massimo 20 transazioni, cursori e ascolti aperti insieme.
- Le righe e la dimensione massime si controllano quando il risultato è arrivato al kernel: una query che restituisce moltissimi dati occupa memoria finché non arriva il suo errore. Chiedi solo le righe che servono (LIMIT, condizioni) o usa [SQL · Scorri righe (cursor)](db.cursor).
- La password cifrata vale per te su questo lilOS, ma non è legata al server: se qualcuno può cambiare il tuo schema e mettere un altro server, la password andrebbe a quel server. Non dare ad altri il permesso di scrivere i tuoi schemi.
- La cifratura (TLS) è spenta di serie per PostgreSQL, MySQL, Oracle e ClickHouse: per un server su internet scegli «Cifrata e controllata».

## Vedi anche

- [Blocchi di base](logicstudio-core), [Blocchi di rete](logicstudio-net), [Blocchi di lilOS](logicstudio-lilos)
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits), [Permessi](logicstudio-engine/permissions)
- [Come funziona un blocco](ide/blocks)
