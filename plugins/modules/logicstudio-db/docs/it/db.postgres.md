# SQL · PostgreSQL (connect)

`db.postgres` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Apre una connessione a un server **PostgreSQL** e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi database. Funziona anche con i server compatibili con PostgreSQL (per esempio Supabase, Neon, CockroachDB, Amazon RDS).

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
| **server** (`info`) | oggetto | Nascosta. Com'è fatto il server: `{ "kind": "postgres", "label": "PostgreSQL", "name": "db.esempio.it:5432/vendite", "server": "PostgreSQL 16.2 …" }`. |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: server che non c'è, password sbagliata, indirizzo non permesso, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Server (nome o indirizzo)** (`host`) | testo | vuoto | Il computer del database: un nome (`db.esempio.it`) o un indirizzo (`192.168.1.20`). |
| **Porta** (`port`) | da 1 a 65535 | 5432 | La porta di PostgreSQL. |
| **Database** (`database`) | testo | vuoto | Il database a cui collegarsi. Vuoto: quello di serie dell'utente. |
| **Utente** (`user`) | testo | vuoto | L'utente. |
| **Password** (`password`) | campo password | vuota | La password dell'utente. Quello che scrivi non si vede e viene cifrato dal motore (vedi sotto). |
| **Connessione cifrata (TLS)** (`tls`) | No (non cifrata), Cifrata (certificato non controllato), Cifrata e controllata | No (non cifrata) | Se e come cifrare la connessione. Il server deve avere SSL attivo per le scelte cifrate. |
| **Connessioni nel pool** (`poolSize`) | da 1 a 10 | 4 | Quante connessioni al server il blocco tiene aperte al massimo, per le operazioni che arrivano insieme (una transazione ne occupa una). |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione e manda **connessione**, poi **connesso**, poi **server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova con le impostazioni di adesso.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, tutte le connessioni (e le transazioni, i cursori e gli ascolti che hanno dentro) si chiudono.
- La connessione la fa il **kernel**, non il programma. Il nome del server viene risolto e ogni indirizzo controllato: questo computer e la rete locale restano bloccati a meno che un amministratore non li permetta; il database che lilOS usa per sé non si apre mai. Vedi [Blocchi database (SQL)](logicstudio-db).
- Gli errori del server arrivano su **Exception** in una riga, senza la password.

### La password

L'impostazione **Password** è cifrata dal motore (AES-GCM) per te, su questo lilOS: nello schema resta solo il testo cifrato. Un altro utente, o lo stesso schema su un altro lilOS, non la può aprire e riceve l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)»: la password va scritta di nuovo. Può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**; un valore non vuoto sull'ingresso vince su quello delle impostazioni.

### PostgreSQL in particolare

- **Valori**: i numeri `bigint` e `numeric` escono come numeri quando sono esatti, come testo quando non lo sarebbero (troppe cifre per un numero di Logic Studio). Date e ore escono come testo ISO (`2026-11-11T10:05:00.000Z`). I valori JSON e JSONB escono come oggetti e liste, gli array come liste, `bytea` come `{ "$bytes": "base64" }`.
- **Parametri**: `:nome` diventa `$1`, `$2`…; lo stesso nome usato due volte è un parametro solo. I cast `::int`, le stringhe, i nomi tra virgolette e il testo tra `$$…$$` non vengono toccati.
- **Scrittura**: [SQL · Inserisci (INSERT)](db.insert) usa `RETURNING *`: escono le righe inserite e **ultimo id** è il primo campo dell'ultima riga.
- **Cursore**: [SQL · Scorri righe (cursor)](db.cursor) usa un cursore del server dentro una transazione di sola lettura.
- **Notifiche**: solo PostgreSQL ha [SQL · Ascolta (LISTEN)](db.listen) e [SQL · Notifica (NOTIFY)](db.notify). Ogni ascolto tiene occupata una connessione del pool.
- **Tabelle**: [SQL · Tabelle e colonne (schema)](db.tables) elenca tabelle e viste di tutti gli schemi, tranne `pg_catalog` e `information_schema`.
- **Isolamento**: *Snapshot* non esiste in PostgreSQL e viene ignorato (vale quello del database).
- Il tempo massimo di un'operazione è anche il `statement_timeout` del server. Il server vede la connessione come `application_name` = `lilOS Logic Studio`.

