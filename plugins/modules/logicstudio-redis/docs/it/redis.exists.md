# Redis · Esiste (EXISTS)

`redis.exists` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Dice se una **chiave** esiste. Con una lista di chiavi dice se esistono tutte, e quante.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave o lista** (`key`) | qualsiasi | Una chiave (testo) o una lista di chiavi. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **esiste** (`exists`) | sì/no | `true` se la chiave esiste (con una lista: se esistono tutte). |
| **quante** (`count`) | numero | Nascosta. Quante delle chiavi esistono. Una chiave ripetuta nella lista conta ogni volta. |
| **Exception** (`error`) | oggetto | Quando il controllo non riesce: connessione mancante o chiusa, chiave mancante, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede a Redis `EXISTS chiave [chiave …]`.

- Funziona con chiavi di qualsiasi tipo.
- Con una **lista**: **esiste** è vero solo se *tutte* le chiavi ci sono; **quante** dice quante ce ne sono (da 1 a 10000 chiavi).
- Una chiave con la scadenza passata non esiste più.

## Esempi

### 1. Mostrare se un utente è collegato

**Chiave** `online:anna`.

```
[Intervallo (setInterval): 10 s] impulso ──▶ esegui [Redis · Esiste (EXISTS)] esiste ──▶ valore [Spia]
```

Un altro programma scrive `online:anna` con una scadenza di 30 secondi ogni 10 secondi: la spia è accesa finché Anna è collegata.

### 2. Controllare più chiavi insieme

```
[Lista [ ]: "cfg:a", "cfg:b", "cfg:c"] lista ──▶ chiave o lista [Redis · Esiste (EXISTS)] quante ──▶ valore [Valore]
```

**quante** dice per esempio `2` se ne manca una; **esiste** sarebbe `false`.

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

- [Redis · Leggi (GET)](redis.get), [Redis · Elimina (DEL)](redis.del)
- [Redis · Scadenza (EXPIRE · TTL)](redis.expire), per i secondi che mancano
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
