# InfluxDB · Query (Flux · InfluxQL · SQL)

`influx.query` · Database · [Blocchi InfluxDB](logicstudio-influxdb) · versione 1

Esegue una query in **Flux** (InfluxDB 2.x e 1.8+), **InfluxQL** (1.x, 2.x, 3.x) o **SQL** (3.x) e manda le righe del risultato. Ogni ingresso aggiunto è un **parametro** della query: `params.nome` in Flux, `$nome` in InfluxQL e SQL. Il valore passa al server a parte, non viene incollato nel testo della query.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la query. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [InfluxDB · Connessione (connect)](influx.connect). Non avvia il blocco. |
| **query** (`query`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Query** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe** (`rows`) | lista | Le righe del risultato, ognuna un oggetto `{ "colonna": valore }`, con i valori nel loro tipo (numeri, testi, sì/no; i tempi sono testi ISO). |
| **quante** (`count`) | numero | Nascosta. Quante righe sono uscite. |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se c'erano più righe di quelle massime e le altre non sono uscite. |
| **Exception** (`error`) | oggetto | Quando la query non riesce: connessione mancante, errore nella query, linguaggio non adatto al server, risultato troppo grande, quota finita… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Linguaggio** (`language`) | Flux (2.x), InfluxQL, SQL (3.x) | Flux (2.x) | Il linguaggio della query. |
| **Query** (`query`) | testo su più righe | `from(bucket: "my-bucket")` e, a capo, `  \|> range(start: -1h)` | La query da eseguire, quando l'ingresso **query** non ha un valore. Al massimo 100000 caratteri. |
| **Database per InfluxQL e SQL (vuoto: il bucket della connessione)** (`bucket`) | testo | vuoto | Il database da interrogare con InfluxQL e SQL. Con Flux il bucket si scrive nella query. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **parametro**: si chiama **parametro 1**, **parametro 2**… e va **rinominato** con il nome del parametro, per esempio `citta`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire la query. La query parte solo con **esegui**. Un ingresso senza valore (o `null`) non conta. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**, il blocco manda la query al server nel linguaggio scelto e, quando arriva la risposta, manda **righe**, poi **quante** e **troncato**.

### Flux

- Il blocco manda la query a `/api/v2/query` e legge il risultato (CSV annotato) di **tutte le tabelle**, una dopo l'altra, in un'unica lista di righe.
- I valori hanno il loro tipo: `long` e `double` sono numeri (un intero troppo grande per un numero resta testo, come `+Inf`), `boolean` è sì/no, il resto è testo; i tempi sono testi ISO (`2026-11-11T10:00:00Z`). Un valore vuoto è `null`.
- I **parametri**: davanti alla query (dopo `import` e commenti) il blocco mette `params = { nome: valore, … }`, e tu nella query scrivi `params.nome`. I nomi dei parametri devono essere nomi Flux validi: lettere, cifre e `_`, senza cominciare con una cifra. Un testo viene scritto in modo sicuro, una lista diventa una lista Flux, un oggetto un record.
- Se la query dà un errore, il messaggio del server arriva su **Exception** come «Errore della query Flux: …».
- InfluxDB 3 non ha Flux: dà «InfluxDB 3 non usa Flux: scegli SQL o InfluxQL».

### InfluxQL

- La query va a `/query` (l'API v1) sul **database** scelto: quello dell'impostazione o, se vuota, il bucket della connessione. Con 2.x il bucket fa da database.
- Ogni riga ha `_measurement` (la misura), i tag del gruppo e le colonne (`time`, `mean`, …).
- I parametri si scrivono `$nome` nella query, e il valore passa a parte.
- Gli errori sono «Errore della query InfluxQL: …».

### SQL (InfluxDB 3)

- La query va a `/api/v3/query_sql` sul database scelto. I parametri si scrivono `$nome`.
- Con un server che non è InfluxDB 3 dà «Questo server non risponde a SQL: serve InfluxDB 3 (con InfluxDB 2 usa Flux o InfluxQL)».

### Quante righe

Escono al massimo tante righe quante sono le righe massime del modulo (10000 di serie): se ce n'erano di più, **troncato** è `true`. Un risultato più grande della dimensione massima (4096 KB di serie) è un errore: chiedi meno righe o colonne (`limit`, `aggregateWindow`, `LIMIT`…).

## Esempi

### 1. La temperatura media di ogni ora

Linguaggio Flux, **Query**:

```
from(bucket: "casa")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "ambiente" and r._field == "value")
  |> aggregateWindow(every: 1h, fn: mean)
```

```
[InfluxDB · Connessione (connect)] connessione ──▶ connessione [InfluxDB · Query (Flux · InfluxQL · SQL)] righe ──▶ righe [Tabella]
[Pulsante: Aggiorna] premuto ──▶ esegui                                                      Exception ──▶ valore [Print (console.log)]
```

Le righe, con `_time` e `_value`, vanno nella [Tabella](ui.table).

### 2. Un parametro: la stanza scelta dall'utente

Linguaggio Flux. Un ingresso aggiunto, rinominato `stanza`. **Query**:

```
from(bucket: "casa")
  |> range(start: -1h)
  |> filter(fn: (r) => r.stanza == params.stanza)
  |> last()
```

```
[Selezione: stanza] valore ──▶ stanza [InfluxDB · Query (Flux · InfluxQL · SQL)] righe ──▶ oggetto [Get proprietà (obj.campo): 0._value] valore ──▶ valore [Valore]
[Pulsante: Leggi]  premuto ──▶ esegui
```

Se scegli `cucina` nella [Selezione](ui.select), il blocco scrive davanti alla query `params = {stanza: "cucina"}`. Anche un nome come `x") |> drop() //` resta un testo semplice. [Get proprietà (obj.campo)](core.get) prende `_value` della prima riga.

### 3. SQL su InfluxDB 3

Linguaggio SQL, **Database** `casa`, un ingresso aggiunto `soglia`. **Query**: `SELECT time, temp FROM ambiente WHERE temp > $soglia ORDER BY time DESC LIMIT 20`.

```
[Campo numerico: soglia] valore ──▶ soglia [InfluxDB · Query (Flux · InfluxQL · SQL)] righe ──▶ righe [Tabella]
[Pulsante: Cerca] premuto ──▶ esegui
```

## Errori

| Messaggio | Quando |
|---|---|
| Manca la query | La query è vuota. |
| Query troppo lunga (al massimo 100000 caratteri) | La query supera 100000 caratteri. |
| Manca il bucket (nelle impostazioni del blocco o della connessione) | InfluxQL o SQL senza database. |
| Il bucket non valido: … | Il nome del database è più lungo di 255 caratteri o ha caratteri di controllo. |
| Nome di parametro non valido per Flux: … | Il nome di un ingresso aggiunto non è un nome Flux valido. |
| Parametro troppo annidato | Un parametro ha troppi livelli di liste e oggetti. |
| Parametro non valido: Infinity | Un parametro numerico è infinito. |
| Errore della query Flux: … | Flux ha trovato un errore nella query (c'è il messaggio del server). |
| Errore della query InfluxQL: … | InfluxQL ha trovato un errore nella query. |
| InfluxDB 3 non usa Flux: scegli SQL o InfluxQL | Flux su un server 3.x. |
| Questo server non risponde a SQL: serve InfluxDB 3 (con InfluxDB 2 usa Flux o InfluxQL) | SQL su un server che non è 3.x. |
| Risposta SQL non valida | Il server ha risposto a SQL con qualcosa che non è una lista. |
| Risposta CSV non valida: virgolette non chiuse | La risposta di Flux è incompleta. |
| InfluxDB ha risposto 400 (richiesta non valida): … | Il server rifiuta la query (anche 401, 403, 404…). |

Gli errori comuni (connessione, rete, quote, risultato troppo grande) sono nella pagina [Blocchi InfluxDB](logicstudio-influxdb).

## Vedi anche

- [InfluxDB · Connessione (connect)](influx.connect), [InfluxDB · Scrivi punto (write)](influx.write), [InfluxDB · Bucket (elenco)](influx.buckets)
- [Intervallo (setInterval)](core.every), per leggere a intervalli
- [Get proprietà (obj.campo)](core.get), per leggere un campo di una riga
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
