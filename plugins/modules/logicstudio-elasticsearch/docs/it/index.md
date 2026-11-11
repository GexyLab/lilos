# Blocchi Elasticsearch

`logicstudio-elasticsearch` · richiede il motore `logicstudio-engine` e i [Blocchi di base](logicstudio-core)

I blocchi che fanno parlare un programma di Logic Studio con **Elasticsearch** (7 e 8) e **OpenSearch** (1 e 2): indicizzare, leggere, cercare, aggiornare, cancellare e contare documenti, elencare gli indici. OpenSearch usa la stessa API e funziona con gli stessi blocchi; è stato provato solo contro un server simulato, non contro un OpenSearch vero. Nell'elenco dei blocchi dell'IDE sono nella categoria **Database**. Per i database SQL vedi [Blocchi database (SQL)](logicstudio-db).

## Come si installa

Il pacchetto non arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore**, scheda **Kernel** («Blocchi Elasticsearch»). L'AppStore installa insieme anche il motore e i blocchi di base, se mancano. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE.

## I blocchi

| Blocco | Tipo | Cosa fa |
|---|---|---|
| [Elasticsearch · Connessione (connect)](es.connect) | `es.connect` | Apre la connessione al cluster e manda il riferimento da collegare agli altri blocchi. |
| [Elasticsearch · Indicizza (index)](es.index) | `es.index` | Aggiunge un documento a un indice, o sostituisce quello con quell'id. |
| [Elasticsearch · Leggi documento (get)](es.get) | `es.get` | Legge il documento con un id. |
| [Elasticsearch · Cerca (_search)](es.search) | `es.search` | Cerca in un indice con una query. Ogni ingresso aggiunto è un `match` campo = valore. |
| [Elasticsearch · Aggiorna (update)](es.update) | `es.update` | Cambia alcuni campi di un documento (o lo crea, con upsert). |
| [Elasticsearch · Elimina documento (delete)](es.delete) | `es.delete` | Cancella il documento con un id. |
| [Elasticsearch · Elimina per query (_delete_by_query)](es.deleteByQuery) | `es.deleteByQuery` | Cancella i documenti che una query trova. |
| [Elasticsearch · Conta (_count)](es.count) | `es.count` | Quanti documenti trova una query. |
| [Elasticsearch · Indici (_cat/indices)](es.indices) | `es.indices` | Gli indici del cluster, con documenti, stato e dimensione. |
| [Elasticsearch · Indicizza in blocco (_bulk)](es.bulk) | `es.bulk` | Indicizza una lista di documenti con una sola richiesta. |

## Da sapere

### Le richieste partono dal kernel

Elasticsearch parla HTTP. Le richieste non partono dal tuo browser né dal programma, ma dal **kernel**, cioè dal computer su cui gira lilOS, a nome dell'utente che possiede il programma. Per questo:

- funziona anche quando lilOS è chiuso nel browser, se il programma è attivo;
- il programma non vede mai la password né un collegamento di rete: tiene solo un **riferimento**;
- un programma attivo scrive e cancella davvero sul cluster, anche quando non guardi: provalo prima con **Prova**, soprattutto con i blocchi che scrivono e cancellano;
- non servono librerie esterne: il modulo ha un piccolo client HTTP suo.

### Il riferimento alla connessione (handle)

L'uscita **connessione** del blocco [Elasticsearch · Connessione (connect)](es.connect) è un piccolo oggetto che contiene solo un codice casuale, il tipo di database (Elasticsearch od OpenSearch) e il nome del server. Si porta con un [collegamento](ide/blocks) all'ingresso **connessione** degli altri blocchi. Vale solo per il programma che l'ha aperta (copiata in un altro programma non funziona) e si chiude con **chiudi** o quando il programma si ferma.

### Cifrato o no: http e https

Se la cifratura c'è lo decidono gli indirizzi dei nodi: `https://…` è cifrato, `http://…` no (password e dati viaggiano in chiaro: va bene solo su una rete di cui ti fidi). Con `https` il certificato è **controllato** di serie; la scelta «Non controllato (cifrato comunque)» serve per i certificati autofirmati, come quelli che Elasticsearch 8 crea da solo. Nell'indirizzo non si scrivono utente e password: ci sono i campi apposta.

### Gli indirizzi permessi

Il nome del server viene risolto e **ogni** indirizzo che ha viene controllato prima di collegarsi; poi la connessione va proprio all'indirizzo controllato (un nome non può essere spostato su un indirizzo vietato tra il controllo e la connessione). Il kernel non segue mai i reindirizzamenti: se il server risponde con un 3xx è un errore.

- **Mai permessi**, nemmeno dall'amministratore: gli indirizzi «link-local» `169.254.x.x` e `fe80::…` (lì molti cloud tengono i dati segreti della macchina), i multicast, `0.x.x.x`, `255.255.255.255` e `::`.
- **Bloccati se l'amministratore non li permette**: questo computer (`localhost`, `127.x.x.x`, `::1`), le reti locali (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`) e gli altri indirizzi non pubblici. Per permetterli un amministratore spunta **Permetti i database su questo computer e sulla rete locale** nelle impostazioni del modulo. Un cluster sul proprio computer (l'indirizzo di serie è `https://localhost:9200`) va quindi permesso così.
- **I database di lilOS** (gli indirizzi che il kernel usa per sé nella sua configurazione) non si possono aprire mai, nemmeno con il permesso: «Questo è il database di lilOS: i blocchi non possono usarlo».

