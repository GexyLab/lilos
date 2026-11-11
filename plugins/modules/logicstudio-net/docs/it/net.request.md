# Richiesta web

`net.request` · Rete · [Blocchi di rete](logicstudio-net) · versione 1

Fa una richiesta HTTP o HTTPS a un sito o a un servizio (un'API) e manda la risposta: il contenuto, lo stato e le intestazioni. Con [Ogni…](core.every) collegato a **invia** puoi chiedere un dato ogni tanto, per esempio il meteo ogni 10 minuti.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la richiesta. |
| **indirizzo (URL)** (`url`) | testo | L'indirizzo da chiamare. Se ha un valore non vuoto, prende il posto dell'**Indirizzo (URL)** delle impostazioni. Non avvia il blocco. |
| **corpo** (`body`) | qualsiasi | Il corpo della richiesta, per POST, PUT, PATCH e DELETE. Un testo è mandato così com'è, qualsiasi altro valore come JSON. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **stato** (`status`) | numero | Il codice di stato HTTP della risposta: 200, 201, 404, 500… |
| **intestazioni** (`headers`) | oggetto | Le intestazioni della risposta, con i nomi in minuscolo. |
| **risposta** (`body`) | qualsiasi | Il contenuto della risposta: un valore JSON o un testo (vedi **Risposta** nelle impostazioni). |
| **Eccezione** (`error`) | oggetto | Quando la richiesta non arriva a una risposta: indirizzo non valido o non permesso, sito che non c'è o non risponde, risposta troppo grande, quota finita… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Metodo** (`method`) | GET, POST, PUT, PATCH, DELETE | GET | Il metodo HTTP. |
| **Indirizzo (URL)** (`url`) | testo | `https://` | L'indirizzo da chiamare, quando l'ingresso **indirizzo (URL)** non ha un valore. Solo `http://` e `https://`. |
| **Intestazioni (JSON)** (`headers`) | un oggetto JSON | `{}` | Le intestazioni da mandare, per esempio `{"Accept": "application/json", "Authorization": "Bearer abc123"}`. |
| **Risposta** (`kind`) | Automatica (JSON se è JSON), JSON, Testo | Automatica | Come leggere il contenuto della risposta (vedi sotto). |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **parametro dell'indirizzo**: si chiama **parametro 1**, **parametro 2**… e va **rinominato** con il nome del parametro, per esempio `q` o `citta`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire la richiesta, anche se l'ingresso «lo avvia». La richiesta parte solo con **invia**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **invia**:

1. Il blocco prende l'indirizzo (quello dell'ingresso, se ha un valore non vuoto, altrimenti quello delle impostazioni) e toglie gli spazi all'inizio e alla fine.
2. Aggiunge all'indirizzo i parametri degli ingressi aggiunti che hanno un valore.
3. Legge le intestazioni dalle impostazioni.
4. Chiede al kernel (il computer su cui gira lilOS) di fare la richiesta, con tutti i controlli di sicurezza.
5. Quando arriva la risposta, manda **stato**, poi **intestazioni**, poi **risposta**.

### L'indirizzo e i parametri

- Solo indirizzi `http://` e `https://`, lunghi al massimo 8192 caratteri (anche dopo aver aggiunto i parametri).
- Il valore predefinito `https://` da solo non è un indirizzo: se non scrivi niente, il blocco dà «Indirizzo (URL) non valido: https://».
- Ogni ingresso aggiunto con un valore diventa `nome=valore` nell'indirizzo, scritto in modo corretto (spazi, accenti e simboli vengono codificati). Gli ingressi senza valore (o con `null`) non contano.
- Se l'indirizzo ha già un parametro con lo stesso nome, viene **sostituito**: con `https://esempio.it/cerca?q=vecchio` e l'ingresso **q** = `nuovo`, la richiesta va a `https://esempio.it/cerca?q=nuovo`.
- Una lista diventa lo stesso parametro ripetuto: **tag** = `["a", "b"]` dà `tag=a&tag=b`. Un oggetto diventa testo JSON. Numeri e sì/no diventano testo (`5`, `true`).
- Nome utente e password nell'indirizzo (`https://utente:password@esempio.it/`) vengono mandati come autenticazione «Basic».

### Le intestazioni

