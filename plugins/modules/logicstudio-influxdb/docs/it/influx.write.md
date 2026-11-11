# InfluxDB · Scrivi punto (write)

`influx.write` · Database · [Blocchi InfluxDB](logicstudio-influxdb) · versione 1

Scrive un **punto** (misura, tag, campi, tempo) in un bucket di InfluxDB, o una lista di punti con una sola richiesta. Ogni ingresso aggiunto è un **tag**, con il suo nome. I punti vanno al server in *line protocol* (`POST /api/v2/write`).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la scrittura. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [InfluxDB · Connessione (connect)](influx.connect). Non avvia il blocco. |
| **misura** (`measurement`) | testo | Il nome della misura. Se ha un valore non vuoto, prende il posto della **Misura** delle impostazioni. Non avvia il blocco. |
| **campi** (`fields`) | qualsiasi | I valori da scrivere: un oggetto `{ "temp": 21.5, "umidita": 40 }`. Un valore solo (un numero, un testo, sì/no) diventa il campo `value`. Non avvia il blocco. |
| **tag** (`tags`) | oggetto | Nascosta. Altri tag, come oggetto `{ "stanza": "cucina" }`. Si sommano a quelli delle impostazioni. Non avvia il blocco. |
| **tempo** (`time`) | qualsiasi | Nascosta. Il momento del punto: una data ISO (`2026-11-11T10:00:00Z`, anche con i nanosecondi) o i millisecondi dal 1970. Vuoto: lo mette il server. Non avvia il blocco. |
| **punti (lista)** (`points`) | lista | Nascosta. Una lista di punti `{ "measurement": …, "tags": {…}, "fields": {…}, "time": … }`, scritti con una sola richiesta. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **fatto** (`done`) | impulso | Quando la scrittura è riuscita. |
| **punti scritti** (`written`) | numero | Nascosta. Quanti punti sono stati scritti. |
| **Exception** (`error`) | oggetto | Quando la scrittura non riesce: connessione mancante, punto non valido, bucket che non c'è, token senza permesso, quota finita… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Misura (measurement)** (`measurement`) | testo | vuoto | La misura, quando l'ingresso **misura** non ha un valore. |
| **Tag (JSON)** (`tags`) | un oggetto JSON | `{}` | I tag di tutti i punti, per esempio `{"sensore": "serra"}`. |
| **Bucket (vuoto: quello della connessione)** (`bucket`) | testo | vuoto | Il bucket dove scrivere. Vuoto: quello della connessione. |
| **Precisione del tempo** (`precision`) | Nanosecondi, Microsecondi, Millisecondi, Secondi | Millisecondi | L'unità dei tempi mandati al server. Più è fine, più i punti vicini restano distinti. |
| **Numeri interi come integer (i)** (`integers`) | sì / no | no | Se è spuntato, un numero intero (`5`) va come integer (`5i`). Se no, tutti i numeri sono float. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **tag**: si chiama **tag 1**, **tag 2**… e va **rinominato** con il nome del tag, per esempio `stanza`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire la scrittura, anche se l'ingresso «lo avvia». La scrittura parte solo con **esegui**. Un ingresso senza valore (o vuoto) non diventa un tag. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **esegui**:

1. I **tag** si mettono insieme: prima quelli delle impostazioni, poi quelli dell'ingresso **tag**, poi gli ingressi aggiunti (l'ultimo vince, se il nome è lo stesso).
2. Se **punti (lista)** ha almeno un elemento, ogni elemento è un punto: un oggetto con `measurement`, `tags`, `fields`, `time` (quello che manca viene dal blocco: la misura da **misura**, i tag si sommano); un elemento che non è un oggetto diventa i `fields` del punto. Gli ingressi **campi** e **tempo** allora non contano.
3. Altrimenti si scrive un punto solo, con **misura**, **campi** e **tempo**.
4. Il punto diventa una riga di line protocol e va al server; quando il server risponde di sì, esce **fatto** (e **punti scritti**).

### Le regole dei punti

