# Blocchi InfluxDB

`logicstudio-influxdb` · richiede il motore `logicstudio-engine` e i [Blocchi di base](logicstudio-core)

I blocchi che fanno parlare un programma di Logic Studio con **InfluxDB**, il database per le serie di tempo (misure di sensori, consumi, temperature…): scrivere punti, leggerli con una query Flux, InfluxQL o SQL, elencare i bucket e cancellare dati. Funzionano con InfluxDB **2.x** (anche Cloud), **3.x** (Core, Enterprise, Cloud) e **1.8 e successivi** (tramite le API di compatibilità v2). Nell'elenco dei blocchi dell'IDE sono nella categoria **Database**. Per i database SQL vedi [Blocchi database (SQL)](logicstudio-db).

## Come si installa

Il pacchetto non arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore**, scheda **Kernel** («Blocchi InfluxDB»). L'AppStore installa insieme anche il motore e i blocchi di base, se mancano. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE.

## I blocchi

| Blocco | Tipo | Cosa fa |
|---|---|---|
| [InfluxDB · Connessione (connect)](influx.connect) | `influx.connect` | Apre la connessione al server e manda il riferimento da collegare agli altri blocchi. |
| [InfluxDB · Scrivi punto (write)](influx.write) | `influx.write` | Scrive un punto (misura, tag, campi, tempo) o una lista di punti. Ogni ingresso aggiunto è un tag. |
| [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query) | `influx.query` | Esegue una query e manda le righe. Ogni ingresso aggiunto è un parametro. |
| [InfluxDB · Bucket (elenco)](influx.buckets) | `influx.buckets` | I bucket (o i database) che il token può vedere. |
| [InfluxDB · Elimina dati (delete)](influx.delete) | `influx.delete` | Cancella i punti di un intervallo di tempo che rispettano un filtro. Solo 2.x. |

Una misura ogni tanto si fa con [Intervallo (setInterval)](core.every) collegato a **esegui** di Scrivi punto.

## Da sapere

### Le richieste partono dal kernel

InfluxDB parla HTTP. Le richieste non partono dal tuo browser né dal programma, ma dal **kernel**, cioè dal computer su cui gira lilOS, a nome dell'utente che possiede il programma. Per questo:

- funziona anche quando lilOS è chiuso nel browser, se il programma è attivo;
- il programma non vede mai il token né un collegamento di rete: tiene solo un **riferimento**;
- un programma attivo scrive e cancella davvero sul database, anche quando non guardi: provalo prima con **Prova**, soprattutto con Scrivi punto ed Elimina dati;
- non servono librerie esterne: il modulo ha un piccolo client HTTP suo.

### Il riferimento alla connessione (handle)

L'uscita **connessione** del blocco [InfluxDB · Connessione (connect)](influx.connect) è un piccolo oggetto che contiene solo un codice casuale, il tipo di database e il nome del server. Si porta con un [collegamento](ide/blocks) all'ingresso **connessione** degli altri blocchi. Vale solo per il programma che l'ha aperta (copiata in un altro programma non funziona) e si chiude con **chiudi** o quando il programma si ferma. Un blocco InfluxDB non accetta il riferimento di un altro tipo di database.

### Cifrato o no: http e https

Se la cifratura c'è lo decide l'indirizzo del server: `https://…` è cifrato, `http://…` no (token, password e dati viaggiano in chiaro: va bene solo su una rete di cui ti fidi). Con `https` il certificato è **controllato** di serie; la scelta «Non controllato (cifrato comunque)» serve per i certificati autofirmati. Nell'indirizzo non si scrivono utente e password: ci sono i campi apposta.

### Gli indirizzi permessi

Il nome del server viene risolto e **ogni** indirizzo che ha viene controllato prima di collegarsi; poi la connessione va proprio all'indirizzo controllato (un nome non può essere spostato su un indirizzo vietato tra il controllo e la connessione). Il kernel non segue mai i reindirizzamenti: se il server risponde con un 3xx è un errore.

