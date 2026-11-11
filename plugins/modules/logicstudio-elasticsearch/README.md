# logicstudio-elasticsearch

I **blocchi Elasticsearch** di Logic Studio, per **Elasticsearch 7 e 8** e **OpenSearch 1 e 2**. Elasticsearch parla HTTP: nessuna libreria npm, un piccolo client HTTP nel modulo (`lib/http.js`).

- **Connessione Elasticsearch (connect)**: gli indirizzi dei nodi (uno o più URL `http://` o `https://`, separati da virgole: si usa il primo che risponde, i successivi quando uno non è raggiungibile), l'accesso (**utente e password**, **chiave API** codificata o nessuno), certificato controllato o no (solo https), «Connetti all'avvio». Dà nell'uscita nascosta **informazioni** il prodotto (Elasticsearch o OpenSearch), la versione e il cluster. L'uscita **connessione** va collegata all'ingresso **connessione** degli altri blocchi; la connessione si chiude con **chiudi** o quando il programma si ferma. La password (o la chiave API) si scrive nelle impostazioni (custodita cifrata dal motore) o arriva dall'ingresso nascosto **password / chiave API**.
- **Indicizza (index)**: aggiunge un **documento** a un indice, con un **id** o con uno automatico; con «Solo se non c'è già» un id esistente è un errore.
- **Leggi documento (get)**: il documento con un id, e **trovato**.
- **Cerca (_search)**: una query in Query DSL (JSON; vuota = tutti) o un corpo intero (`{ "query": …, "aggs": … }`); ogni **ingresso aggiunto** è un `match` campo = valore (una lista diventa `terms`), in AND con la query; **quanti** (size, al massimo il limite di righe del modulo), **da** (from), **ordine** (`data:desc, nome` o JSON). Escono i **documenti** (il `_source` con `_id`), il **totale** e, nascoste, le **aggregazioni** e **troncato**. L'indice può essere una lista (`a, b`).
- **Aggiorna (update)**: cambia alcuni campi del documento con un id; con «Crealo se non c'è» lo aggiunge (upsert).
- **Elimina documento (delete)**: cancella il documento con un id (**trovato** dice se c'era).
- **Elimina per query (_delete_by_query)**: cancella i documenti che la query trova; una query vuota o che prende tutto (`match_all`) è rifiutata, a meno della casella «Tutti i documenti».
- **Conta (_count)**: quanti documenti trova una query (con gli stessi ingressi aggiunti di Cerca).
- **Indici (_cat/indices)**: gli indici del cluster, con documenti, stato e dimensione.
- **Indicizza in blocco (_bulk)**: una lista di documenti con una sola richiesta; l'id di ognuno da un suo campo, se lo indichi; escono gli **indicizzati** e, nascosti, gli **errori** e quali **non riusciti**.

Per i blocchi che scrivono, «Visibile alle ricerche» sceglie se aspettare che il documento si veda nelle ricerche (refresh `wait_for` o subito).

Gli ingressi aggiunti tengono solo il loro valore: il blocco parte con **esegui**.

Sicurezza:

- il lavoro lo fa il kernel (azioni `es.*`): il worker del programma non tiene mai la password né una connessione;
- i server su questo computer, sulla rete locale e sugli altri indirizzi non pubblici sono **bloccati**, a meno che l'amministratore non li permetta nelle impostazioni del modulo («Permetti i database su questo computer e sulla rete locale»); link-local (i metadati dei cloud), multicast e «questa rete» mai; i database che lilOS stesso usa (gli indirizzi nella configurazione del kernel) mai, nemmeno con il permesso;
- il nome del server è risolto e ogni indirizzo controllato, e la connessione va proprio all'indirizzo controllato (niente DNS rebinding); nessun reindirizzamento seguito;
- i nomi degli indici sono controllati (minuscole; niente `\ / * ? " < > | , # :` né spazi; non cominciano con `- _ +`) e, come gli id, scritti codificati nell'indirizzo: un nome non può raggiungere un'altra API;
- con https il certificato è controllato, a meno di scegliere «Non controllato»;
- una connessione vale solo per il programma che l'ha aperta, e si chiude quando il programma si ferma;
- la password e la chiave API non vanno mai nei registri né negli errori (anche se il server le ripete).

Limiti (impostazioni del modulo): tempo massimo di un'operazione (30 secondi), documenti di un risultato e di un blocco di documenti (10000), dimensione di un risultato (4096 KB), connessioni aperte per utente (10), operazioni al minuto per utente (600); l'amministratore può anche non permettere Elasticsearch o OpenSearch.

Richiede il motore `logicstudio-engine`.
