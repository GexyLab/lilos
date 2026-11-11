# Redis · Comando (call)

`redis.command` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Esegue **qualsiasi comando Redis** scritto come lista, per esempio `["ZADD", "classifica", 10, "anna"]`. Per i comandi che non hanno un blocco: insiemi, insiemi ordinati, stream, HyperLogLog… I comandi di amministrazione sono rifiutati.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **comando** (`command`) | lista | Il comando: una lista `["NOME", argomento, …]` (anche un testo con la lista JSON, o con le parole). Se ha un valore non vuoto, prende il posto del **Comando** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | La risposta del server, come valore di Logic Studio: un testo, un numero, `null`, una lista (anche di liste), `OK` come testo… |
| **Exception** (`error`) | oggetto | Quando il comando non va: connessione mancante o chiusa, comando non permesso o non valido, il blocco è disattivato, errore del server, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Comando (lista JSON, o parole: ZADD classifica 10 anna)** (`command`) | testo | vuoto | Il comando, quando l'ingresso **comando** non ha un valore: una lista JSON (`["ZADD", "classifica", 10, "anna"]`) o le parole separate da spazi (`ZADD classifica 10 anna`; per un argomento con spazi, tra virgolette `"…"` o `'…'`). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco manda il comando al server così com'è e dà la risposta su **risultato**.

### Come si scrive il comando