- Le **Intestazioni (JSON)** devono essere un oggetto JSON `{ "Nome": "valore" }`, al massimo 50. Un valore che non è testo diventa testo (un oggetto diventa JSON).
- Ogni nome può avere solo lettere, cifre e i simboli ammessi da HTTP (niente spazi), al massimo 64 caratteri; ogni valore al massimo 8192 caratteri, senza a capo.
- Il blocco manda sempre `User-Agent: lilOS Logic Studio` e `Accept: */*`, a meno che tu non li cambi nelle intestazioni.
- Alcune intestazioni le decide la richiesta da sola e quelle che scrivi vengono ignorate senza errore: `Host`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Keep-Alive`, `Upgrade`, `TE`, `Trailer`, `Expect`, `Accept-Encoding`, `Proxy-Connection`.
- Le intestazioni possono contenere segreti (una chiave, un token): non vengono mai scritte nei registri né nei messaggi d'errore. Ricorda però che restano scritte nel progetto, in chiaro.

### Il corpo

- Con **GET** il corpo non viene mandato, anche se **corpo** ha un valore.
- Con POST, PUT, PATCH e DELETE: un **testo** è mandato così com'è, con `Content-Type: text/plain; charset=utf-8`; qualsiasi altro valore (oggetto, lista, numero, sì/no) è mandato come JSON, con `Content-Type: application/json`.
- Se nelle intestazioni scrivi tu `Content-Type`, vale il tuo. Per esempio, per mandare un modulo scrivi il corpo come testo `nome=Anna&eta=30` e l'intestazione `{"Content-Type": "application/x-www-form-urlencoded"}`.
- Se **corpo** non ha un valore (o è `null`), la richiesta parte senza corpo.
- Il corpo può essere al massimo di 5 MB.

### La risposta

- Gli stati di errore HTTP (**404**, **500**…) **non** sono errori del blocco: escono normalmente su **stato**, **intestazioni** e **risposta**. Se ti interessa solo una risposta riuscita, controlla **stato** (per esempio con [Confronta](core.compare): 200).
- **Risposta Automatica**: se il server dice che il contenuto è JSON (`Content-Type` come `application/json` o `…+json`), esce il valore JSON; se il JSON non è valido, o il server non dice JSON, esce il testo. Una risposta vuota esce come testo vuoto.
- **Risposta JSON**: il contenuto è sempre letto come JSON; vuoto dà `null`; un JSON non valido dà l'errore «La risposta non è JSON valido».
- **Risposta Testo**: esce sempre il testo, anche se è JSON.
- Il testo è letto in UTF-8. Le risposte compresse (gzip, deflate, br) vengono decompresse.
- **intestazioni** ha i nomi in minuscolo (`content-type`, `date`…); `set-cookie`, se c'è, è una lista.
- L'indirizzo finale, dopo eventuali reindirizzamenti, non esce dal blocco.

### I reindirizzamenti

- Il blocco segue da solo fino a **5 reindirizzamenti** (stati 301, 302, 303, 307, 308); al sesto dà errore.
- Con 303, e con 301 o 302 dopo un POST, la richiesta successiva diventa un GET senza corpo. Con 307 e 308 metodo e corpo restano.
- Se il reindirizzamento porta a un altro sito, le intestazioni `Authorization`, `Cookie` e `Proxy-Authorization` non vengono mandate.
- Ogni reindirizzamento viene controllato come la prima richiesta (indirizzi permessi, quota).

### Sicurezza: gli indirizzi bloccati

La richiesta parte dal kernel, cioè dal computer su cui gira lilOS. Per non far arrivare un programma dove non deve:

- **Mai permessi**, nemmeno dall'amministratore: gli indirizzi «link-local» `169.254.x.x` e `fe80::…` (lì molti cloud tengono i dati segreti della macchina), gli indirizzi multicast (`224.0.0.0`–`239.255.255.255`, `ff00::…`), `0.x.x.x`, `255.255.255.255` e `::`.
- **Bloccati se l'amministratore non li permette**: questo computer (`127.x.x.x`, `localhost`, `::1`), le reti locali (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`, `fc00::…`), la rete condivisa dei gestori (`100.64.x.x`–`100.127.x.x`), gli indirizzi riservati e di documentazione, e gli indirizzi IPv6 che contengono dentro un indirizzo IPv4 (che potrebbero arrivare a quelli).
- Per permettere i secondi, un amministratore spunta **Permetti le richieste a questo computer e alla rete locale** nelle impostazioni del modulo `logicstudio-net`.
- Il nome del sito viene risolto e **ogni** indirizzo che ha viene controllato prima di collegarsi; poi la connessione va proprio all'indirizzo controllato. Così un nome non può essere spostato su un indirizzo vietato tra il controllo e la connessione.
- I certificati HTTPS vengono controllati: un certificato scaduto o non valido dà errore.

