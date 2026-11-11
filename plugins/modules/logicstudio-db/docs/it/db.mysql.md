# SQL · MySQL · MariaDB (connect)

`db.mysql` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Apre una connessione a un server **MySQL** o **MariaDB** e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi database. L'uscita nascosta **server** dice quale dei due è (per esempio `MariaDB 11.4.2`).

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
| **server** (`info`) | oggetto | Nascosta. Com'è fatto il server: `{ "kind": "mysql", "label": "MySQL / MariaDB", "name": "db.esempio.it:3306/negozio", "server": "MariaDB 11.4.2" }`. |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: server che non c'è, password sbagliata, indirizzo non permesso, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Server (nome o indirizzo)** (`host`) | testo | vuoto | Il computer del database: un nome o un indirizzo. |
| **Porta** (`port`) | da 1 a 65535 | 3306 | La porta di MySQL e MariaDB. |
| **Database** (`database`) | testo | vuoto | Il database a cui collegarsi. Vuoto: nessuno (poi i nomi delle tabelle vanno con il database, `negozio.clienti`). |
| **Utente** (`user`) | testo | vuoto | L'utente. |
| **Password** (`password`) | campo password | vuota | La password dell'utente. Quello che scrivi non si vede e viene cifrato dal motore. |
| **Connessione cifrata (TLS)** (`tls`) | No (non cifrata), Cifrata (certificato non controllato), Cifrata e controllata | No (non cifrata) | Se e come cifrare la connessione. |
| **Connessioni nel pool** (`poolSize`) | da 1 a 10 | 4 | Quante connessioni al server il blocco tiene aperte al massimo (una transazione ne occupa una). |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione e manda **connessione**, poi **connesso**, poi **server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, tutte le connessioni (e le transazioni e i cursori che hanno dentro) si chiudono.
- La connessione la fa il **kernel**. Il nome del server viene risolto e ogni indirizzo controllato; questo computer e la rete locale restano bloccati a meno che un amministratore non li permetta; il database di lilOS non si apre mai. Vedi [Blocchi database (SQL)](logicstudio-db).
- La **Password** è cifrata dal motore per te, su questo lilOS: su un altro lilOS o per un altro utente dà «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…)» e va scritta di nuovo. Può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**.

### MySQL e MariaDB in particolare

- **Un'istruzione per volta**: ogni query può avere una sola istruzione (niente istruzioni una dopo l'altra). Una procedura che dà più risultati manda l'ultimo che ha righe.
- **Valori**: gli interi grandi escono come numeri quando sono esatti, come testo altrimenti; `DECIMAL` esce come **testo** (così non perde cifre). Date e ore escono come testo ISO in UTC. Un testo ISO con il suo fuso (`2026-11-11T10:05:00Z`) mandato a un parametro diventa una data, perché MySQL non accetta la forma «T…Z». Gli `TINYINT(1)` escono come 0 e 1. Oggetti e liste mandati come parametri diventano testo JSON.
- **Parametri**: `:nome` diventa `?`; le stringhe, i nomi tra apici inversi e i commenti non vengono toccati.
- **Scrittura**: non c'è `RETURNING`: [SQL · Inserisci (INSERT)](db.insert) manda in **ultimo id** il valore generato dalla colonna `AUTO_INCREMENT`; l'uscita nascosta **righe inserite** è vuota.
- **Nomi**: i nomi di tabelle e colonne dei blocchi senza SQL sono messi tra apici inversi, come vuole MySQL.
- **Cursore**: [SQL · Scorri righe (cursor)](db.cursor) legge le righe man mano dal server; se lo ferma prima della fine, la connessione di quel cursore si chiude.
- **Tabelle**: [SQL · Tabelle e colonne (schema)](db.tables) elenca le tabelle e le viste del database scelto.
- **Isolamento**: *Snapshot* non esiste e viene ignorato.
- Le notifiche (LISTEN e NOTIFY) non ci sono.

## Esempi

### 1. Cercare un cliente

```
[Campo di testo: nome] testo ──▶ nome [SQL · Query (query): SELECT * FROM clienti WHERE nome LIKE :nome] righe ──▶ righe [Tabella]
[SQL · MySQL · MariaDB (connect)] connessione ──▶ connessione
[Pulsante: Cerca] premuto ──▶ esegui
```

Nel blocco **SQL · Query** aggiungi un ingresso e chiamalo `nome`. Con il valore `Ros%` la query cerca i clienti che iniziano per «Ros». Il valore passa come parametro, mai dentro il testo SQL.

### 2. Aggiungere una riga e sapere il suo numero

```
[SQL · MySQL · MariaDB (connect)] connessione ──▶ connessione [SQL · Inserisci (INSERT): clienti] ultimo id ──▶ valore [Print (console.log)]
[Campo di testo: nome] testo ──▶ nome (ingresso aggiunto)
[Pulsante: Aggiungi]   premuto ──▶ esegui
```

Nel blocco **SQL · Inserisci (INSERT)** aggiungi un ingresso e chiamalo `nome`: è la colonna della riga. Dopo l'inserimento, **ultimo id** manda il numero che MySQL ha dato alla riga nuova.

## Errori

Gli errori comuni (server, indirizzo, quote, password non leggibile…) sono elencati nella pagina [Blocchi database (SQL)](logicstudio-db). In più:

| Messaggio | Quando |
|---|---|
| Manca il server | **Server** è vuoto. |
| L'amministratore non permette i database MySQL / MariaDB (impostazioni del modulo logicstudio-db) | MySQL e MariaDB sono disattivati nelle impostazioni del modulo. |
| MySQL / MariaDB non ha risposto in 30 s | Il server non ha risposto entro il tempo massimo di un'operazione. |
| Access denied for user '…' | Utente o password sbagliati (il messaggio è del server, in inglese). |
| Unknown database '…' | Il database non esiste (messaggio del server). |
| You have an error in your SQL syntax… | L'SQL non è valido, o contiene più di un'istruzione (messaggio del server). |

## Vedi anche

- [SQL · Query (query)](db.query), [SQL · Leggi tabella (SELECT)](db.select), [SQL · Inserisci (INSERT)](db.insert), [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Blocchi database (SQL)](logicstudio-db), per i limiti, le quote e le impostazioni del modulo
- [Input (readline)](core.consoleRead), per chiedere la password a chi usa il programma
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
