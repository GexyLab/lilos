# Redis · Lista: intervallo (LRANGE)

`redis.range` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Legge i valori di una lista da **inizio** a **fine** (0 è il primo, -1 l'ultimo) **senza toglierli**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |
| **inizio** (`start`) | numero | Nascosta. Se ha un valore non vuoto, prende il posto di **Inizio**. Non avvia il blocco. |
| **fine** (`stop`) | numero | Nascosta. Se ha un valore non vuoto, prende il posto di **Fine**. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valori** (`values`) | lista | I valori letti, in lista (testi, o convertiti con **JSON**). Vuota se la lista non c'è o l'intervallo è fuori. |
| **lunghezza della lista** (`length`) | numero | Nascosta. Quanti elementi ha in tutto la lista. |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se l'intervallo chiesto aveva più valori del limite del modulo (10000 di serie) e ne sono usciti solo una parte. |
| **Exception** (`error`) | oggetto | Quando la lettura non riesce: connessione mancante o chiusa, chiave mancante, la chiave non è una lista, valore che non è JSON, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **Inizio** (`start`) | numero intero | 0 | Il primo elemento: 0 è il primo, -1 l'ultimo, -2 il penultimo… |
| **Fine (-1 = l'ultimo)** (`stop`) | numero intero | -1 | L'ultimo elemento da leggere, compreso. -1: fino all'ultimo. |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede la lunghezza (`LLEN`) e poi gli elementi dell'intervallo (`LRANGE chiave inizio fine`).

- Gli estremi sono *compresi*: da 0 a 9 sono 10 elementi. I numeri negativi contano dalla fine: `-5` è il quinto dall'ultimo; `-5` come **Inizio** e `-1` come **Fine** danno gli ultimi 5.
- Una lista che non c'è dà una lista vuota e lunghezza 0, senza errore.
- Il blocco legge al massimo i valori del limite del modulo (10000 di serie): se l'intervallo è più grande, **troncato** è `true`.
- La lista resta com'è: per prenderne i valori usa [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop).
- **I valori che leggi**: senza **JSON** esce sempre il testo. Con **JSON** il testo è letto con `JSON.parse`: numeri, sì/no, oggetti e liste tornano tali; se il testo non è JSON c'è un errore («Il valore … non è JSON»).

## Esempi

### 1. Gli ultimi 10 messaggi

**Chiave** `chat`, **Inizio** -10, **Fine** -1, **JSON** spuntato.

```
[Redis · Lista: intervallo (LRANGE)] valori ──▶ righe [Tabella]
[Pulsante: Aggiorna] premuto ──▶ esegui
```

Una chat in cui ogni messaggio è aggiunto con [Redis · Lista: aggiungi (LPUSH · RPUSH)](redis.push) alla fine: la [Tabella](ui.table) mostra gli ultimi 10 messaggi, come oggetti.

### 2. Quanti elementi ha la lista

```
[Redis · Lista: intervallo (LRANGE): Inizio 0, Fine 0] lunghezza della lista ──▶ valore [Valore]
```

Con un intervallo di un solo elemento, la lunghezza della lista esce comunque dall'uscita nascosta.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| Inizio non valido: … / Fine non valida: … | **Inizio** o **Fine** non è un numero intero. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | La chiave esiste ma è di un altro tipo (il server dice `WRONGTYPE`). |
| Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo | **JSON** è spuntato e il testo letto non è JSON. Dopo «Il valore» compare la chiave. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Lista: aggiungi (LPUSH · RPUSH)](redis.push), [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop)
- [Tabella](ui.table), per mostrare i valori
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
