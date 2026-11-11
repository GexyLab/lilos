# Redis · Scrivi (SET)

`redis.set` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Scrive il valore di una **chiave**, con una scadenza se vuoi e, se vuoi, solo se la chiave non c'è (NX) o solo se c'è già (XX).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |
| **valore** (`value`) | qualsiasi | Il valore da scrivere. Non avvia il blocco. |
| **scade tra (s)** (`seconds`) | numero | Nascosta. Se ha un valore non vuoto, prende il posto di **Scade tra secondi**. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **scritto** (`ok`) | sì/no | `true` se il valore è stato scritto; `false` se **Quando** lo ha impedito (NX con una chiave che c'è, XX con una chiave che manca). |
| **Exception** (`error`) | oggetto | Quando la scrittura non riesce: connessione mancante o chiusa, chiave mancante, scadenza non valida, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **Scade tra secondi (EX, 0 = mai)** (`seconds`) | numero intero da 0 | 0 | Dopo quanti secondi la chiave sparisce da sola. 0: mai. Al massimo 100 anni. |
| **Quando** (`mode`) | Sempre, Solo se la chiave non esiste (NX), Solo se la chiave esiste (XX) | Sempre | Con NX il blocco non sovrascrive; con XX non crea. |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco scrive la chiave con `SET chiave valore [EX secondi] [NX | XX]`.

- **I valori che scrivi**: senza l'opzione **JSON** un testo resta un testo, numeri e sì/no diventano testo (`5`, `true`), `null` il testo vuoto, un oggetto o una lista sono scritti come testo JSON. Con **JSON** spuntato, qualsiasi valore (anche un testo) è scritto con `JSON.stringify`.
- Un valore binario `{ "$bytes": "base64" }` degli altri blocchi è scritto come dati binari.
- **Scadenza**: con un numero di secondi maggiore di 0 la chiave sparisce da sola. Scrivere di nuovo la chiave **toglie** la scadenza che aveva, se non la rimetti.
- **Quando**: «Solo se la chiave non esiste» (NX) è il modo di prendere un «lucchetto» o di scrivere un valore una volta sola: **scritto** dice se ce l'hai fatta.
- Il valore `null` o un ingresso senza valore scrivono il testo vuoto.

## Esempi

### 1. Salvare l'ultima misura per 10 minuti

**Chiave** `serra:temperatura`, **Scade tra secondi** 600.

```
[Campo numerico: temperatura] valore ──▶ valore [Redis · Scrivi (SET)] scritto ──▶ valore [Print (console.log)]
[Intervallo (setInterval): 60 s] impulso ──────────▶ esegui
```

Ogni minuto il programma scrive il numero come testo (`22.5`). Se il programma smette di scrivere, dopo 10 minuti la chiave sparisce e un altro programma, leggendola, trova `null`.

### 2. Un lucchetto per non fare un lavoro due volte

**Chiave** `lavoro:fatture`, **Scade tra secondi** 300, **Quando** «Solo se la chiave non esiste (NX)».

```
[Pulsante: Avvia] premuto ──▶ esegui [Redis · Scrivi (SET)] scritto ──▶ condizione [If · Else] allora ──▶ ... (fai il lavoro)
```

Se un altro programma ha già scritto il lucchetto, **scritto** è `false` e il lavoro non parte; dopo 5 minuti il lucchetto sparisce da solo.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| Scadenza non valida: … | **Scade tra secondi** non è un numero intero tra 0 e 100 anni. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Leggi (GET)](redis.get), per rileggere il valore
- [Redis · Scadenza (EXPIRE · TTL)](redis.expire), per cambiare la scadenza di una chiave che c'è già
- [Redis · Incrementa (INCRBY)](redis.incr), per i contatori
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