### Tempi, dimensioni, quote

| Cosa | Valore | Dove si cambia |
|---|---|---|
| Tempo massimo di una richiesta (reindirizzamenti e lettura compresi) | 20 secondi | Impostazioni del modulo: **Tempo massimo di una richiesta (secondi)**, da 1 a 120 |
| Dimensione massima di una risposta (dopo la decompressione) | 1024 KB | Impostazioni del modulo: **Dimensione massima di una risposta (KB)**, da 1 a 10240 |
| Richieste di rete al minuto, per utente | 120 | Pannello di controllo → Logic Studio → **Quote** (**Richieste/min**) |
| Tempo massimo di un blocco | 30 secondi | Pannello di controllo → Logic Studio → **Limiti** |

- Le impostazioni del modulo le cambia un amministratore e valgono subito, dalla richiesta successiva.
- **Ogni** richiesta conta nella quota di rete al minuto, e ogni reindirizzamento conta come una richiesta in più. La quota è dell'utente: vale per tutti i suoi programmi insieme, prove comprese.
- Se il tempo massimo di una richiesta è più lungo del tempo massimo di un blocco, è il blocco a fermarsi per primo, con «Richiesta web ha impiegato più di 30 s».
- Quando il programma si ferma, le richieste in corso si fermano anche loro.

### Una richiesta alla volta

Come ogni blocco, la Richiesta web tratta i valori uno alla volta: se arriva un altro **invia** mentre una richiesta è in corso, aspetta il suo turno e parte dopo. Se gli impulsi arrivano più in fretta di quanto durano le richieste, si accumulano. Usa un ritmo tranquillo, o più blocchi per indirizzi diversi.

## Esempi

### 1. Leggere un JSON ogni 10 minuti

Impostazioni: **Metodo** GET, **Indirizzo** `https://api.open-meteo.com/v1/forecast?latitude=45.46&longitude=9.19&current=temperature_2m`.

```
[Ogni… 600 s] impulso ──▶ invia [Richiesta web] risposta ──▶ oggetto [Prendi campo: current.temperature_2m] valore ──▶ valore [Scrivi in console]
                                                Eccezione ──▶ valore [Scrivi in console: errore]
```

Il server risponde con `Content-Type: application/json`, quindi **risposta** è già un oggetto, per esempio `{ "current": { "temperature_2m": 12.4, … }, … }`. [Prendi campo](core.get) manda `12.4`. Se la rete non va, la console scrive per esempio «Indirizzo non trovato: api.open-meteo.com».

### 2. Una ricerca con un parametro

Aggiungi un ingresso e rinominalo `q`. **Indirizzo**: `https://esempio.it/api/cerca`.

```
[Campo di testo: cerca] testo ──▶ q    [Richiesta web] risposta ──▶ righe [Tabella]
[Pulsante: Cerca]     premuto ──▶ invia
```

L'utente scrive `caffè e latte` e preme il [Pulsante](ui.button): la richiesta va a `https://esempio.it/api/cerca?q=caff%C3%A8+e+latte`. Se la risposta è una lista di oggetti, la [Tabella](ui.table) la mostra.

### 3. Mandare dati con POST

Impostazioni: **Metodo** POST, **Indirizzo** `https://esempio.it/api/misure`, **Intestazioni** `{"Authorization": "Bearer abc123"}`.

```
[Componi oggetto] oggetto ──▶ corpo [Richiesta web] stato ──▶ a [Confronta: a = b] se falso ──▶ invia [Notifica: "Invio non riuscito"]
[Pulsante: Invia] premuto ──▶ invia                    [Valore: 201] valore ──▶ b
```

[Componi oggetto](core.compose) prepara `{ "sensore": "serra", "temp": 22.5 }`, che parte come JSON con `Content-Type: application/json`. Se il server risponde con uno stato diverso da 201 (per esempio 401 se la chiave è sbagliata), ricevi una [Notifica](lilos.notify). Ricorda: un 401 non va su **Eccezione**.

### 4. Un indirizzo che cambia

```
[Selezione: paese] valore ──▶ a [Formatta testo: "https://esempio.it/paesi/{a}.json"] testo ──▶ indirizzo (URL) [Richiesta web]
                                                                                       testo ──▶ valore [Aspetta: 0,1 s] valore ──▶ invia
```

