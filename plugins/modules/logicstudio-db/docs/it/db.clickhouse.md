# SQL · ClickHouse (connect)

`db.clickhouse` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Apre una connessione a un server **ClickHouse** e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi database. Il modulo usa l'interfaccia **HTTP** di ClickHouse (porta 8123), senza librerie. ClickHouse è un database fatto per grandi quantità di dati da leggere e analizzare (registri, misure nel tempo).

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
| **server** (`info`) | oggetto | Nascosta. Com'è fatto il server: `{ "kind": "clickhouse", "label": "ClickHouse", "name": "ch.esempio.it:8123/misure", "server": "ClickHouse 24.8.1.1" }`. |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: server che non c'è, password sbagliata, indirizzo non permesso, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Server (nome o indirizzo)** (`host`) | testo | vuoto | Il computer del database: un nome o un indirizzo. |
| **Porta** (`port`) | da 1 a 65535 | 8123 | La porta HTTP di ClickHouse. Con la connessione cifrata (HTTPS) è di solito la **8443**: va scritta a mano. |
| **Database** (`database`) | testo | vuoto | Il database di partenza. Vuoto: quello di serie del server (`default`). |
| **Utente** (`user`) | testo | `default` | L'utente. |
| **Password** (`password`) | campo password | vuota | La password dell'utente (può essere vuota: l'utente `default` di solito non ne ha). Quello che scrivi non si vede e viene cifrato dal motore. |
| **Connessione cifrata (TLS)** (`tls`) | No (non cifrata), Cifrata (certificato non controllato), Cifrata e controllata | No (non cifrata) | Se e come cifrare la connessione: «No» usa HTTP, le altre due HTTPS. |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

Questo blocco non ha **Connessioni nel pool**: ogni istruzione è una richiesta HTTP a sé.

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione (chiede al server la versione) e manda **connessione**, poi **connesso**, poi **server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, le richieste in corso si fermano e la connessione si chiude.
- La connessione la fa il **kernel**. Il nome del server viene risolto e ogni indirizzo controllato; questo computer e la rete locale restano bloccati a meno che un amministratore non li permetta; il database di lilOS non si apre mai. Vedi [Blocchi database (SQL)](logicstudio-db).
- La **Password** è cifrata dal motore per te, su questo lilOS: su un altro lilOS o per un altro utente dà «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…)» e va scritta di nuovo. Può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**. Utente e password viaggiano nelle intestazioni della richiesta, mai nell'indirizzo.

### ClickHouse in particolare

- **Niente transazioni**: ClickHouse non annulla le modifiche. Il blocco [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) con una connessione ClickHouse dà l'errore «ClickHouse non annulla le modifiche: le transazioni non sono supportate».
- **Inserimenti molto grandi**: un [SQL · Inserisci (INSERT)](db.insert) con tante righe viene diviso in più istruzioni (al massimo 1000 parametri ciascuna, per esempio 250 righe di 4 colonne). Con gli altri database le istruzioni stanno in una transazione; ClickHouse non ne ha, quindi se un'istruzione a metà fallisce, le righe delle istruzioni prima **restano inserite**.
- **Parametri**: `:nome` diventa il parametro del server `{p1:Tipo}`, con il tipo scelto dal valore: intero (`Int64`), decimale (`Float64`), sì/no (`Bool`), testo (`String`), binario (come testo esadecimale, `unhex`). Un testo resta un `String`: per una data usa nell'SQL `toDateTime(:quando)` (o `parseDateTimeBestEffort(:quando)`).
- **Valori**: gli interi a 64 bit e più grandi escono come numeri quando sono esatti, come testo altrimenti; il resto come ClickHouse lo scrive in JSON (date e ore come testo).
- **Righe lette man mano**: la risposta arriva a righe e la lettura si ferma dopo le righe massime del modulo (più una, per dire **troncato**). Una risposta di oltre 64 MB si ferma con «Risposta di ClickHouse troppo grande».
- **FORMAT**: se la query finisce con `FORMAT …` (per esempio `FORMAT CSV`), il testo della risposta esce così com'è in un'unica riga `{ "result": "…" }`.
- **Righe modificate**: per le istruzioni che scrivono, **righe modificate** è il numero di righe scritte che il server dichiara (ClickHouse non lo dice per tutte). **Ultimo id** resta vuoto.
- **Aggiorna ed Elimina**: i blocchi [SQL · Aggiorna (UPDATE)](db.update) ed [SQL · Elimina (DELETE)](db.delete) scrivono `UPDATE … SET …` e `DELETE FROM …`, che funzionano solo con le versioni di ClickHouse che li accettano e solo su certe tabelle; in caso contrario scrivi tu l'istruzione (`ALTER TABLE … UPDATE …`) con [SQL · Query (query)](db.query).
- **Cursore**: [SQL · Scorri righe (cursor)](db.cursor) legge la risposta man mano, un gruppo alla volta.
- **Tabelle**: [SQL · Tabelle e colonne (schema)](db.tables) elenca le tabelle e le viste del database scelto.
- Le notifiche (LISTEN e NOTIFY) non ci sono.

