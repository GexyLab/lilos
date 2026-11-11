# SQL · Oracle (connect)

`db.oracle` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Apre una connessione a un server **Oracle Database** (12c o successivo) e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi database. Non serve installare Oracle Client: il modulo parla direttamente con il server (modalità *thin*).

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
| **server** (`info`) | oggetto | Nascosta. Com'è fatto il server: `{ "kind": "oracle", "label": "Oracle", "name": "ora.esempio.it:1521", "server": "Oracle Database 23ai …" }`. |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: server che non c'è, password sbagliata, servizio sconosciuto, indirizzo non permesso, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Server (nome o indirizzo)** (`host`) | testo | vuoto | Il computer del database: un nome o un indirizzo. |
| **Porta** (`port`) | da 1 a 65535 | 1521 | La porta del *listener* di Oracle. |
| **Nome del servizio** (`serviceName`) | testo | `FREEPDB1` | Il nome del servizio (service name) del database a cui collegarsi, per esempio `FREEPDB1` (Oracle Free) o `ORCLPDB1`. Lettere, cifre e `. _ $ # -`. |
| **Utente** (`user`) | testo | vuoto | L'utente (lo schema che possiede le tabelle). |
| **Password** (`password`) | campo password | vuota | La password dell'utente. Quello che scrivi non si vede e viene cifrato dal motore. |
| **Connessione cifrata (TLS)** (`tls`) | No (non cifrata), Cifrata (certificato non controllato), Cifrata e controllata | No (non cifrata) | Se e come cifrare la connessione (Oracle la chiama *tcps*: la porta cifrata è di solito la 2484). |
| **Connessioni nel pool** (`poolSize`) | da 1 a 10 | 4 | Quante connessioni al server il blocco tiene aperte al massimo (una transazione ne occupa una). |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione e manda **connessione**, poi **connesso**, poi **server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, tutte le connessioni (e le transazioni e i cursori che hanno dentro) si chiudono.
- La connessione la fa il **kernel**. Il nome del server viene risolto e ogni indirizzo controllato; questo computer e la rete locale restano bloccati a meno che un amministratore non li permetta; il database di lilOS non si apre mai. Vedi [Blocchi database (SQL)](logicstudio-db).
- La **Password** è cifrata dal motore per te, su questo lilOS: su un altro lilOS o per un altro utente dà «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…)» e va scritta di nuovo. Può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**.

### Oracle in particolare

- **Nome del servizio**: serve il *service name*, non il vecchio SID. Se è vuoto la connessione dà «Manca il servizio di Oracle…».
- **Nomi delle colonne in maiuscolo**: Oracle scrive in maiuscolo i nomi scritti senza virgolette, quindi le colonne di una query escono come `ID`, `NOME`, `TOTALE`. Per leggerle con [Get proprietà (obj.campo)](core.get) usa il nome maiuscolo. I blocchi senza SQL ([SQL · Leggi tabella (SELECT)](db.select), [SQL · Inserisci (INSERT)](db.insert)…) fanno da soli: un nome tutto minuscolo (`clienti`, `nome`) è messo in maiuscolo; un nome con maiuscole resta com'è.
- **Parametri**: `:nome` diventa `:1`, `:2`… (per posizione); un nome usato due volte vale due parametri con lo stesso valore.
- **Niente punto e virgola finale**: Oracle non lo accetta in fondo a una istruzione; una sola istruzione per query.
- **Valori**: `NUMBER` esce come numero quando è esatto, come testo altrimenti; `CLOB` come testo; `BLOB` e `RAW` come `{ "$bytes": "base64" }`; `DATE` e `TIMESTAMP` come testo ISO. Sì/no diventano 1 e 0 (il tipo `BOOLEAN` esiste solo da Oracle 23ai); oggetti e liste diventano testo JSON.
- **Scrittura**: ogni riga è un'istruzione `INSERT` a sé (Oracle non ha l'inserimento di più righe in uno) e non c'è `RETURNING`: **ultimo id** resta vuoto. Fuori da una transazione ogni istruzione è confermata subito (*autocommit*).
- **Leggi tabella**: usa `OFFSET … ROWS FETCH NEXT … ROWS ONLY`.
- **Tabelle**: [SQL · Tabelle e colonne (schema)](db.tables) elenca le tabelle e le viste dell'utente con cui ti sei collegato.
- **Isolamento**: Oracle conosce solo *Read committed* (di serie) e *Serializable*; *Repeatable read* e *Snapshot* diventano *Serializable*.
- **Connessione cifrata**: la cifratura la fa lilOS stesso, con un piccolo tunnel locale usato solo da questa connessione. I reindirizzamenti del listener a un altro indirizzo (installazioni RAC) non vengono seguiti.
- Le notifiche (LISTEN e NOTIFY) non ci sono.
- **Reindirizzamenti**: lilOS si collega al server sempre attraverso un piccolo tunnel locale (anche senza cifratura) e chiude la connessione se il listener chiede di passare a un altro indirizzo (*redirect*, tipico di RAC e dei server condivisi): così il kernel non arriva mai a un indirizzo che non ha controllato. Un server che reindirizza non si può usare: collegati direttamente all'istanza.

