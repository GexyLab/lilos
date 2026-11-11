# Redis · Elimina (DEL)

`redis.del` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Elimina una **chiave**, o ognuna delle chiavi di una lista, di qualsiasi tipo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave o lista** (`key`) | qualsiasi | Una chiave (testo) o una lista di chiavi. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **eliminate** (`deleted`) | numero | Quante chiavi sono state eliminate (quelle che non c'erano non contano). |
| **Exception** (`error`) | oggetto | Quando l'eliminazione non riesce: connessione mancante o chiusa, chiave mancante, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede a Redis `DEL chiave [chiave …]`.

- Con un **testo** elimina quella chiave; con una **lista** elimina tutte le chiavi della lista (da 1 a 10000).
- Elimina la chiave qualunque sia il suo tipo (testo, hash, lista…).
- Non accetta modelli come `utente:*`: per quelli cerca prima le chiavi con [Redis · Cerca chiavi (SCAN)](redis.scan) e manda la lista a questo blocco.
- Una chiave che non c'è non è un errore: semplicemente non conta in **eliminate**.

## Esempi

### 1. Cancellare una sessione

**Chiave** `sessione:abc123`.

```
[Pulsante: Esci] premuto ──▶ esegui [Redis · Elimina (DEL)] eliminate ──▶ valore [Valore]
```

### 2. Cancellare tutte le chiavi con un prefisso

```
[Redis · Cerca chiavi (SCAN): cache:*] chiavi ──▶ chiave o lista [Redis · Elimina (DEL)] eliminate ──▶ valore [Print (console.log)]
[Pulsante: Svuota la cache] premuto ──▶ esegui (di Cerca chiavi)
```

[Redis · Cerca chiavi (SCAN)](redis.scan) trova le chiavi che cominciano per `cache:`; la lista va a **chiave o lista**. Il blocco Elimina parte solo con **esegui**: collega anche il suo **esegui** a un impulso che arriva dopo la ricerca (per esempio con [Ritardo (setTimeout)](core.delay)). Una lista vuota dà l'errore «Servono da 1 a 10000 chiavi».

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| Servono da 1 a 10000 chiavi | La lista è vuota o ha più di 10000 chiavi. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Cerca chiavi (SCAN)](redis.scan), per trovare le chiavi da eliminare
- [Redis · Esiste (EXISTS)](redis.exists), [Redis · Scadenza (EXPIRE · TTL)](redis.expire), per far sparire una chiave da sola
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
