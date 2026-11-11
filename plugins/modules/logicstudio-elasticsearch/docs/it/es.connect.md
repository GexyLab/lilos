# Elasticsearch · Connessione (connect)

`es.connect` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Apre una connessione a un cluster **Elasticsearch** (7 e 8) o **OpenSearch** (1 e 2) e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi Elasticsearch. La connessione si chiude con **chiudi** o quando il programma si ferma.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **connetti** (`connect`) | impulso | Qualsiasi valore che arriva qui apre la connessione (se questo blocco ne ha già una, la chiude prima). |
| **chiudi** (`close`) | impulso | Nascosta. Chiude la connessione. |
| **password / chiave API** (`password`) | testo | Nascosta. La password o la chiave API, se non vuoi tenerla nelle impostazioni. Se ha un valore non vuoto, prende il posto della **Password** delle impostazioni. **Non avvia il blocco**: tiene il valore per la prossima connessione. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **connessione** (`connection`) | oggetto | Il riferimento alla connessione aperta. Vale solo per questo programma. |
| **connesso** (`connected`) | sì/no | `true` quando la connessione è aperta, `false` quando viene chiusa con **chiudi**. |
| **informazioni sul server** (`info`) | oggetto | Nascosta. Com'è fatto il cluster: `{ "product": "Elasticsearch", "version": "8.13.0", "cluster": "mio-cluster", "node": "nodo-1", "uuid": "…", "url": "https://localhost:9200" }`. `product` è «Elasticsearch» o «OpenSearch». |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: cluster che non c'è, password sbagliata, indirizzo non permesso, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indirizzi dei nodi (URL, separati da virgole)** (`urls`) | testo | `https://localhost:9200` | Uno o più indirizzi `http://` o `https://` (al massimo 8), separati da virgole o spazi, senza utente e password. |
| **Accesso** (`auth`) | Utente e password, Chiave API, Nessuno | Utente e password | Come presentarsi al cluster. |
| **Utente** (`user`) | testo | `elastic` | L'utente, solo per «Utente e password». |
| **Password o chiave API (codificata)** (`password`) | campo password | vuoto | La password, o la chiave API già **codificata** (il testo `encoded` che Elasticsearch dà quando la crea). Quello che scrivi non si vede e viene cifrato dal motore (vedi sotto). |
| **Certificato (https)** (`tls`) | Controllato, Non controllato (cifrato comunque) | Controllato | Solo per `https://`. «Non controllato» accetta anche certificati scaduti o autofirmati: la connessione è cifrata ma non si è sicuri di parlare col server giusto. |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione e manda **connessione**, poi **connesso**, poi **informazioni sul server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova con le impostazioni di adesso.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, tutte le connessioni si chiudono.
- La connessione la fa il **kernel**, non il programma, e controlla gli indirizzi come spiegato in [Blocchi Elasticsearch](logicstudio-elasticsearch).

### I nodi

Con più indirizzi, il blocco usa il primo che risponde, e passa al successivo solo quando un nodo **non si può raggiungere** (connessione rifiutata, nome non trovato, rete non raggiungibile): in quel caso la richiesta non è arrivata al nodo, quindi si può ripetere altrove. Se la richiesta è arrivata e il nodo ha dato un errore, l'errore è mostrato e non si cambia nodo. Il nodo che ha funzionato resta quello in uso.

### Come controlla il server

Il blocco chiede la radice (`/`) del cluster e controlla che sia Elasticsearch o OpenSearch (da `version.number` e `version.distribution`). La connessione si apre anche se la password è sbagliata solo se il server lascia leggere la radice senza accesso; di solito un cluster con la sicurezza accesa dà 401 e la connessione fallisce subito.

### La password

L'impostazione **Password o chiave API** è cifrata dal motore per te, su questo lilOS: nello schema resta solo il testo cifrato. Un altro utente, o lo stesso schema su un altro lilOS, non la può aprire e riceve l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)»: la password va scritta di nuovo. Può anche arrivare dall'ingresso nascosto **password / chiave API**. Vedi [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Esempi

### 1. Un cluster con utente e password

Impostazioni: **Indirizzi** `https://es.esempio.it:9200`, **Accesso** Utente e password, **Utente** `elastic`, **Password** (scritta nel campo).

```
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione [Elasticsearch · Indici (_cat/indices)] nomi ──▶ valore [Print (console.log)]
[Pulsante: Elenca] premuto ──────────────────────────────────▶ esegui
```

### 2. Un cluster con la chiave API e due nodi

Impostazioni: **Indirizzi** `https://es1.esempio.it:9200, https://es2.esempio.it:9200`, **Accesso** Chiave API, **Password o chiave API** la chiave codificata.

```
[Elasticsearch · Connessione (connect)] connesso ──▶ valore [Valore: collegato]
                                        informazioni sul server ──▶ valore [Print (console.log)]
```

Se `es1` non risponde, il programma passa a `es2` da solo. Per vedere le informazioni sul server, mostra l'uscita nascosta con l'occhio.

## Errori

| Messaggio | Quando |
|---|---|
| L'amministratore non permette i database Elasticsearch e OpenSearch | Le due impostazioni **Permetti Elasticsearch** e **Permetti OpenSearch** del modulo sono spente. |
| L'amministratore non permette i database Elasticsearch / L'amministratore non permette i database OpenSearch | Il cluster è dell'altro tipo, e quel tipo non è permesso. |
| Manca l'indirizzo del server (URL) | Nessun indirizzo. |
| Troppi indirizzi (al massimo 8) | Più di 8 nodi. |
| Indirizzo del server non valido: … / Solo indirizzi http:// e https://: … | Un indirizzo non si può leggere o ha un altro protocollo. |
| Non scrivere utente e password nell'indirizzo: usa i campi delle impostazioni | Un indirizzo contiene `utente:password@`. |
| Manca l'utente | **Accesso** «Utente e password» senza utente. |
| Manca la chiave API: scrivila nelle impostazioni del blocco | **Accesso** Chiave API senza chiave. |
| Utente, password o chiave API non validi | La password ha un a capo, o l'utente ha un a capo o i due punti. |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS) | La password cifrata non si apre per questo utente o questo lilOS. |
| Questo motore di Logic Studio non sa aprire le password salvate: aggiornalo | Il motore è troppo vecchio. |
| Il server non sembra Elasticsearch né OpenSearch | La radice del server non ha la forma attesa. |
| Il server ha risposto 401 (utente, password o chiave API non validi): … | Il cluster rifiuta l'accesso (anche 403, 503…). |

Gli errori comuni a tutti i blocchi (rete, certificato, indirizzi, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Indicizza (index)](es.index), [Elasticsearch · Cerca (_search)](es.search), [Elasticsearch · Indici (_cat/indices)](es.indices)
- [Input (readline)](core.consoleRead), per chiedere la password
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
