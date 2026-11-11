# Redis · Lista: aggiungi (LPUSH · RPUSH)

`redis.push` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Aggiunge un valore all'**inizio** o alla **fine** di una lista Redis, e manda la nuova lunghezza. È la coda di lavoro più semplice: un programma aggiunge, un altro toglie con [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |
| **valore** (`value`) | qualsiasi | Il valore da aggiungere. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **lunghezza** (`length`) | numero | Quanti elementi ha la lista dopo l'aggiunta. |
| **Exception** (`error`) | oggetto | Quando l'aggiunta non riesce: connessione mancante o chiusa, chiave mancante, la chiave non è una lista, troppi valori, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **Lato** (`side`) | Inizio (sinistra: L…), Fine (destra: R…) | Fine (destra: R…) | Dove aggiungere: `LPUSH` all'inizio, `RPUSH` alla fine. |
| **Una lista aggiunge ognuno dei suoi elementi** (`each`) | sì / no | no | Se è spuntato e **valore** è una lista, ogni elemento diventa un elemento della lista Redis. Se no, la lista è un solo elemento (scritto come testo JSON). |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco aggiunge con `RPUSH chiave valore` (o `LPUSH`, con **Lato** «Inizio»). Se la chiave non c'è, nasce la lista.

- **Coda**: aggiungi alla **fine** (destra) e togli dall'**inizio** (sinistra) con [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop): il primo che arriva è il primo che esce. Aggiungi all'**inizio** e togli dall'inizio per avere una **pila** (l'ultimo che arriva esce per primo).
- Con **Una lista aggiunge ognuno dei suoi elementi** puoi aggiungere più valori in una volta (al massimo 10000); con `LPUSH` gli elementi finiscono nella lista in ordine inverso, come in Redis.
- Una lista vuota con quell'opzione dà un errore.
- **I valori che scrivi**: senza l'opzione **JSON** un testo resta un testo, numeri e sì/no diventano testo (`5`, `true`), `null` il testo vuoto, un oggetto o una lista sono scritti come testo JSON. Con **JSON** spuntato, qualsiasi valore (anche un testo) è scritto con `JSON.stringify`.

## Esempi

### 1. Mettere un lavoro in coda

**Chiave** `coda:email`, **Lato** «Fine», **JSON** spuntato.

```
[Oggetto { }: a, oggetto] oggetto ──▶ valore [Redis · Lista: aggiungi (LPUSH · RPUSH)] lunghezza ──▶ valore [Valore: in coda]
[Pulsante: Invia] premuto ──▶ esegui
```

Ogni pressione aggiunge `{"a": "anna@esempio.it", "oggetto": "Ciao"}` alla coda; **lunghezza** dice quanti lavori aspettano.

### 2. Aggiungere una lista intera

**Chiave** `eventi`, **Una lista aggiunge ognuno dei suoi elementi** spuntato.

```
[Lista [ ]: "a", "b", "c"] lista ──▶ valore [Redis · Lista: aggiungi (LPUSH · RPUSH)]
```

La lista Redis riceve tre elementi: `a`, `b`, `c`.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| La lista dei valori è vuota | **Una lista aggiunge ognuno dei suoi elementi** è spuntato e la lista è vuota. |
| Troppi valori in una volta (al massimo 10000) | La lista ha più elementi del limite del modulo. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | La chiave esiste ma è di un altro tipo (il server dice `WRONGTYPE`). |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop), per prendere i valori dalla coda
- [Redis · Lista: intervallo (LRANGE)](redis.range), per guardare la lista senza toglierla
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