- **Mai permessi**, nemmeno dall'amministratore: gli indirizzi «link-local» `169.254.x.x` e `fe80::…` (lì molti cloud tengono i dati segreti della macchina), i multicast, `0.x.x.x`, `255.255.255.255` e `::`.
- **Bloccati se l'amministratore non li permette**: questo computer (`localhost`, `127.x.x.x`, `::1`), le reti locali (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`) e gli altri indirizzi non pubblici. Per permetterli un amministratore spunta **Permetti i database su questo computer e sulla rete locale** nelle impostazioni del modulo.
- **I database di lilOS** (gli indirizzi che il kernel usa per sé nella sua configurazione) non si possono aprire mai, nemmeno con il permesso: «Questo è il database di lilOS: i blocchi non possono usarlo».

### Il token e la password

L'impostazione **Token (password per 1.x)** del blocco di connessione è un campo fatto apposta: quello che scrivi non si vede e non torna mai indietro. Il motore lo **cifra** per te, su questo lilOS, e nello schema resta solo il testo cifrato. Quindi:

- chi apre lo schema (o un file del progetto) non vede il token;
- un altro utente, o lo stesso schema su un altro lilOS, **non lo può aprire**: la connessione dà l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)», e il token va scritto di nuovo;
- il token può anche arrivare dall'ingresso nascosto **token / password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**: in quel caso non viene salvato da nessuna parte. Un valore non vuoto sull'ingresso vince su quello delle impostazioni;
- il token e la password non finiscono mai nei registri né nei messaggi d'errore, anche se il server li ripete (al loro posto ci sono tre pallini).

### Impostazioni del modulo

Le cambia un amministratore, nelle impostazioni del modulo `logicstudio-influxdb`, e valgono subito, dall'operazione successiva:

| Impostazione | Predefinito | Valori | Cosa fa |
|---|---|---|---|
| **Permetti i database su questo computer e sulla rete locale** | no | sì / no | Permette `localhost` e le reti locali. Link-local e multicast restano vietati. |
| **Tempo massimo di un'operazione (secondi)** | 30 | da 1 a 600 | Quanto può durare una richiesta, risposta compresa. |
| **Righe di un risultato (e punti di una scrittura), al massimo** | 10000 | da 1 a 1000000 | Le righe di una query e i punti di una scrittura. Con più righe il risultato è **troncato**. |
| **Dimensione massima di un risultato (KB)** | 4096 | da 16 a 65536 | Quanto può essere grande una risposta (e un risultato). |
| **Connessioni aperte per utente, al massimo** | 10 | da 1 a 100 | Quante connessioni può tenere aperte un utente, con tutti i suoi programmi. |
| **Operazioni al minuto per utente, al massimo** | 600 | da 1 a 100000 | Quante operazioni (compresa ogni connessione) può fare un utente in un minuto. |
| **Permetti InfluxDB** | sì | sì / no | Se non è spuntata, nessuno può aprire una connessione InfluxDB. |

### Quote e limiti

| Cosa | Limite |
|---|---|
| Righe di un risultato, punti di una scrittura | 10000 di serie (impostazione del modulo) |
| Dimensione di un risultato | 4096 KB di serie |
| Tempo di un'operazione | 30 secondi di serie |
| Operazioni al minuto, per utente | 600 di serie |
| Connessioni aperte, per utente | 10 di serie |
| Lunghezza di una query | 100000 caratteri |
| Ingressi aggiunti (tag o parametri) | 16 (meno se il limite generale del motore è più basso: vedi [Limiti](logicstudio-engine/limits)) |
| Tempo massimo di un blocco | 30 secondi di serie (Pannello di controllo → Logic Studio → **Limiti**): vale anche se il tempo dell'operazione è più lungo |

### Le versioni

- **2.x** (e Cloud): token, organizzazione e bucket; Flux, InfluxQL, scrittura e cancellazione.
- **3.x**: token e database (che qui si chiama «bucket»); scrittura, SQL e InfluxQL. Flux e la cancellazione con filtro non ci sono.
- **1.8 e successivi**: utente e password (il token diventa `utente:password`), database nella forma `database/retention`; scrittura e Flux con le API di compatibilità, InfluxQL. La cancellazione con filtro non c'è.

### Errori comuni

Le pagine dei blocchi elencano gli errori propri di ogni blocco; questi li possono dare tutti:

