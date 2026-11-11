# logicstudio-influxdb

I **blocchi InfluxDB** di Logic Studio, per InfluxDB **2.x** (e Cloud), **3.x** (Core, Enterprise, Cloud) e **1.8+** (con le API di compatibilità v2). InfluxDB parla HTTP: nessuna libreria npm, un piccolo client HTTP nel modulo (`lib/http.js`).

- **Connessione InfluxDB (connect)**: indirizzo del server (URL `http://` o `https://`), organizzazione (2.x), bucket predefinito, accesso con **token** (2.x, 3.x), con **utente e password** (1.x: il token diventa `utente:password`) o senza, certificato controllato o no (solo https), «Connetti all'avvio». Controlla il server con `/ping` (o `/health`) e dà nell'uscita nascosta **informazioni** la versione. L'uscita **connessione** va collegata all'ingresso **connessione** degli altri blocchi; la connessione si chiude con **chiudi** o quando il programma si ferma. Il token si scrive nelle impostazioni (custodito cifrato dal motore) o arriva dall'ingresso nascosto **token / password**.
- **Scrivi punto (write)**: scrive un punto in line protocol (`POST /api/v2/write`): **misura**, **campi** (un oggetto; un numero solo diventa il campo `value`), **tag** (un oggetto JSON nelle impostazioni o dall'ingresso, più gli **ingressi aggiunti**, ognuno un tag con il suo nome), **tempo** (data ISO o millisecondi; vuoto = l'ora del server), precisione (ns, us, ms, s). L'ingresso nascosto **punti** prende una lista di punti `{ measurement, tags, fields, time }` scritti con una sola richiesta. I numeri sono float; con «Numeri interi come integer» i numeri interi vanno come `i`.
- **Query (Flux · InfluxQL · SQL)**: con il **Linguaggio** Flux (2.x: `POST /api/v2/query`, il CSV annotato diventa una lista di righe, tutte le tabelle), InfluxQL (`/query`, l'API v1: il bucket fa da database) o SQL (3.x: `/api/v3/query_sql`). Esce la lista delle **righe** (oggetti colonna → valore, nei loro tipi). Ogni ingresso aggiunto è un **parametro**: `params.nome` in Flux, `$nome` in InfluxQL e SQL (mai incollato nel testo della query).
- **Bucket (elenco)**: i bucket che il token vede (i database con 1.x e 3.x).
- **Elimina dati (delete)**: cancella i punti di un intervallo (inizio, fine) che rispettano un **filtro** (predicate, per esempio `_measurement="cpu" AND host="a"`); senza filtro solo con la casella «Tutti i dati dell'intervallo». Solo InfluxDB 2.

Gli ingressi aggiunti tengono solo il loro valore: il blocco parte con **esegui**.

Sicurezza:

- il lavoro lo fa il kernel (azioni `influx.*`): il worker del programma non tiene mai il token né una connessione;
- i server su questo computer, sulla rete locale e sugli altri indirizzi non pubblici sono **bloccati**, a meno che l'amministratore non li permetta nelle impostazioni del modulo («Permetti i database su questo computer e sulla rete locale»); link-local (i metadati dei cloud), multicast e «questa rete» mai; i database che lilOS stesso usa (gli indirizzi nella configurazione del kernel) mai, nemmeno con il permesso;
- il nome del server è risolto e ogni indirizzo controllato, e la connessione va proprio all'indirizzo controllato (niente DNS rebinding); nessun reindirizzamento seguito;
- con https il certificato è controllato, a meno di scegliere «Non controllato»;
- una connessione vale solo per il programma che l'ha aperta, e si chiude quando il programma si ferma;
- il token e la password non vanno mai nei registri né negli errori (anche se il server li ripete).

Limiti (impostazioni del modulo): tempo massimo di un'operazione (30 secondi), righe di un risultato e punti di una scrittura (10000; il risultato dice **troncato** quando ne ha di più), dimensione di un risultato (4096 KB), connessioni aperte per utente (10), operazioni al minuto per utente (600); l'amministratore può anche non permettere InfluxDB.

Richiede il motore `logicstudio-engine`.