- **Una lista**: il primo elemento è il nome del comando (maiuscole o minuscole), gli altri sono gli argomenti. Numeri e sì/no diventano testo (`10` → `"10"`), `null` il testo vuoto, un oggetto o una lista (dentro la lista) il testo JSON. Fino a 10000 argomenti.
- **Un testo**: se comincia per `[` è una lista JSON; altrimenti sono parole separate da spazi (`SADD tag a b c`). Le virgolette `"…"` (con `\` per i caratteri speciali) o `'…'` tengono insieme un argomento con spazi.
- **Il nome** del comando: lettere, cifre e `_ . | -`, fino a 41 caratteri, e comincia con una lettera (per i sotto-comandi, per esempio `["MEMORY", "USAGE", "k"]`).

### La risposta

La risposta del server diventa un valore: testi e numeri tali, `null` per «niente», liste (anche annidate), `OK` come testo. Una risposta più grande della dimensione massima di un risultato (4096 KB di serie) dà errore.

### I comandi rifiutati

Il blocco non esegue questi comandi, perché danneggerebbero il server o gli altri programmi che usano la stessa connessione. L'errore dice quale comando e perché: «Comando non permesso: … è un comando di amministrazione del server» (o la ragione sotto).

| Comandi | Perché |
|---|---|
| `FLUSHALL`, `FLUSHDB`, `CONFIG`, `SHUTDOWN`, `DEBUG`, `MONITOR`, `SLAVEOF`, `REPLICAOF`, `MODULE`, `ACL`, `SAVE`, `BGSAVE`, `BGREWRITEAOF`, `FAILOVER`, `SWAPDB`, `SYNC`, `PSYNC`, `REPLCONF`, `CLUSTER`, `SENTINEL`, `PFDEBUG`, `PFSELFTEST`, e i sotto-comandi `MEMORY PURGE`, `LATENCY RESET`/`HISTORY`/`LATEST`/`GRAPH`/`DOCTOR`, `SLOWLOG RESET`/`GET`, `OBJECT FREQ` | Amministrazione del server. |
| `MIGRATE` | Si collega a un altro server. |
| `EVAL`, `EVALSHA`, `EVAL_RO`, `EVALSHA_RO`, `FCALL`, `FCALL_RO`, `SCRIPT`, `FUNCTION`, `RG.PYEXECUTE`, `RG.PYSTATS`, `TFUNCTION`, `TFCALL`, `TFCALLASYNC` | Eseguono codice sul server, che potrebbe usare i comandi non permessi. |
| `KEYS` | Blocca il server su un database grande: usa [Redis · Cerca chiavi (SCAN)](redis.scan). |
| `SUBSCRIBE`, `PSUBSCRIBE`, `SSUBSCRIBE`, `UNSUBSCRIBE`, `PUNSUBSCRIBE`, `SUNSUBSCRIBE` | C'è il blocco [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe). |
| `SELECT`, `AUTH`, `HELLO`, `RESET`, `QUIT`, `CLIENT`, `MULTI`, `EXEC`, `DISCARD`, `WATCH`, `UNWATCH`, `READONLY`, `READWRITE` | Cambiano lo stato della connessione, che è condivisa con gli altri blocchi. |
| `BLPOP`, `BRPOP`, `BRPOPLPUSH`, `BLMOVE`, `BLMPOP`, `BZPOPMIN`, `BZPOPMAX`, `BZMPOP`, `WAIT`, `WAITAOF`, e `XREAD`/`XREADGROUP` con `BLOCK` | Bloccano la connessione: per le attese c'è [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop). |

### L'amministratore e l'utente Redis

- L'amministratore può **disattivare** questo blocco nelle impostazioni del modulo («Permetti il blocco «Comando»»): allora ogni comando dà «L'amministratore ha disattivato il blocco Comando (impostazioni del modulo)».
- Quello che puoi fare davvero dipende anche dall'**utente Redis (ACL)** della connessione: un utente con pochi permessi riceve «Permesso negato dal database».
- Il comando conta nelle operazioni al minuto come ogni altro blocco.

## Esempi

### 1. Una classifica

**Comando** `ZADD classifica 10 anna`; poi `ZREVRANGE classifica 0 2 WITHSCORES`.

```
[Pulsante: Aggiungi] premuto ──▶ esegui [Redis · Comando (call): ZADD classifica 10 anna] risultato ──▶ valore [Print (console.log)]
[Pulsante: Primi 3]  premuto ──▶ esegui [Redis · Comando (call): ZREVRANGE classifica 0 2 WITHSCORES] risultato ──▶ valore [Print (console.log)]
```

`ZADD` risponde `1` (un elemento nuovo); `ZREVRANGE` risponde `["anna", "10", …]`: nomi e punteggi, in lista.

### 2. Un comando composto dal programma

```
[Campo di testo: nome] testo ──▶ a [Lista [ ]: "SADD", "ospiti", a] lista ──▶ comando [Redis · Comando (call)]
```

[Lista [ ]](core.list) compone `["SADD", "ospiti", "Anna"]`. Ogni argomento è passato a parte: un nome con spazi o virgolette non cambia il comando.

### 3. Un comando rifiutato

**Comando** `FLUSHALL`.

**Exception** scrive «Comando non permesso: FLUSHALL è un comando di amministrazione del server».

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| L'amministratore ha disattivato il blocco Comando (impostazioni del modulo) | Il blocco è disattivato nelle impostazioni del modulo logicstudio-redis. |
| Comando non permesso: NOME … | Il comando è tra quelli rifiutati; dopo il nome c'è il motivo (per esempio «è un comando di amministrazione del server»). |
| Comando non permesso: NOME SOTTOCOMANDO è un comando di amministrazione del server | Per `MEMORY PURGE`, `LATENCY RESET`/`HISTORY`/`LATEST`/`GRAPH`/`DOCTOR`, `SLOWLOG RESET`/`GET`, `OBJECT FREQ`. |
| Comando non permesso: XREAD con BLOCK blocca la connessione (usa il blocco Lista: Togli, con l'attesa) | `XREAD` o `XREADGROUP` con l'argomento `BLOCK` (con `XREADGROUP` il nome è quello del comando). |
| Comando non valido: … | Il nome del comando non è fatto di lettere, cifre e `_ . | -`, o non comincia con una lettera. |
| Comando non valido: scrivi una lista JSON, per esempio ["ZADD", "classifica", 10, "anna"] | Il testo comincia per `[` ma non è JSON. |
| Manca il comando: per esempio ["ZADD", "classifica", 10, "anna"] | Il comando è vuoto o la lista non ha elementi. |
| Troppi argomenti (al massimo 10000) | Il comando ha più di 10000 elementi. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / WRONGTYPE … / altri messaggi del server | Il server rifiuta il comando (argomenti sbagliati, chiave di un altro tipo…): il messaggio è del server, in inglese. Il `WRONGTYPE` è tradotto: «La chiave contiene un altro tipo di valore…». |

## Vedi anche

- [Redis · Leggi (GET)](redis.get), [Redis · Scrivi (SET)](redis.set), [Redis · Hash: leggi (HGET · HGETALL)](redis.hget), per i casi più comuni, senza scrivere il comando
- [Redis · Cerca chiavi (SCAN)](redis.scan), al posto di `KEYS`
- [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe), al posto di `SUBSCRIBE`
- [Lista [ ]](core.list), per comporre il comando
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
