# Redis · Leggi (GET)

`redis.get` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Legge il valore di una **chiave** di testo. Se la chiave non c'è, il valore è vuoto (`null`) e **esiste** è falso.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore della chiave: un testo, oppure (con **JSON**) il valore già convertito. `null` se la chiave non c'è. |
| **esiste** (`exists`) | sì/no | Nascosta. `true` se la chiave c'è (anche con il testo vuoto), `false` se manca. |
| **Exception** (`error`) | oggetto | Quando la lettura non riesce: connessione mancante o chiusa, chiave mancante, la chiave è di un altro tipo, valore che non è JSON, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede a Redis `GET chiave`.

- **I valori che leggi**: senza **JSON** esce sempre il testo. Con **JSON** il testo è letto con `JSON.parse`: numeri, sì/no, oggetti e liste tornano tali; se il testo non è JSON c'è un errore («Il valore … non è JSON»).
- **Chiave mancante** non è un errore: **valore** è `null` (anche con **JSON**) e **esiste** `false`. Per distinguere «manca» da «è vuota» usa **esiste**, oppure [Redis · Esiste (EXISTS)](redis.exists).
- Il blocco legge solo chiavi di **testo** (string). Una chiave che è un hash, una lista… dà «La chiave contiene un altro tipo di valore»: per quelli ci sono [Redis · Hash: leggi (HGET · HGETALL)](redis.hget) e [Redis · Lista: intervallo (LRANGE)](redis.range).
- Il testo che esce non può superare la dimensione massima di un risultato (4096 KB di serie).

## Esempi

### 1. Mostrare un contatore

**Chiave** `visite`.

```
[Intervallo (setInterval): 5 s] impulso ──▶ esegui [Redis · Leggi (GET)] valore ──▶ valore [Valore: visite]
```

Ogni 5 secondi il [Valore](ui.value) mostra il testo di `visite` (per esempio `1204`). Se vuoi un numero, usa [Cast (converti tipo)](core.convert) o l'opzione **JSON**: un `1204` scritto con **JSON** torna come numero.

### 2. Una configurazione in JSON

**Chiave** `config:serra`, **JSON** spuntato. Redis contiene il testo `{"soglia": 24.5, "attivo": true}`.

```
[Redis · Leggi (GET)] valore ──▶ oggetto [Get proprietà (obj.campo): soglia] valore ──▶ b [Confronto (== ≠ < >): a > b]
```

Con **JSON** l'uscita è già un oggetto: [Get proprietà (obj.campo)](core.get) legge `soglia`.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | La chiave esiste ma è di un altro tipo (il server dice `WRONGTYPE`). |
| Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo | **JSON** è spuntato e il testo letto non è JSON. Dopo «Il valore» compare la chiave. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Scrivi (SET)](redis.set), per scrivere il valore
- [Redis · Esiste (EXISTS)](redis.exists), [Redis · Scadenza (EXPIRE · TTL)](redis.expire)
- [Get proprietà (obj.campo)](core.get), per leggere un campo di un valore JSON
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
