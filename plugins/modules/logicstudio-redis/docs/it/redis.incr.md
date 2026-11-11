# Redis · Incrementa (INCRBY)

`redis.incr` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Aggiunge il **passo** al numero di una chiave (una chiave che non c'è vale 0) e manda il nuovo valore. Il cambiamento è atomico: due programmi che incrementano insieme non si pestano i piedi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |
| **passo** (`step`) | numero | Se ha un valore non vuoto, prende il posto del **Passo** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il numero della chiave dopo il cambiamento. |
| **Exception** (`error`) | oggetto | Quando l'incremento non riesce: connessione mancante o chiusa, chiave mancante, passo non valido, la chiave non contiene un numero, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **Passo (negativo per diminuire)** (`step`) | numero | 1 | Quanto aggiungere. Negativo per diminuire; con la virgola (`0.5`) usa `INCRBYFLOAT`. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede a Redis `INCRBY chiave passo`.

- Un passo **intero** usa `INCRBY`; un passo **con la virgola** usa `INCRBYFLOAT` (e il valore ha la virgola). Se la chiave contiene già un numero con la virgola e il passo è intero, il blocco passa da solo a `INCRBYFLOAT`.
- Una chiave che non c'è parte da 0: dopo il primo incremento vale il passo.
- La chiave deve contenere un numero scritto come testo (`"12"`): se contiene altro, il server risponde `ERR value is not an integer or out of range` (messaggio del server, in inglese).
- Il passo `1` e `-1` fanno da `INCR` e `DECR`.
- Un contatore con scadenza: scrivi il contatore e poi dagli la scadenza con [Redis · Scadenza (EXPIRE · TTL)](redis.expire) (INCRBY non toglie la scadenza che c'è).

## Esempi

### 1. Contare le pressioni di un pulsante

**Chiave** `pulsante:premuto`.

```
[Pulsante: Premi] premuto ──▶ esegui [Redis · Incrementa (INCRBY)] valore ──▶ valore [Valore: totale]
```

Ogni pressione, anche da programmi diversi che usano la stessa chiave, aggiunge 1 e il [Valore](ui.value) mostra il totale.

### 2. Sommare una misura con la virgola

**Chiave** `energia:kwh`, **Passo** 0.25.

```
[Intervallo (setInterval): 900 s] impulso ──▶ esegui [Redis · Incrementa (INCRBY)] valore ──▶ valore [Print (console.log)]
```

Ogni 15 minuti il blocco aggiunge 0,25 con `INCRBYFLOAT`.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| Passo non valido: … | **passo** non è un numero. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | La chiave esiste ma è di un altro tipo (il server dice `WRONGTYPE`). |
| ERR value is not an integer or out of range | La chiave contiene un testo che non è un numero (messaggio del server, in inglese). |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |

## Vedi anche

- [Redis · Leggi (GET)](redis.get), per rileggere il numero
- [Redis · Scadenza (EXPIRE · TTL)](redis.expire), per dare una scadenza a un contatore
- [Contatore (++ −−)](core.counter), il contatore dentro il programma
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