## Esempi

### 1. Leggere una tabella di Oracle Free

Impostazioni: **Server** `192.168.1.40` (con la rete locale permessa), **Nome del servizio** `FREEPDB1`, **Utente** `demo`. **SQL · Query**: `SELECT id, nome, totale FROM ordini WHERE totale > :minimo ORDER BY totale DESC`.

```
[SQL · Oracle (connect)] connessione ──▶ connessione [SQL · Query (query)] righe ──▶ righe [Tabella]
[Campo numerico: minimo] valore ──▶ minimo
[Pulsante: Cerca] premuto ──▶ esegui
```

Le colonne della tabella sono `ID`, `NOME`, `TOTALE`.

### 2. Aggiornare una riga

```
[SQL · Oracle (connect)] connessione ──▶ connessione [SQL · Aggiorna (UPDATE): ordini] righe modificate ──▶ valore [Print (console.log)]
[Oggetto { }: { "stato": "spedito" }] oggetto ──▶ valori
[Campo numerico: id] valore ──▶ id (ingresso aggiunto, la condizione id = valore)
[Pulsante: Spedisci] premuto ──▶ esegui
```

L'istruzione è `UPDATE "ORDINI" SET "STATO" = :1 WHERE "ID" = :2`. Fuori da una transazione la modifica è già confermata.

## Errori

Gli errori comuni (server, indirizzo, quote, password non leggibile…) sono elencati nella pagina [Blocchi database (SQL)](logicstudio-db). In più:

| Messaggio | Quando |
|---|---|
| Il server Oracle ha chiesto di collegarsi a un altro indirizzo (redirect): non è permesso | Il listener ha chiesto di passare a un altro indirizzo; collegati direttamente all'istanza. |
| Manca il servizio di Oracle (nome del servizio, per esempio FREEPDB1, o il database) | **Nome del servizio** è vuoto. |
| Nome del servizio non valido: … (lettere, cifre, . _ $ # -) | Il nome del servizio ha simboli non ammessi. |
| La connessione TLS a Oracle non è riuscita: … | La cifratura non si è stabilita (certificato non valido, porta non cifrata…). |
| L'amministratore non permette i database Oracle (impostazioni del modulo logicstudio-db) | Oracle è disattivato nelle impostazioni del modulo. |
| Oracle non ha risposto in 30 s: la query è stata annullata | L'operazione ha superato il tempo massimo. |
| La transazione è già chiusa | Si è usata una transazione dopo la conferma o l'annullamento. |
| ORA-01017: invalid credential or not authorized | Utente o password sbagliati (messaggio del server, in inglese). |
| ORA-12514 / NJS-518: cannot connect to database. Service … is not registered with the listener | Il nome del servizio non esiste (messaggio del server o della libreria). |
| ORA-00933: SQL command not properly ended | L'SQL ha un punto e virgola in fondo o più di un'istruzione. |

## Vedi anche

- [SQL · Query (query)](db.query), [SQL · Leggi tabella (SELECT)](db.select), [SQL · Inserisci (INSERT)](db.insert), [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Blocchi database (SQL)](logicstudio-db), per i limiti, le quote e le impostazioni del modulo
- [Input (readline)](core.consoleRead), per chiedere la password a chi usa il programma
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
