# SQL · Scorri righe (cursor)

`db.cursor` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Esegue una query e manda le righe **una alla volta** (o a gruppi), invece di tutte insieme. Serve per le tabelle grandi, che non entrerebbero nel limite di un risultato, e per elaborare le righe man mano. Le righe partono da sole a ogni pausa, oppure a ogni impulso su **prossima** se colleghi quell'ingresso.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui apre la query (se ce n'era una aperta, la chiude) e manda le prime righe. |
| **prossima** (`next`) | impulso | Manda le righe successive. Se è collegato, le righe vanno avanti solo con i suoi impulsi. |
| **ferma** (`stop`) | impulso | Nascosta. Chiude la query prima della fine, senza mandare **finito**. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione (non quello di una transazione). Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **riga** (`row`) | qualsiasi | La riga (un oggetto `{ "colonna": valore }`); con **Righe alla volta** maggiore di 1, la lista delle righe. |
| **indice** (`index`) | numero | Il numero d'ordine della riga (la prima è 0); con i gruppi, della prima riga del gruppo. Esce prima di **riga**. |
| **finito** (`done`) | impulso | Un impulso quando le righe sono finite (dopo l'ultima). |
| **Exception** (`error`) | oggetto | Quando la query non si apre o una lettura non riesce: SQL non valido, parametro mancante, connessione chiusa, tempo scaduto… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **SQL** (`sql`) | testo su più righe | `SELECT * FROM tabella` | La query da scorrere. `:nome` è un parametro, come in [SQL · Query (query)](db.query). |
| **Righe alla volta (più di 1: una lista)** (`batch`) | da 1 a 1000 | 1 | Quante righe mandare per volta. 1: una riga (un oggetto). Più di 1: una lista. |
| **Pausa tra le righe da solo (ms)** (`pause`) | da 0 a 60000 | 0 | Quanti millisecondi aspettare tra un invio e il successivo, quando **prossima** non è collegato. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 32 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **parametro** della query, da **rinominare** con il nome usato nell'SQL, senza i due punti (come in [SQL · Query (query)](db.query)).

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non apre la query. La query si apre solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

1. Con **esegui** il blocco chiude l'eventuale query già aperta e ne apre una nuova con l'SQL delle impostazioni e i parametri. Il database prepara la lettura; le righe non sono ancora tutte nel programma.
2. Il blocco legge il primo gruppo di righe e manda **indice** e **riga**.
3. Poi:
   - se **prossima** **non** è collegato, il blocco continua da solo, aspettando la **Pausa** tra un gruppo e il successivo, fino alla fine;
   - se **prossima** è collegato, il blocco aspetta: a ogni impulso su **prossima** manda il gruppo successivo.
4. Quando le righe finiscono, manda **finito** e la query si chiude. Con **ferma** si chiude prima, senza **finito**; si chiude anche quando il programma si ferma o la connessione si chiude.

### Da sapere

- **Solo letture**: PostgreSQL apre il cursore in una transazione di sola lettura; è fatto per `SELECT`, non per scrivere.
- **Il tetto**: le righe di un cursore sono al massimo le **righe massime** del modulo (10000 di serie): oltre, il cursore si chiude con **finito**. Ogni passo conta come un'operazione nella quota al minuto, e la dimensione di ogni gruppo ha il limite di un risultato (4096 KB).
- **Una query alla volta per blocco**: un nuovo **esegui** chiude la query precedente. Per leggere due tabelle insieme usa due blocchi.
- **Connessione normale**, non transazione: un cursore dentro una transazione non c'è.
- **SQLite**: il cursore tiene occupato l'unico accesso al database finché non finisce; gli altri blocchi aspettano. Non lasciarlo a metà.
- **MySQL, MariaDB, SQL Server e ClickHouse**: le righe arrivano dal server man mano; un cursore fermato a metà chiude la connessione che usava.
- **Oracle**: le righe arrivano da un *result set* del server.
- Se il tempo di una lettura supera il tempo massimo di un'operazione (30 secondi), c'è l'errore.

## Esempi

### 1. Una riga al secondo

**SQL** `SELECT * FROM misure ORDER BY id`, **Pausa** 1000 ms.

```
[SQL · SQLite (open)] connessione ──▶ connessione [SQL · Scorri righe (cursor)] riga ──▶ valore [Print (console.log)]
[Pulsante: Riproduci] premuto ──▶ esegui                                 finito ──▶ invia [Notify: "Finito"]
```

Il programma «rilegge» le misure come in un filmato: una riga al secondo, con una [Notify](lilos.notify) alla fine.

### 2. Una riga ogni volta che lo chiedi

**prossima** collegato a un [Pulsante](ui.button).

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Scorri righe (cursor): SELECT * FROM clienti ORDER BY id] riga ──▶ oggetto [Destruttura oggetto]
[Pulsante: Inizia]  premuto ──▶ esegui
[Pulsante: Avanti]  premuto ──▶ prossima
```

**Inizia** apre la query e mostra il primo cliente; ogni **Avanti** mostra il successivo, fino a **finito**.

### 3. A gruppi di 100, con un parametro

**SQL** `SELECT id, valore FROM misure WHERE sensore = :sensore`, **Righe alla volta** 100, **Pausa** 0. Aggiungi un ingresso `sensore`.

```
[Selezione: sensore] valore ──▶ sensore [SQL · Scorri righe (cursor)] riga ──▶ righe [Tabella]
[SQL · ClickHouse (connect)] connessione ──▶ connessione
[Pulsante: Carica] premuto ──▶ esegui
```

La [Tabella](ui.table) riceve una lista di 100 righe alla volta (a ogni gruppo sostituisce la precedente); per accumulare usa un blocco di memoria.

## Errori

| Messaggio | Quando |
|---|---|
| Manca la query SQL | L'**SQL** è vuoto. |
| Manca il valore del parametro :nome (aggiungi un ingresso «nome» al blocco) | L'SQL ha `:nome` ma non c'è l'ingresso con un valore. |
| Scorri righe usa una connessione (non una transazione) | **connessione** ha il riferimento di una transazione, o di un cursore o ascolto. |
| Serve un cursore aperto | (interno) Si legge da un cursore già chiuso. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Un gruppo supera la dimensione massima: abbassa **Righe alla volta**. |
| Troppe operazioni sul database: al massimo 600 al minuto | Ogni passo conta: abbassa il ritmo o alza **Righe alla volta**. |
| Il database non ha risposto in 30 s | Una lettura ha superato il tempo massimo. |
| … (un messaggio del database) | L'SQL non è valido, la tabella non esiste… |

## Vedi anche

- [SQL · Query (query)](db.query), per risultati piccoli, tutti insieme
- [SQL · Leggi tabella (SELECT)](db.select), con **Salta righe** per leggere a pagine
- [Blocchi database (SQL)](logicstudio-db), per i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
