# Redis · Scadenza (EXPIRE · TTL)

`redis.expire` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Legge, imposta o toglie la **scadenza** di una chiave. **Secondi rimasti** vale -1 se la chiave non ha scadenza e -2 se la chiave non esiste.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |
| **secondi** (`seconds`) | numero | Se ha un valore non vuoto, prende il posto dei **Secondi** delle impostazioni (per «Impostala»). Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **secondi rimasti** (`ttl`) | numero | Quanti secondi mancano alla scadenza, dopo l'operazione. -1: senza scadenza. -2: la chiave non c'è. |
| **fatto** (`ok`) | sì/no | Nascosta. Con «Impostala» e «Toglila»: `true` se il server ha eseguito (`false` se la chiave non c'è, o non aveva una scadenza da togliere). Con «Leggila» è sempre `true`. |
| **Exception** (`error`) | oggetto | Quando l'operazione non riesce: connessione mancante o chiusa, chiave mancante, secondi non validi, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **Operazione** (`op`) | Leggila (TTL), Impostala (EXPIRE), Toglila (PERSIST) | Leggila (TTL) | Cosa fare con la scadenza. |
| **Secondi (per EXPIRE)** (`seconds`) | numero intero da 1 | 60 | Tra quanti secondi la chiave sparisce, per «Impostala». Al massimo 100 anni. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco fa l'operazione scelta e poi legge `TTL chiave`, che manda su **secondi rimasti**.

- **Leggila (TTL)**: solo la lettura.
- **Impostala (EXPIRE)**: la chiave sparirà tra i **Secondi**; **fatto** è `false` se la chiave non c'è.
- **Toglila (PERSIST)**: la chiave non scade più; **fatto** è `false` se non aveva una scadenza (o non c'è).
- Funziona con chiavi di qualsiasi tipo (anche hash e liste).
- Una scadenza a secondi interi: i millisecondi non si leggono.

## Esempi

### 1. Una sessione che dura 30 minuti dall'ultima attività

**Chiave** `sessione:abc123`, **Operazione** «Impostala (EXPIRE)», **Secondi** 1800.

```
[Pulsante: Sono attivo] premuto ──▶ esegui [Redis · Scadenza (EXPIRE · TTL)] secondi rimasti ──▶ valore [Valore]
```

Ogni attività rimette la scadenza a 30 minuti.

### 2. Quanto manca

**Chiave** `lavoro:fatture`, **Operazione** «Leggila (TTL)».

```
[Intervallo (setInterval): 5 s] impulso ──▶ esegui [Redis · Scadenza (EXPIRE · TTL)] secondi rimasti ──▶ valore [Valore: secondi alla scadenza]
```

Il valore scende di 5 in 5 secondi; `-2` quando la chiave è sparita.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| Scadenza non valida: … | **Secondi** non è un numero intero tra 1 e 100 anni. |
| Mancano i secondi della scadenza | «Impostala» senza secondi. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Scrivi (SET)](redis.set), che può dare la scadenza mentre scrive
- [Redis · Esiste (EXISTS)](redis.exists), [Redis · Elimina (DEL)](redis.del)
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
