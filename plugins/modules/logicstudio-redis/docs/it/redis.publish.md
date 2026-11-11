# Redis · Pubblica (PUBLISH)

`redis.publish` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Manda un **messaggio** su un canale a chi è iscritto in quel momento (con [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) o con un altro programma). I messaggi non sono conservati: chi non è iscritto non li riceve.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **canale** (`channel`) | testo | Il canale. Se ha un valore non vuoto, prende il posto del **Canale** delle impostazioni. Non avvia il blocco. |
| **messaggio** (`message`) | qualsiasi | Il messaggio da mandare. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **ricevuto da** (`receivers`) | numero | A quanti iscritti è arrivato il messaggio (0 se non ascolta nessuno). |
| **Exception** (`error`) | oggetto | Quando la pubblicazione non riesce: connessione mancante o chiusa, canale mancante, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Canale** (`channel`) | testo | vuoto | Il canale, quando l'ingresso **canale** non ha un valore. Al massimo 10000 caratteri. |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco fa `PUBLISH canale messaggio`.

- **I valori che scrivi**: senza l'opzione **JSON** un testo resta un testo, numeri e sì/no diventano testo (`5`, `true`), `null` il testo vuoto, un oggetto o una lista sono scritti come testo JSON. Con **JSON** spuntato, qualsiasi valore (anche un testo) è scritto con `JSON.stringify`.
- Il messaggio non è salvato da nessuna parte: se non c'è nessun iscritto, **ricevuto da** è 0 e il messaggio è perso. Per messaggi che devono aspettare usa una lista ([Redis · Lista: aggiungi (LPUSH · RPUSH)](redis.push)).
- Chi ascolta con [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) con **JSON** spuntato riceve il messaggio già convertito.

## Esempi

### 1. Avvisare gli altri programmi

**Canale** `allarmi`, **JSON** spuntato.

```
[Confronto (== ≠ < >): a > b] se vero ──▶ esegui [Redis · Pubblica (PUBLISH)] ricevuto da ──▶ valore [Valore: ascoltatori]
[Oggetto { }: tipo, valore] oggetto ──▶ messaggio
```

Quando la temperatura supera la soglia, il programma pubblica `{"tipo": "caldo", "valore": 31.5}` sul canale `allarmi`; chi è iscritto lo riceve subito.

### 2. Un canale per ogni stanza

```
[Template (formatta): "stanza:{a}"] testo ──▶ canale [Redis · Pubblica (PUBLISH)]
[Campo di testo: messaggio] testo ──▶ messaggio
```

L'ingresso **canale** cambia a ogni messaggio; il **Canale** delle impostazioni non serve.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca il canale | (Il messaggio è così nel blocco.) **Canale** è vuoto e l'ingresso **canale** non ha un valore. |
| Canale troppo lungo | Il canale supera 10000 caratteri. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe), per ricevere i messaggi
- [Redis · Lista: aggiungi (LPUSH · RPUSH)](redis.push), per i messaggi che devono aspettare
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
