# Blocchi di rete

`logicstudio-net` · richiede il motore `logicstudio-engine` e i [Blocchi di base](logicstudio-core)

I blocchi che fanno parlare un programma di Logic Studio con internet. Per ora c'è un blocco solo, la [Richiesta web](net.request): una richiesta HTTP o HTTPS a un sito o a un'API, con la risposta già pronta come JSON o come testo. Nell'elenco dei blocchi dell'IDE è nella categoria **Rete**.

## Come si installa

Il pacchetto non arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore**, scheda **Kernel** («Blocchi di rete»). L'AppStore installa insieme anche il motore e i blocchi di base, se mancano. Dopo l'installazione il blocco compare nella scheda **Blocchi** dell'IDE.

## I blocchi

| Blocco | Tipo | Cosa fa |
|---|---|---|
| [Richiesta web](net.request) | `net.request` | Una richiesta HTTP o HTTPS (GET, POST, PUT, PATCH, DELETE); manda la risposta, lo stato e le intestazioni. Ogni ingresso aggiunto è un parametro dell'indirizzo. |

MQTT e gli altri protocolli non ci sono ancora.

## Da sapere

### La richiesta parte dal kernel

La richiesta non parte dal tuo browser ma dal **kernel**, cioè dal computer su cui gira lilOS, a nome dell'utente che possiede il programma. Per questo:

- funziona anche quando lilOS è chiuso nel browser, se il programma è attivo;
- un programma attivo chiama davvero il sito, anche quando non guardi: provalo prima con **Prova**;
- il kernel controlla dove va la richiesta: **non arriva a questo computer né alla rete locale**, a meno che un amministratore non lo permetta, e non arriva **mai** agli indirizzi «link-local» (dove molti cloud tengono i dati segreti della macchina) né agli indirizzi multicast. I dettagli sono nella pagina [Richiesta web](net.request).

### Impostazioni del modulo

Le cambia un amministratore, nelle impostazioni del modulo `logicstudio-net`, e valgono subito per tutti i programmi:

| Impostazione | Predefinito | Valori | Cosa fa |
|---|---|---|---|
| **Permetti le richieste a questo computer e alla rete locale** | no | sì / no | Se è spuntata, le richieste possono andare a `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x` e alle altre reti non pubbliche. Gli indirizzi link-local e multicast restano vietati. |
| **Tempo massimo di una richiesta (secondi)** | 20 | da 1 a 120 | Quanto può durare una richiesta, reindirizzamenti e lettura della risposta compresi. |
| **Dimensione massima di una risposta (KB)** | 1024 | da 1 a 10240 | Quanto può essere grande una risposta, dopo la decompressione. |

### Quote e limiti

| Cosa | Limite |
|---|---|
| Richieste al minuto, per utente | 120 di serie (Pannello di controllo → Logic Studio → **Quote**, **Richieste/min**); ogni reindirizzamento conta come una richiesta |
| Reindirizzamenti seguiti | 5 |
| Indirizzo (URL) | 8192 caratteri |
| Corpo della richiesta | 5 MB |
| Intestazioni | 50, nomi fino a 64 caratteri, valori fino a 8192 |
| Tempo massimo di un blocco | 30 secondi di serie (Pannello di controllo → Logic Studio → **Limiti**): vale anche se il tempo massimo di una richiesta è più lungo |

La quota di rete è dell'utente: vale per tutti i suoi programmi insieme, prove comprese. **Quello che uso**, nella Home dell'IDE, e **Il mio uso**, nel Pannello di controllo, mostrano quante richieste hai fatto in questo minuto. Vedi anche [Limiti](logicstudio-engine/limits).

### Le app fatte con Crea app

Un'app fatta con **Crea app** che contiene una Richiesta web, prima di partire, apre una finestra «Eseguire «nome»?» che dice che l'app potrà «fare richieste su internet». Con **Esegui** l'app parte e lilOS non lo chiede più finché l'app non cambia; con **Annulla** non parte. Le prove e i programmi attivi dei tuoi progetti non chiedono niente. Vedi [Permessi](logicstudio-engine/permissions) e [Fare un'app](ide/create-app).

## Esempi completi

### 1. Una stazione meteo in una finestra

**Indirizzo** della Richiesta web: `https://api.open-meteo.com/v1/forecast?latitude=45.46&longitude=9.19&current=temperature_2m,relative_humidity_2m`.

```
[Ogni… 600 s] impulso ──▶ invia [Richiesta web] risposta ──▶ oggetto [Prendi campo: current.temperature_2m]    valore ──▶ valore [Valore: temperatura]
                                                risposta ──▶ oggetto [Prendi campo: current.relative_humidity_2m] valore ──▶ valore [Valore: umidità]
                                                Eccezione ──▶ valore [Scrivi in console]
```

[Ogni…](core.every) parte da solo all'avvio e poi ogni 10 minuti: sono 6 richieste l'ora, ben dentro la quota. Due [Prendi campo](core.get) leggono i valori e due componenti [Valore](ui.value) li mostrano nella finestra del progetto.

### 2. Un registro delle risposte

```
[Ogni… 300 s] impulso ──▶ leggi [Data e ora] ISO ──▶ alle [Componi oggetto] oggetto ──▶ contenuto [Aggiungi a file: ~/controllo-sito.jsonl]
              impulso ──▶ invia [Richiesta web] stato ──▶ codice
```

Ogni 5 minuti il programma chiama un sito e, con i [Blocchi di lilOS](logicstudio-lilos), aggiunge (con **Formato** «JSON, uno per riga») una riga con l'ora e lo stato, per esempio `{"alle":"2026-11-11T10:05:00.000Z","codice":200}`. Su [Componi oggetto](core.compose) togli «lo avvia» da **alle**, così la riga si scrive solo quando arriva lo stato. Così sai quando il sito ha risposto con un errore.

### 3. Mandare una misura e avvisare se non va

**Metodo** POST, **Indirizzo** `https://esempio.it/api/misure`, **Intestazioni** `{"Authorization": "Bearer abc123"}`.

```
[Campo numerico: misura] valore ──▶ temp [Componi oggetto] oggetto ──▶ corpo [Richiesta web] stato ──▶ a [Confronta: a < b] se falso ──▶ invia [Notifica: "Il server ha rifiutato la misura"]
[Pulsante: Invia]      premuto ──────────────────────────────────────▶ invia            [Valore: 300] valore ──▶ b
                                                                          [Richiesta web] Eccezione ──▶ invia [Notifica: "Server non raggiungibile"]
```

Gli stati da 200 a 299 vogliono dire «riuscita»: [Confronta](core.compare) con `a < b` e 300 lascia passare **se falso** per 300 e oltre (4xx, 5xx). Gli errori di rete invece arrivano dall'**Eccezione**. Le due [Notifiche](lilos.notify) coprono i due casi.

## Limiti noti

- C'è solo HTTP e HTTPS: niente MQTT, WebSocket, FTP.
- Non si può scegliere di non seguire i reindirizzamenti, né vedere l'indirizzo finale.
- La risposta è sempre letta come testo UTF-8 o JSON: immagini e altri file binari non escono intatti.
- La risposta non può superare 10 MB nemmeno con l'impostazione al massimo.
- Le intestazioni con le chiavi segrete restano scritte nel progetto, in chiaro: non condividere un progetto che contiene le tue chiavi.

## Vedi anche

- [Blocchi di base](logicstudio-core), [Blocchi di lilOS](logicstudio-lilos)
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits), [Permessi](logicstudio-engine/permissions)
- [Come funziona un blocco](ide/blocks)
