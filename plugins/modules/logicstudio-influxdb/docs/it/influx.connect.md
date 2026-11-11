# InfluxDB · Connessione (connect)

`influx.connect` · Database · [Blocchi InfluxDB](logicstudio-influxdb) · versione 1

Apre una connessione a un server **InfluxDB** (2.x, 3.x, 1.8 e successivi) e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi InfluxDB. La connessione si chiude con **chiudi** o quando il programma si ferma.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **connetti** (`connect`) | impulso | Qualsiasi valore che arriva qui apre la connessione (se questo blocco ne ha già una, la chiude prima). |
| **chiudi** (`close`) | impulso | Nascosta. Chiude la connessione. |
| **token / password** (`password`) | testo | Nascosta. Il token (o la password per 1.x), se non vuoi tenerlo nelle impostazioni. Se ha un valore non vuoto, prende il posto del **Token** delle impostazioni. **Non avvia il blocco**: tiene il valore per la prossima connessione. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **connessione** (`connection`) | oggetto | Il riferimento alla connessione aperta. Vale solo per questo programma. |
| **connesso** (`connected`) | sì/no | `true` quando la connessione è aperta, `false` quando viene chiusa con **chiudi**. |
| **informazioni sul server** (`info`) | oggetto | Nascosta. Com'è fatto il server: `{ "version": "2.7.10", "major": 2, "build": "OSS", "url": "http://localhost:8086", "org": "casa", "bucket": "sensori" }`. `major` è `null` se la versione non si capisce. |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: server che non c'è, token sbagliato, indirizzo non permesso, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indirizzo del server (URL)** (`url`) | testo | `http://localhost:8086` | L'indirizzo di InfluxDB, `http://` o `https://`, senza utente e password. Un eventuale percorso resta (`https://esempio.it/influx`); la parte dopo `?` e `#` si toglie. |
| **Organizzazione (2.x)** (`org`) | testo | vuoto | L'organizzazione di InfluxDB 2. Con 3.x e 1.x si lascia vuota. |
| **Bucket (o database; 1.x: database/retention)** (`bucket`) | testo | vuoto | Il bucket di serie degli altri blocchi (che possono averne uno loro). Con 3.x è il database; con 1.x si scrive `database/retention`. |
| **Accesso** (`auth`) | Token (2.x, 3.x), Utente e password (1.x), Nessuno | Token | Come presentarsi al server. Con «Utente e password» il token diventa `utente:password`. |
| **Utente (1.x)** (`user`) | testo | vuoto | L'utente, solo per «Utente e password». |
| **Token (password per 1.x)** (`password`) | campo password | vuoto | Il token (o la password di 1.x). Quello che scrivi non si vede e viene cifrato dal motore (vedi sotto). |
| **Certificato (https)** (`tls`) | Controllato, Non controllato (cifrato comunque) | Controllato | Solo per `https://`. «Non controllato» accetta anche certificati scaduti o autofirmati: la connessione è cifrata ma non si è sicuri di parlare col server giusto. |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione e manda **connessione**, poi **connesso**, poi **informazioni sul server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova con le impostazioni di adesso.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, tutte le connessioni si chiudono.
- La connessione la fa il **kernel**, non il programma, e controlla gli indirizzi come spiegato in [Blocchi InfluxDB](logicstudio-influxdb).

### Come controlla il server

Il blocco chiede `/ping` (e, se serve, `/health`) e legge la versione dalle intestazioni o dalla risposta. Con la versione 2 prova anche a leggere l'elenco dei bucket, così un token sbagliato dà subito errore (`/ping` non chiede il token). Con la 3 il token serve già per `/ping`. Quindi la connessione riesce solo se il server risponde e, dove si può controllare, il token è valido; non si controlla però che il bucket esista.

### Il token

L'impostazione **Token** è cifrata dal motore per te, su questo lilOS: nello schema resta solo il testo cifrato. Un altro utente, o lo stesso schema su un altro lilOS, non lo può aprire e riceve l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)»: il token va scritto di nuovo. Può anche arrivare dall'ingresso nascosto **token / password**. Vedi [Blocchi InfluxDB](logicstudio-influxdb).

## Esempi

### 1. Connessione a InfluxDB 2 sul proprio server

Impostazioni: **Indirizzo** `https://influx.esempio.it`, **Organizzazione** `casa`, **Bucket** `sensori`, **Accesso** Token, **Token** (scritto nel campo).

```
[InfluxDB · Connessione (connect)] connessione ──▶ connessione [InfluxDB · Bucket (elenco)] nomi ──▶ valore [Print (console.log)]
[Pulsante: Elenca] premuto ──────────────────────────────────▶ esegui
```

Il programma si collega all'avvio; il pulsante scrive nella console i nomi dei bucket.

### 2. Il token chiesto all'avvio

Togli la spunta da **Connetti all'avvio** e lascia vuoto il token.

```
[Input (readline): "Token?"] testo ──▶ token / password [InfluxDB · Connessione (connect)]
[Pulsante: Collega] premuto ──▶ connetti
```

Con **Nascondi quello che si scrive** su [Input (readline)](core.consoleRead) il token non viene salvato da nessuna parte. Dopo la connessione, l'ingresso **token / password** tiene il valore per le riconnessioni.

## Errori

| Messaggio | Quando |
|---|---|
| L'amministratore non permette i database InfluxDB | L'impostazione **Permetti InfluxDB** del modulo è spenta. |
| Manca l'indirizzo del server (URL) | L'indirizzo è vuoto. |
| Indirizzo del server troppo lungo | L'indirizzo ha più di 2048 caratteri. |
| Indirizzo del server non valido: … | L'indirizzo non si può leggere. |
| Solo indirizzi http:// e https://: … | L'indirizzo ha un altro protocollo. |
| Non scrivere utente e password nell'indirizzo: usa i campi delle impostazioni | L'indirizzo contiene `utente:password@`. |
| Manca il server nell'indirizzo | L'indirizzo non ha il nome del server. |
| L'organizzazione non valido: … / Il bucket non valido: … | Il nome ha più di 255 caratteri o caratteri di controllo. |
| Manca l'utente (InfluxDB 1.x) | **Accesso** «Utente e password» senza **Utente**. |
| Manca il token: scrivilo nelle impostazioni del blocco (o scegli «Nessuna» come accesso) | **Accesso** Token senza token. |
| Utente o token non validi | Il token ha un a capo, o l'utente ha un a capo o i due punti. |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS) | Il token cifrato non si apre per questo utente o questo lilOS. |
| Questo motore di Logic Studio non sa aprire le password salvate: aggiornalo | Il motore è troppo vecchio. |
| InfluxDB ha risposto 401 (token o password non validi): … | Il server rifiuta il token (anche 403, 404, 503…). |

Gli errori comuni a tutti i blocchi (rete, certificato, indirizzi, quote) sono nella pagina [Blocchi InfluxDB](logicstudio-influxdb).

## Vedi anche

- [InfluxDB · Scrivi punto (write)](influx.write), [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query), [InfluxDB · Bucket (elenco)](influx.buckets), [InfluxDB · Elimina dati (delete)](influx.delete)
- [Input (readline)](core.consoleRead), per chiedere il token
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
