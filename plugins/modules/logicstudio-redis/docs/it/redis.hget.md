# Redis · Hash: leggi (HGET · HGETALL)

`redis.hget` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Legge un **campo** di un hash, oppure tutto l'hash come oggetto se il campo è vuoto. Un hash è una chiave con più campi: `utente:1` con `nome`, `eta`…

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |
| **campo** (`field`) | testo | Il campo da leggere. Se ha un valore non vuoto, prende il posto del **Campo** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Con un campo: il suo valore (testo, o convertito con **JSON**), `null` se manca. Senza campo: un oggetto `{ "campo": valore }` con tutti i campi (vuoto se l'hash non c'è). |
| **esiste** (`exists`) | sì/no | Nascosta. Con un campo: se il campo c'è. Senza campo: se l'hash ha almeno un campo. |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se l'hash ha più campi del limite del modulo (10000 di serie) e ne sono usciti solo una parte. |
| **Exception** (`error`) | oggetto | Quando la lettura non riesce: connessione mancante o chiusa, chiave mancante, la chiave non è un hash, valore che non è JSON, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **Campo (vuoto = tutti, HGETALL)** (`field`) | testo | vuoto | Il campo da leggere, quando l'ingresso **campo** non ha un valore. Vuoto: tutti i campi. |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |

## Come funziona

- **Con un campo**: `HGET chiave campo`. **valore** è il testo del campo (o il valore convertito, con **JSON**); se il campo manca, `null` e **esiste** `false`.
- **Senza campo**: `HGETALL chiave`. **valore** è un oggetto con tutti i campi; con **JSON** ogni campo è convertito (un campo che non è JSON dà errore). Un hash grosso, oltre il limite del modulo, viene letto a pezzi e **troncato** dice che manca una parte.
- Una chiave che non è un hash dà «La chiave contiene un altro tipo di valore».
- Il risultato non può superare la dimensione massima (4096 KB di serie).

## Esempi

### 1. Il profilo di un utente

**Chiave** `utente:1`, **Campo** vuoto.

```
[Redis · Hash: leggi (HGET · HGETALL)] valore ──▶ oggetto [Get proprietà (obj.campo): nome] valore ──▶ valore [Valore: nome]
[Pulsante: Carica] premuto ──▶ esegui
```

Se `utente:1` ha i campi `nome` e `eta`, **valore** è `{"nome": "Anna", "eta": "30"}`: i valori di un hash sono sempre testo, a meno che usi **JSON**.

### 2. Un solo campo

**Chiave** `utente:1`, **Campo** `eta`.

```
[Redis · Hash: leggi (HGET · HGETALL)] valore ──▶ valore [Valore: età]
```

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| Campo troppo lungo | Il campo supera 10000 caratteri. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | La chiave esiste ma è di un altro tipo (il server dice `WRONGTYPE`). |
| Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo | **JSON** è spuntato e il testo letto non è JSON. Dopo «Il valore» compare la chiave. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Hash: scrivi campi (HSET)](redis.hset), per scrivere i campi
- [Get proprietà (obj.campo)](core.get), per leggere un campo dell'oggetto
- [Redis · Leggi (GET)](redis.get), per le chiavi di testo
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