## Esempi

### 1. Una tabella in una finestra

Impostazioni: **Server** `db.esempio.it`, **Database** `vendite`, **Utente** `anna`, **Password** (scritta nel campo), **Connessione cifrata (TLS)** «Cifrata e controllata». **SQL · Query (query)**: `SELECT id, cliente, totale FROM ordini ORDER BY id DESC LIMIT 50`.

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Query (query)] righe ──▶ righe [Tabella]
[Pulsante: Aggiorna]   premuto ───────────────────▶ esegui             Exception ──▶ valore [Print (console.log)]
```

All'avvio il programma si collega; ogni volta che premi il [Pulsante](ui.button) **Aggiorna**, [SQL · Query (query)](db.query) rilegge gli ordini e la [Tabella](ui.table) li mostra.

### 2. La password chiesta a chi usa il programma

Togli la spunta da **Connetti all'avvio** e lascia vuota la **Password**.

```
[Input (readline): "Password?", Nascondi quello che si scrive] valore ──▶ password [SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Tabelle e colonne (schema)] tabelle ──▶ valore [Print (console.log)]
[Pulsante: Connetti] premuto ──────────────────────────────────────────▶ connetti                          connesso ──▶ esegui
```

La password arriva sull'ingresso nascosto, che la tiene senza avviare il blocco. Il [Pulsante](ui.button) apre la connessione; quando il blocco manda **connesso**, [SQL · Tabelle e colonne (schema)](db.tables) elenca le tabelle.

### 3. Ricevere gli avvisi del database

Una funzione del database fa `NOTIFY ordini` quando arriva un ordine nuovo.

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Ascolta (LISTEN): ordini] messaggio ──▶ valore [Print (console.log)]
```

[SQL · Ascolta (LISTEN)](db.listen) parte da solo appena arriva la connessione e manda ogni notifica sul canale `ordini`.

## Errori

Gli errori di rete e di quota più comuni (server sconosciuto, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe connessioni, password non leggibile…) sono elencati nella pagina [Blocchi database (SQL)](logicstudio-db). In più:

| Messaggio | Quando |
|---|---|
| Manca il server | **Server** è vuoto. |
| Server sconosciuto: … / Server non raggiungibile: … (…) | Il nome non esiste o la rete non arriva al server. |
| Porta non valida: … | **Porta** non è tra 1 e 65535. |
| Indirizzo non permesso: … | L'indirizzo è vietato (rete locale senza il permesso dell'amministratore, link-local, multicast). |
| L'amministratore non permette i database PostgreSQL (impostazioni del modulo logicstudio-db) | PostgreSQL è disattivato nelle impostazioni del modulo. |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…) | La password è stata cifrata da un altro utente o su un altro lilOS. |
| PostgreSQL non ha risposto in 30 s | Il server non ha risposto entro il tempo massimo di un'operazione. |
| password authentication failed for user "…" | Il server rifiuta l'utente o la password (il messaggio è del server, in inglese). |
| The server does not support SSL connections | Hai scelto una connessione cifrata, ma il server non ha SSL attivo. |

## Vedi anche

- [SQL · Query (query)](db.query), [SQL · Leggi tabella (SELECT)](db.select), [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [SQL · Ascolta (LISTEN)](db.listen), [SQL · Notifica (NOTIFY)](db.notify), solo per PostgreSQL
- [Blocchi database (SQL)](logicstudio-db), per i limiti, le quote e le impostazioni del modulo
- [Input (readline)](core.consoleRead), per chiedere la password a chi usa il programma
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