### La password e la chiave API

L'impostazione **Password o chiave API (codificata)** del blocco di connessione è un campo fatto apposta: quello che scrivi non si vede e non torna mai indietro. Il motore lo **cifra** per te, su questo lilOS, e nello schema resta solo il testo cifrato. Quindi:

- chi apre lo schema (o un file del progetto) non vede la password;
- un altro utente, o lo stesso schema su un altro lilOS, **non la può aprire**: la connessione dà l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)», e la password va scritta di nuovo;
- la password può anche arrivare dall'ingresso nascosto **password / chiave API**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**: in quel caso non viene salvata da nessuna parte. Un valore non vuoto sull'ingresso vince su quello delle impostazioni;
- la password e la chiave API non finiscono mai nei registri né nei messaggi d'errore, anche se il server le ripete (al loro posto ci sono tre pallini).

### Impostazioni del modulo

Le cambia un amministratore, nelle impostazioni del modulo `logicstudio-elasticsearch`, e valgono subito, dall'operazione successiva:

| Impostazione | Predefinito | Valori | Cosa fa |
|---|---|---|---|
| **Permetti i database su questo computer e sulla rete locale** | no | sì / no | Permette `localhost` e le reti locali. Link-local e multicast restano vietati. |
| **Tempo massimo di un'operazione (secondi)** | 30 | da 1 a 600 | Quanto può durare una richiesta, risposta compresa. |
| **Documenti di un risultato (e di un blocco di documenti), al massimo** | 10000 | da 1 a 1000000 | I documenti di una ricerca, di un elenco di indici e di un _bulk. Cerca ne dà al massimo tanti (**troncato** dice se ce n'erano di più). |
| **Dimensione massima di un risultato (KB)** | 4096 | da 16 a 65536 | Quanto può essere grande una risposta (e un risultato). |
| **Connessioni aperte per utente, al massimo** | 10 | da 1 a 100 | Quante connessioni può tenere aperte un utente, con tutti i suoi programmi. |
| **Operazioni al minuto per utente, al massimo** | 600 | da 1 a 100000 | Quante operazioni (compresa ogni connessione) può fare un utente in un minuto. |
| **Permetti Elasticsearch** | sì | sì / no | Se non è spuntata, nessuno può collegarsi a un Elasticsearch. |
| **Permetti OpenSearch** | sì | sì / no | Se non è spuntata, nessuno può collegarsi a un OpenSearch. |

### Quote e limiti

| Cosa | Limite |
|---|---|
| Documenti di un risultato, di un _bulk, indici elencati | 10000 di serie (impostazione del modulo) |
| Dimensione di un risultato | 4096 KB di serie |
| Tempo di un'operazione | 30 secondi di serie |
| Operazioni al minuto, per utente | 600 di serie |
| Connessioni aperte, per utente | 10 di serie |
| Nodi nell'indirizzo della connessione | 8 |
| Indici in una ricerca o in un conteggio | 64 |
| Nome di un indice | 255 byte |
| Id di un documento | 512 byte |
| Ingressi aggiunti (campi della ricerca) | 16 (meno se il limite generale del motore è più basso: vedi [Limiti](logicstudio-engine/limits)) |
| Tempo massimo di un blocco | 30 secondi di serie (Pannello di controllo → Logic Studio → **Limiti**): vale anche se il tempo dell'operazione è più lungo |

### I nomi degli indici e gli id

I nomi degli indici sono controllati: solo lettere minuscole, niente `\ / * ? " < > | , # :` né spazi, non cominciano con `-`, `_` o `+`. Il nome e l'id sono scritti codificati nell'indirizzo: un nome strano non può raggiungere un'altra API del cluster. Un id può avere qualsiasi carattere, fino a 512 byte.

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
| Elasticsearch ha risposto 401 (utente, password o chiave API non validi): … | Anche 400 (richiesta non valida), 403 (permesso negato), 404 (non trovato), 409 (conflitto: il documento c'è già o è cambiato), 413 (richiesta troppo grande), 429 (troppe richieste), 503 (cluster non pronto); con OpenSearch il nome è «OpenSearch»; dopo i due punti c'è il motivo dato dal server. |
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

### 1. Un registro di eventi che si può cercare

```
[Pulsante: Segnala] premuto ──▶ esegui [Elasticsearch · Indicizza (index)] id ──▶ valore [Print (console.log)]
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione
[Oggetto { }] oggetto ──▶ documento
```

[Oggetto { }](core.compose) prepara `{ "messaggio": "Porta aperta", "livello": "avviso" }`; il documento va nell'indice `eventi`.

### 2. Cercare per testo e vedere i risultati

```
[Campo di testo: cerca] testo ──▶ messaggio [Elasticsearch · Cerca (_search)] documenti ──▶ righe [Tabella]
[Pulsante: Cerca] premuto ──▶ esegui
```

Un ingresso aggiunto, rinominato `messaggio`, è un `match` sul campo `messaggio`.

## Limiti noti

- Una ricerca dà al massimo le righe massime del modulo (10000 di serie): per leggere di più serve un'altra strategia (per esempio ordinare e ripartire da un valore).
- Il client HTTP non segue i reindirizzamenti e non usa proxy.
- Non ci sono scroll, point in time né ricerche asincrone.

## Vedi anche

- [Blocchi database (SQL)](logicstudio-db), [Blocchi di base](logicstudio-core)
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
