# Redis · Lista: togli (LPOP · RPOP · BLPOP)

`redis.pop` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Toglie un valore dall'**inizio** o dalla **fine** di una lista e lo manda. Può anche **aspettare** che ne arrivi uno, per al massimo 25 secondi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore tolto (testo, o convertito con **JSON**). `null` se la lista è vuota. Con **Quanti** maggiore di 0, il primo dei valori tolti. |
| **valori** (`values`) | lista | Nascosta. I valori tolti, in lista (vuota se non c'era niente). |
| **vuota** (`empty`) | sì/no | Nascosta. `true` se non è stato tolto niente (lista vuota o finita l'attesa). |
| **Exception** (`error`) | oggetto | Quando l'operazione non riesce: connessione mancante o chiusa, chiave mancante, la chiave non è una lista, valore che non è JSON, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **Lato** (`side`) | Inizio (sinistra: L…), Fine (destra: R…) | Inizio (sinistra: L…) | Da dove togliere: `LPOP` dall'inizio, `RPOP` dalla fine. |
| **Quanti (0 = uno)** (`count`) | numero intero da 0 | 0 | Quanti valori togliere in una volta. 0: uno. Serve Redis 6.2 o successivo. Non vale con l'attesa. |
| **Aspetta un valore se la lista è vuota (BLPOP · BRPOP)** (`block`) | sì / no | no | Se è spuntato, con la lista vuota il blocco aspetta che qualcuno aggiunga un valore. |
| **Aspetta al massimo (secondi, fino a 25)** (`timeout`) | da 0.1 a 25 | 5 | Quanto aspettare, con l'attesa. Scaduto il tempo, **vuota** è vero. |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco toglie dalla lista con `LPOP chiave` (o `RPOP`, con **Lato** «Fine»).

- **Senza attesa**: se la lista è vuota esce subito `null` e **vuota** `true`. Con **Quanti** (per esempio 10) toglie fino a 10 valori in una volta (non più dei valori massimi di un risultato).
- **Con l'attesa** (`BLPOP` / `BRPOP`): se la lista è vuota il blocco aspetta fino al tempo scelto (al massimo 25 secondi) che arrivi un valore, e lo toglie appena arriva. Per l'attesa il kernel apre una **connessione sua**, che conta nelle connessioni aperte dell'utente e si chiude alla fine; così le altre operazioni non aspettano. Con l'attesa si toglie un valore solo.
- **Un'attesa alla volta**: il blocco, come ogni blocco, tratta i valori uno alla volta; un altro **esegui** durante l'attesa aspetta il suo turno. Per un lavoratore che aspetta sempre, collega **vuota** (quando scade l'attesa) a un [Ritardo (setTimeout)](core.delay) e poi di nuovo a **esegui**, oppure usa [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) con [Redis · Pubblica (PUBLISH)](redis.publish).
- Il tempo massimo del blocco (30 secondi di serie) conta anche con l'attesa: tienila sotto.
- **I valori che leggi**: senza **JSON** esce sempre il testo. Con **JSON** il testo è letto con `JSON.parse`: numeri, sì/no, oggetti e liste tornano tali; se il testo non è JSON c'è un errore («Il valore … non è JSON»).

## Esempi

### 1. Prendere il prossimo lavoro

**Chiave** `coda:email`, **Lato** «Inizio», **JSON** spuntato.

```
[Intervallo (setInterval): 2 s] impulso ──▶ esegui [Redis · Lista: togli (LPOP · RPOP · BLPOP)] valore ──▶ valore [Print (console.log)]
```

Ogni 2 secondi il programma toglie il prossimo lavoro (se c'è) dalla coda in cui un altro programma aggiunge con [Redis · Lista: aggiungi (LPUSH · RPUSH)](redis.push).

### 2. Aspettare il prossimo lavoro

**Chiave** `coda:email`, **Aspetta un valore** spuntato, **Aspetta al massimo** 20 secondi.

```
[All'avvio (main)] impulso ──▶ esegui [Redis · Lista: togli (LPOP · RPOP · BLPOP)] valore ──▶ valore [Print (console.log)]
                                      vuota ──▶ esegui  (l'attesa è scaduta: riparte)
```

Il blocco resta fermo fino a 20 secondi finché non arriva un lavoro; se l'attesa scade, **vuota** lo fa ripartire (con le uscite nascoste visibili).

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| Quanti non valido: … | **Quanti** non è un numero intero tra 1 e il limite del modulo. |
| Attesa non valida | **Aspetta al massimo** non è un numero. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | La chiave esiste ma è di un altro tipo (il server dice `WRONGTYPE`). |
| Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo | **JSON** è spuntato e il testo letto non è JSON. Dopo «Il valore» compare la chiave. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |
| Troppe connessioni aperte: al massimo 10 per utente | Per l'attesa serve una connessione in più e hai già il massimo. |

## Vedi anche

- [Redis · Lista: aggiungi (LPUSH · RPUSH)](redis.push), per riempire la lista
- [Redis · Lista: intervallo (LRANGE)](redis.range), per guardare senza togliere
- [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe), per ricevere i messaggi appena arrivano
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