| Messaggio | Quando |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** è vuoto. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa, o il riferimento viene da un altro programma. |
| Questa connessione è a …: questo blocco non la può usare | Il riferimento è di un altro tipo di database. |
| Troppe operazioni sul database: al massimo 600 al minuto | Quota al minuto finita (il numero è quello delle impostazioni). |
| Troppe connessioni aperte: al massimo 10 per utente | Hai già aperto il massimo di connessioni. |
| Il database non ha risposto in 31 s | L'operazione ha superato il tempo massimo (più un secondo). |
| Nessuna risposta da … in 30 secondi | Il server non ha risposto in tempo. |
| Risultato troppo grande (… KB, al massimo 4096 KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Risposta troppo grande (più di 4096 KB): chiedi meno dati | La risposta del server supera la dimensione massima. |
| InfluxDB ha risposto 401 (token o password non validi): … | Anche 400 (richiesta non valida), 403 (il token non ha il permesso), 404 (non trovato), 413 (richiesta troppo grande), 422 (dati non validi), 429 (troppe richieste), 503 (server non pronto); dopo i due punti c'è il messaggio del server. |
| Il server ha risposto con un reindirizzamento (301): controlla l'indirizzo del server | Il server ha risposto con un 3xx: i reindirizzamenti non si seguono. |
| Risposta non valida da … (non è JSON) | Il server ha risposto con un testo che non è JSON. |
| Richiesta interrotta: il programma si è fermato | Il programma si stava fermando. |
| Il programma non è in esecuzione | Si è provato ad aprire una connessione mentre il programma si fermava. |
| Indirizzo non permesso: … | L'indirizzo è tra quelli mai permessi, o è di questo computer o della rete locale e l'amministratore non lo permette. |
| Questo è il database di lilOS: i blocchi non possono usarlo | L'indirizzo è un database che lilOS usa per sé. |
| Server non trovato: … | Il nome del server non esiste. |
| Connessione rifiutata da … | Il server non accetta connessioni su quella porta. |
| Connessione chiusa da … | Il server ha chiuso la connessione. |
| … non è raggiungibile | La rete non arriva a quel server. |
| Il certificato di … è scaduto | Il certificato https è scaduto. |
| Il certificato di … non è valido (si può non controllarlo nelle impostazioni della connessione) | Il certificato non è valido per quel nome, o è autofirmato. |
| … non parla HTTPS (forse l'indirizzo è http://) | L'indirizzo è https ma il server parla http. |
| … non risponde in HTTP (forse l'indirizzo è https://) | L'indirizzo è http ma il server parla https. |
| Richiesta a … non riuscita: … | Altri problemi di rete, con la spiegazione tecnica. |

## Esempi completi

### 1. Registrare una temperatura ogni minuto

```
[Intervallo (setInterval): 60 s] impulso ──▶ esegui [InfluxDB · Scrivi punto (write)] fatto ──▶ valore [Print (console.log)]
[InfluxDB · Connessione (connect)] connessione ──▶ connessione [InfluxDB · Scrivi punto (write)]
[Campo numerico: temperatura] valore ──▶ campi [InfluxDB · Scrivi punto (write)]
```

Nelle impostazioni di Scrivi punto, **Misura** `ambiente` e **Tag** `{"stanza": "cucina"}`. Un numero solo diventa il campo `value`.

### 2. La media dell'ultima ora in una finestra

```
[InfluxDB · Connessione (connect)] connessione ──▶ connessione [InfluxDB · Query (Flux · InfluxQL · SQL)] righe ──▶ oggetto [Get proprietà (obj.campo): 0._value] valore ──▶ valore [Valore: media]
[Intervallo (setInterval): 300 s] impulso ──────────────────▶ esegui
```

Query Flux: `from(bucket: "casa") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "ambiente") |> mean()`.

## Limiti noti

- Non c'è la lettura in streaming: una query dà tutte le righe in una volta (fino al limite).
- Il client HTTP non segue i reindirizzamenti e non usa proxy.
- Flux non esiste in InfluxDB 3.x e SQL non esiste in 2.x e 1.x.

## Vedi anche

- [Blocchi database (SQL)](logicstudio-db), [Blocchi di base](logicstudio-core)
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