Ogni volta che l'utente sceglie un paese nella [Selezione](ui.select) (per esempio `IT`), [Formatta testo](core.format) prepara l'indirizzo `https://esempio.it/paesi/IT.json`. Siccome **indirizzo (URL)** non avvia il blocco, la richiesta parte con **invia**: qui lo stesso testo passa da [Aspetta](core.delay), così **invia** arriva un attimo dopo l'indirizzo e la richiesta usa sempre quello nuovo. Se **invia** arrivasse prima che **indirizzo (URL)** abbia un valore, il blocco userebbe l'**Indirizzo** delle impostazioni.

## Errori

| Messaggio | Quando |
|---|---|
| Manca l'indirizzo (URL) della richiesta | L'indirizzo è vuoto. |
| Indirizzo (URL) non valido: … | L'indirizzo non si può leggere (per esempio `https://` da solo, o senza `http`). |
| Indirizzo (URL) troppo lungo | Più di 8192 caratteri. |
| Indirizzo (URL) troppo lungo con i parametri | Più di 8192 caratteri dopo aver aggiunto i parametri. |
| Solo indirizzi http e https: ftp: | L'indirizzo non è `http` o `https` (qui `ftp`). |
| Metodo non valido: … (GET, POST, PUT, PATCH, DELETE) | Il metodo non è uno di quelli ammessi. |
| Intestazioni non valide: scrivi un oggetto JSON, per esempio {"Accept": "application/json"} | Le **Intestazioni (JSON)** non sono JSON. |
| Intestazioni non valide: serve un oggetto JSON { "Nome": "valore" } | Sono JSON, ma non un oggetto (per esempio una lista). |
| Troppe intestazioni (al massimo 50) | Più di 50 intestazioni. |
| Nome di intestazione non valido: … | Un nome ha spazi o simboli non ammessi, o è più lungo di 64 caratteri. |
| Valore dell'intestazione … non valido | Un valore ha un a capo o è più lungo di 8192 caratteri. |
| Corpo della richiesta troppo grande (al massimo 5 MB) | Il corpo supera 5 MB. |
| Indirizzo non permesso: 169.254.169.254 | L'indirizzo è tra quelli mai permessi. |
| Indirizzo non permesso: 127.0.0.1 è di questo computer o della rete locale (l'amministratore può permetterlo nelle impostazioni del modulo logicstudio-net) | L'indirizzo è di questo computer o della rete locale e non è permesso. |
| Indirizzo non trovato: … | Il nome del sito non esiste (o il DNS non risponde). |
| Connessione rifiutata da … | Il server non accetta connessioni su quella porta. |
| Connessione chiusa da … | Il server ha chiuso la connessione. |
| … non è raggiungibile | La rete non arriva a quel server. |
| Il certificato di … è scaduto | Il certificato HTTPS è scaduto. |
| Il certificato di … non è valido | Il certificato HTTPS non è valido per quel nome, o è autofirmato. |
| Nessuna risposta da … in 20 secondi | Il tempo massimo di una richiesta è finito (il numero è quello delle impostazioni). Lo stesso messaggio compare se il programma viene fermato durante la richiesta. |
| Troppi reindirizzamenti (più di 5) | Più di 5 reindirizzamenti di fila. |
| Risposta troppo grande (più di 1024 KB) | La risposta supera la dimensione massima. |
| La risposta non è JSON valido | **Risposta** JSON e il contenuto non è JSON. |
| Richiesta a … non riuscita: … | Altri problemi di rete, con la spiegazione tecnica. |
| Troppe richieste di rete: hai finito la quota di questo minuto | Hai superato le richieste al minuto della tua quota. |
| Richiesta web ha impiegato più di 30 s | La richiesta ha superato il tempo massimo di un blocco. |
| Il programma non è in esecuzione | Il programma si stava fermando. |

## Permessi

La richiesta parte dal computer su cui gira lilOS, a nome dell'utente che possiede il programma, e conta nella sua quota. Un'app fatta con **Crea app** che contiene una Richiesta web, prima di partire, ti chiede il permesso di «fare richieste su internet». Vedi [Permessi](logicstudio-engine/permissions).

## Vedi anche

- [Ogni…](core.every), per richieste a intervalli
- [Prendi campo](core.get), per leggere un campo della risposta
- [Componi oggetto](core.compose), per preparare un corpo JSON
- [Formatta testo](core.format), per costruire un indirizzo
- [Aggiungi a file](lilos.fileAppend), per tenere un registro delle risposte
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