## Esempi

### 1. I valori delle ultime ore

**SQL · Query**: `SELECT toStartOfHour(quando) AS ora, avg(valore) AS media FROM misure WHERE quando > now() - INTERVAL 24 HOUR GROUP BY ora ORDER BY ora`.

```
[SQL · ClickHouse (connect)] connessione ──▶ connessione [SQL · Query (query)] righe ──▶ righe [Tabella]
[Intervallo (setInterval): 300 s] impulso ──────────────────▶ esegui
```

### 2. Cercare con un parametro

```
[SQL · ClickHouse (connect)] connessione ──▶ connessione [SQL · Query (query): SELECT count() FROM eventi WHERE sensore = :sensore AND quando > toDateTime(:da)] valore ──▶ valore [Valore: eventi]
[Selezione: sensore] valore ──▶ sensore (ingresso aggiunto)
[Campo di testo: da] testo ──▶ da (ingresso aggiunto)
[Pulsante: Conta] premuto ──▶ esegui
```

L'uscita nascosta **valore** di Query SQL è il primo valore della prima riga: qui il numero di eventi. Con `da` = `2026-11-01 00:00:00` la query conta gli eventi del sensore scelto da quel momento.

## Errori

Gli errori comuni (server, indirizzo, quote, password non leggibile…) sono elencati nella pagina [Blocchi database (SQL)](logicstudio-db). In più:

| Messaggio | Quando |
|---|---|
| L'amministratore non permette i database ClickHouse (impostazioni del modulo logicstudio-db) | ClickHouse è disattivato nelle impostazioni del modulo. |
| ClickHouse non annulla le modifiche: le transazioni non sono supportate | Si è usato [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction) con una connessione ClickHouse. |
| ClickHouse non ha risposto in 30 s: la query è stata annullata | L'operazione ha superato il tempo massimo. |
| Risposta di ClickHouse troppo grande (oltre 64 MB): chiedi meno righe o colonne | La risposta supera i 64 MB. |
| La risposta di ClickHouse si è interrotta | Il server ha chiuso la connessione a metà risposta. |
| Connessione chiusa | Si è usata la connessione dopo averla chiusa. |
| Code: 516. DB::Exception: … Authentication failed | Utente o password sbagliati (messaggio del server, in inglese). |
| Code: 60. DB::Exception: Table … does not exist | La tabella non esiste (messaggio del server). |

## Vedi anche

- [SQL · Query (query)](db.query), [SQL · Leggi tabella (SELECT)](db.select), [SQL · Inserisci (INSERT)](db.insert), [SQL · Scorri righe (cursor)](db.cursor)
- [Blocchi database (SQL)](logicstudio-db), per i limiti, le quote e le impostazioni del modulo
- [Input (readline)](core.consoleRead), per chiedere la password a chi usa il programma
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
