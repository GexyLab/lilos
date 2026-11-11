# InfluxDB · Elimina dati (delete)

`influx.delete` · Database · [Blocchi InfluxDB](logicstudio-influxdb) · versione 1

Cancella da un bucket i punti di un **intervallo di tempo** che rispettano un **filtro** (*predicate*), per esempio `_measurement="cpu" AND host="a"`. Funziona solo con **InfluxDB 2.x** (`POST /api/v2/delete`). **Cancella davvero e per sempre**: provalo prima con **Prova** su un bucket di prova.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la cancellazione. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [InfluxDB · Connessione (connect)](influx.connect). Non avvia il blocco. |
| **inizio** (`start`) | qualsiasi | L'inizio dell'intervallo: una data ISO o i millisecondi dal 1970. Se ha un valore non vuoto, prende il posto dell'**Inizio** delle impostazioni. Non avvia il blocco. |
| **fine** (`stop`) | qualsiasi | La fine dell'intervallo, come **inizio**. Prende il posto della **Fine** delle impostazioni. Non avvia il blocco. |
| **filtro (predicate)** (`predicate`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto del **Filtro** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **fatto** (`done`) | impulso | Quando la cancellazione è riuscita. |
| **Exception** (`error`) | oggetto | Quando la cancellazione non riesce: filtro mancante, date non valide, server che non è 2.x, token senza permesso… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Filtro (predicate)** (`predicate`) | testo su più righe | vuoto | Quali punti cancellare, per esempio `_measurement="ambiente" AND stanza="cucina"`. Al massimo 10000 caratteri. |
| **Inizio (data ISO; vuoto: 1970)** (`start`) | testo | vuoto | Da quando cancellare. Vuoto: dal 1970, cioè dall'inizio. |
| **Fine (data ISO; vuoto: adesso)** (`stop`) | testo | vuoto | Fino a quando cancellare. Vuoto: fino ad adesso. |
| **Bucket (vuoto: quello della connessione)** (`bucket`) | testo | vuoto | Il bucket dove cancellare. Vuoto: quello della connessione. |
| **Tutti i dati dell'intervallo (senza filtro)** (`all`) | sì / no | no | Senza filtro il blocco si rifiuta di cancellare, a meno che questa casella non sia spuntata: allora cancella **tutti** i dati dell'intervallo. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**:

1. Se non c'è un filtro e la casella **Tutti i dati dell'intervallo** non è spuntata, il blocco si ferma con un errore: cancellare tutto deve essere una scelta voluta.
2. Le date (dall'ingresso o dalle impostazioni) sono lette come data ISO (`2026-11-11T10:00:00Z`) o come millisecondi; senza **inizio** si parte dal 1970, senza **fine** si arriva ad adesso.
3. Il blocco chiede al server di cancellare, e manda **fatto** quando ha risposto di sì.

Il filtro usa la sintassi dei *delete predicate* di InfluxDB: confronti `=` tra una chiave e un testo tra virgolette, uniti da `AND`. Le regole del filtro sono quelle di InfluxDB 2: se non le rispetta, è il server a rifiutarlo.

Con InfluxDB 3 e 1.x il server non ha questa API: il blocco dà un errore.

## Esempi

### 1. Cancellare i dati di un sensore guasto

Impostazioni: **Filtro** `_measurement="ambiente" AND stanza="cantina"`, **Inizio** `2026-11-10T00:00:00Z`, **Fine** `2026-11-11T00:00:00Z`.

```
[Pulsante: Cancella] premuto ──▶ esegui [InfluxDB · Elimina dati (delete)] fatto ──▶ invia [Notify: "Dati cancellati"]
[InfluxDB · Connessione (connect)] connessione ──▶ connessione           Exception ──▶ valore [Print (console.log)]
```

### 2. Tenere solo gli ultimi 30 giorni, ogni notte

Impostazioni: **Filtro** `_measurement="ambiente"`, **Inizio** vuoto. La **fine** arriva da un ingresso.

```
[Intervallo (setInterval): 86400 s] impulso ──▶ leggi [Now (data e ora)] ISO ──▶ fine [InfluxDB · Elimina dati (delete)]
                                      impulso ──▶ esegui
```

Un calcolo di date che sottrae 30 giorni da adesso dà la **fine** (un testo ISO). Il blocco cancella tutto quello che è più vecchio. Con un [Intervallo (setInterval)](core.every) il blocco parte anche all'avvio del programma: ricorda che ogni avvio cancella.

## Errori

| Messaggio | Quando |
|---|---|
| Manca il filtro (predicate): senza filtro si cancellano tutti i dati dell'intervallo; spunta «Tutti i dati dell'intervallo» per farlo davvero | Filtro vuoto e casella non spuntata. |
| Filtro troppo lungo | Il filtro ha più di 10000 caratteri. |
| Inizio non valido: … (serve una data ISO, come 2026-11-11T10:00:00Z) | L'inizio non è una data. |
| Fine non valido: … (serve una data ISO, come 2026-11-11T10:00:00Z) | La fine non è una data. |
| Manca il bucket (nelle impostazioni del blocco o della connessione) | Nessun bucket, né nel blocco né nella connessione. |
| Il bucket non valido: … | Il nome ha più di 255 caratteri o caratteri di controllo. |
| Questo server non sa cancellare con un filtro (/api/v2/delete): serve InfluxDB 2 | Il server non è 2.x. |
| InfluxDB ha risposto 400 (richiesta non valida): … | Il filtro non è valido per InfluxDB. |
| InfluxDB ha risposto 403 (il token non ha il permesso): … | Il token non può cancellare in quel bucket. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi InfluxDB](logicstudio-influxdb).

## Vedi anche

- [InfluxDB · Connessione (connect)](influx.connect), [InfluxDB · Scrivi punto (write)](influx.write), [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query)
- [Intervallo (setInterval)](core.every), [Now (data e ora)](core.now)
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
