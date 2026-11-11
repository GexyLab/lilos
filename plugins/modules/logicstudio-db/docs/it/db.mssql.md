# SQL · SQL Server (connect)

`db.mssql` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Apre una connessione a **Microsoft SQL Server** (anche **Azure SQL**) e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi database. Si collega con utente e password di SQL Server (l'accesso con l'account di Windows non c'è).

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
| **server** (`info`) | oggetto | Nascosta. Com'è fatto il server: `{ "kind": "mssql", "label": "SQL Server", "name": "srv.esempio.it:1433/magazzino", "server": "SQL Server …" }`. |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: server che non c'è, password sbagliata, indirizzo non permesso, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Server (nome o indirizzo)** (`host`) | testo | vuoto | Il computer del database: un nome (`srv.esempio.it`, o `mio.database.windows.net` per Azure SQL) o un indirizzo. |
| **Porta** (`port`) | da 1 a 65535 | 1433 | La porta di SQL Server. Non conta se scrivi un'**Istanza**. |
| **Istanza (vuota: la porta)** (`instance`) | testo | vuoto | Il nome di un'istanza con nome (per esempio `SQLEXPRESS`). Vedi sotto. |
| **Database** (`database`) | testo | vuoto | Il database a cui collegarsi. Vuoto: quello di serie dell'utente. |
| **Utente** (`user`) | testo | vuoto | L'utente di SQL Server (per esempio `sa`). |
| **Password** (`password`) | campo password | vuota | La password dell'utente. Quello che scrivi non si vede e viene cifrato dal motore. |
| **Connessione cifrata (TLS)** (`tls`) | No (non cifrata), Cifrata (certificato non controllato), Cifrata e controllata | Cifrata (certificato non controllato) | Se e come cifrare la connessione. Azure SQL vuole sempre la connessione cifrata. |
| **Connessioni nel pool** (`poolSize`) | da 1 a 10 | 4 | Quante connessioni al server il blocco tiene aperte al massimo (una transazione ne occupa una). Quelle libere si chiudono dopo 30 secondi. |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione e manda **connessione**, poi **connesso**, poi **server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, tutte le connessioni (e le transazioni e i cursori che hanno dentro) si chiudono.
- La connessione la fa il **kernel**. Il nome del server viene risolto e ogni indirizzo controllato; questo computer e la rete locale restano bloccati a meno che un amministratore non li permetta; il database di lilOS non si apre mai. Vedi [Blocchi database (SQL)](logicstudio-db).
- La **Password** è cifrata dal motore per te, su questo lilOS: su un altro lilOS o per un altro utente dà «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…)» e va scritta di nuovo. Può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**.

### SQL Server in particolare

- **Istanza**: con un nome di istanza il blocco chiede la porta al servizio *SQL Server Browser* (porta UDP 1434) dello stesso computer; la **Porta** non si usa. Senza istanza si usa la **Porta** (1433 di serie). Il servizio Browser e la porta UDP devono essere raggiungibili.
- **Cifratura**: di serie è «Cifrata (certificato non controllato)», perché molti server hanno un certificato proprio. Per Azure SQL e per i server con un certificato vero scegli «Cifrata e controllata».
- **Pool**: il blocco tiene da sé un piccolo pool (una connessione fa una richiesta per volta).
- **Valori**: `BIGINT` esce come numero quando è esatto, come testo altrimenti; `DECIMAL`, `NUMERIC` e `MONEY` escono come numeri; date e ore come testo ISO; `VARBINARY` come `{ "$bytes": "base64" }`. Una colonna senza nome esce come `col1`, `col2`…
- **Parametri**: `:nome` diventa `@p1`, `@p2`…, con il tipo scelto dal valore (intero, decimale, sì/no, testo Unicode, binario). Un testo ISO resta un testo: usa `CONVERT` o `CAST` nell'SQL se serve una data.
- **Più istruzioni**: una query può avere più istruzioni; esce l'ultimo risultato che ha righe.
- **Scrittura**: [SQL · Inserisci (INSERT)](db.insert) usa `OUTPUT INSERTED.*`: escono le righe inserite e **ultimo id** è il primo campo dell'ultima riga (di solito la colonna `IDENTITY`).
- **Leggi tabella**: con **Salta righe** il blocco usa `OFFSET … FETCH` (e `ORDER BY (SELECT NULL)` se non scegli un ordine); senza, `TOP`.
- **Nomi**: tra parentesi quadre (`[clienti]`).
- **Isolamento**: SQL Server è l'unico a conoscere anche *Snapshot* (il database deve averlo attivo).
- Le notifiche (LISTEN e NOTIFY) non ci sono.

## Esempi

### 1. Leggere un magazzino ogni minuto

Impostazioni: **Server** `srv.esempio.it`, **Database** `magazzino`, **Utente** `lettore`, **Connessione cifrata (TLS)** «Cifrata e controllata». **SQL · Query**: `SELECT TOP 20 codice, giacenza FROM articoli ORDER BY giacenza`.

```
[SQL · SQL Server (connect)] connessione ──▶ connessione [SQL · Query (query)] righe ──▶ righe [Tabella]
[Intervallo (setInterval): 60 s] impulso ──────────▶ esegui
```

### 2. Un'istanza con nome

**Server** `192.168.1.30`, **Istanza** `SQLEXPRESS`; l'amministratore ha spuntato «Permetti i database su questo computer e sulla rete locale».

```
[SQL · SQL Server (connect)] connessione ──▶ connessione [SQL · Tabelle e colonne (schema)] tabelle ──▶ righe [Tabella]
[Pulsante: Collega] premuto ──▶ connetti              connesso ──▶ esegui
```

**Connetti all'avvio** non è spuntato: il [Pulsante](ui.button) apre la connessione; quando arriva **connesso**, [SQL · Tabelle e colonne (schema)](db.tables) elenca le tabelle e le viste.

## Errori

Gli errori comuni (server, indirizzo, quote, password non leggibile…) sono elencati nella pagina [Blocchi database (SQL)](logicstudio-db). In più:

| Messaggio | Quando |
|---|---|
| Manca il server | **Server** è vuoto. |
| L'amministratore non permette i database SQL Server (impostazioni del modulo logicstudio-db) | SQL Server è disattivato nelle impostazioni del modulo. |
| SQL Server non ha risposto in 30 s: la query è stata annullata | L'operazione ha superato il tempo massimo. |
| Tutte le 4 connessioni a SQL Server sono occupate da … s | Tutte le connessioni del pool sono in uso (per esempio da transazioni aperte). |
| La transazione è già chiusa | Si è usata una transazione dopo la conferma o l'annullamento. |
| Login failed for user '…' | Utente o password sbagliati (messaggio del server, in inglese). |
| Failed to connect to … in … ms | Il server o l'istanza non risponde (messaggio della libreria). |

## Vedi anche

- [SQL · Query (query)](db.query), [SQL · Leggi tabella (SELECT)](db.select), [SQL · Inserisci (INSERT)](db.insert), [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Blocchi database (SQL)](logicstudio-db), per i limiti, le quote e le impostazioni del modulo
- [Input (readline)](core.consoleRead), per chiedere la password a chi usa il programma
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