- **Misura**: serve sempre, non può cominciare con `#` né avere un a capo. Virgole e spazi vengono messi in sicurezza da soli.
- **Tag**: i nomi e i valori sono testo; un tag senza valore (o con `null`, o vuoto) si salta; un oggetto o una lista diventa testo JSON. I tag sono scritti in ordine alfabetico (l'ordine che InfluxDB preferisce).
- **Campi**: serve almeno un campo con un valore. I numeri sono float (`21.5`); con **Numeri interi come integer** i numeri interi vanno come `5i`. I testi sono testi, sì/no sono `true`/`false`, oggetti e liste diventano testo JSON, `null` si salta. `NaN` e infinito non si possono scrivere.
- **Tempo**: un numero (o un testo di sole cifre) è in **millisecondi**; un testo è una data ISO (con più cifre dopo i secondi, fino ai nanosecondi). Il tempo si converte nella **Precisione** scelta. Senza tempo, il punto prende l'ora del server.
- Un punto con la stessa misura, gli stessi tag e lo stesso tempo di uno già scritto **lo sostituisce**: è così che funziona InfluxDB.

### Limiti

- Al massimo tanti punti quanti sono le righe massime del modulo (10000 di serie) in una volta.
- Il bucket è quello dell'impostazione o, se vuoto, quello della connessione. Con 1.x si scrive `database/retention`.
- Con 2.x la scrittura usa l'organizzazione della connessione.

## Esempi

### 1. Una temperatura ogni minuto con i tag

Impostazioni: **Misura** `ambiente`, **Tag** `{"sito": "casa"}`. Un ingresso aggiunto, rinominato `stanza`.

```
[InfluxDB · Connessione (connect)] connessione ──▶ connessione [InfluxDB · Scrivi punto (write)] fatto ──▶ valore [Print (console.log)]
[Costante · Variabile: cucina] valore ──▶ stanza                    Exception ──▶ valore [Print (console.log): errore]
[Campo numerico: temperatura] valore ──▶ campi
[Intervallo (setInterval): 60 s] impulso ──▶ esegui
```

Ogni minuto scrive `ambiente,sito=casa,stanza=cucina value=21.5 1794…` (il campo è `value` perché **campi** è un numero solo). [Intervallo (setInterval)](core.every) fa partire la scrittura.

### 2. Più campi insieme

```
[Oggetto { }] oggetto ──▶ campi [InfluxDB · Scrivi punto (write)] fatto ──▶ valore [Notify: "Misura salvata"]
[Pulsante: Salva] premuto ──▶ esegui
```

[Oggetto { }](core.compose) prepara `{ "temp": 21.5, "umidita": 40, "finestra_aperta": false }`: tre campi di tipi diversi (float, float, booleano) nello stesso punto.

### 3. Una lista di punti con un tempo ciascuno

```
[Lista [ ]] lista ──▶ punti (lista) [InfluxDB · Scrivi punto (write)] punti scritti ──▶ valore [Valore: scritti]
```

Ogni elemento è per esempio `{ "fields": { "kw": 1.2 }, "time": "2026-11-11T09:00:00Z" }`; la misura viene dalle impostazioni e tutti i punti vanno in una sola richiesta.

## Errori

| Messaggio | Quando |
|---|---|
| Manca la misura (measurement) | Nessuna misura, né nell'ingresso né nelle impostazioni. |
| Il nome della misura non può cominciare con # | La misura comincia con `#`. |
| Il nome della misura non può contenere un a capo: … | La misura ha un a capo (così anche per «Il nome di un tag», «Il valore di un tag», «Il nome di un campo»). |
| Il punto di «…» non ha campi (fields): ne serve almeno uno | Nessun campo con un valore. |
| Valore non valido per un campo: NaN (InfluxDB non tiene NaN e Infinito) | Un campo è NaN o infinito. |
| Tempo non valido: … (serve una data ISO, come 2026-11-11T10:00:00Z, o i millisecondi) | Il tempo non si capisce. |
| Tempo non valido: … | Il tempo è un numero infinito. |
| Precisione non valida: … (ns, us, ms, s) | La precisione non è una di quelle ammesse. |
| Troppi punti in una volta: 20000 (al massimo 10000) | La lista ha più punti del limite del modulo. |
| Tag non validi: scrivi un oggetto JSON, per esempio {"host": "server1"} | I **Tag (JSON)** non sono JSON. |
| Tag non validi: serve un oggetto JSON { "nome": valore } | Sono JSON, ma non un oggetto. |
| Manca il bucket (nelle impostazioni del blocco o della connessione) | Nessun bucket, né nel blocco né nella connessione. |
| Il bucket non valido: … | Il nome ha più di 255 caratteri o caratteri di controllo. |
| InfluxDB ha risposto 404 (non trovato): … | Il bucket o l'organizzazione non esistono. |
| InfluxDB ha risposto 422 (dati non validi): … | Per esempio un campo già scritto con un altro tipo (testo dove c'era un numero). |
| InfluxDB ha risposto 403 (il token non ha il permesso): … | Il token non può scrivere in quel bucket. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi InfluxDB](logicstudio-influxdb).

## Vedi anche

- [InfluxDB · Connessione (connect)](influx.connect), [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query)
- [Intervallo (setInterval)](core.every), per scrivere a intervalli
- [Oggetto { }](core.compose), per preparare i campi
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
