# Redis · Connessione (connect)

`redis.connect` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Apre una connessione a un server **Redis** e manda il riferimento, che va collegato all'ingresso **connessione** degli altri blocchi Redis. Funziona anche con i servizi che parlano il protocollo Redis (per esempio Redis Cloud).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **connetti** (`connect`) | impulso | Qualsiasi valore che arriva qui apre la connessione (se questo blocco ne ha già una, la chiude prima). |
| **chiudi** (`close`) | impulso | Nascosta. Chiude la connessione. |
| **password** (`password`) | testo | Nascosta. La password, se non vuoi tenerla nelle impostazioni. Se ha un valore non vuoto, prende il posto della **Password** delle impostazioni. **Non avvia il blocco**: tiene il valore per la prossima connessione. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **connessione** (`connection`) | oggetto | Il riferimento alla connessione aperta. Vale solo per questo programma. |
| **connesso** (`connected`) | sì/no | `true` quando la connessione è aperta, `false` quando viene chiusa con **chiudi**. |
| **server** (`info`) | oggetto | Nascosta. Com'è fatto il server: `{ "server": "redis.esempio.it:6379/0", "version": "7.2.4", "mode": "standalone", "database": 0 }`. |
| **Exception** (`error`) | oggetto | Quando la connessione non riesce: server che non c'è, password sbagliata, indirizzo non permesso, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Server** (`host`) | testo | vuoto | Il computer del database: un nome (`redis.esempio.it`) o un indirizzo (`192.168.1.20`). |
| **Porta** (`port`) | da 1 a 65535 | 6379 | La porta di Redis. |
| **Numero del database (SELECT)** (`db`) | da 0 a 10000 | 0 | Il database numerato di Redis a cui collegarsi (di solito da 0 a 15). Il server può averne meno. |
| **Utente (ACL, vuoto = default)** (`user`) | testo | vuoto | L'utente ACL (Redis 6 o successivo). Vuoto: l'utente `default`, con solo la password. |
| **Password** (`password`) | campo password | vuota | La password. Quello che scrivi non si vede e viene cifrato dal motore (vedi sotto). |
| **Cifratura (TLS)** (`tls`) | Sì, con il certificato controllato; Sì, senza controllare il certificato; No | Sì, con il certificato controllato | Se e come cifrare la connessione. Vedi sotto. |
| **Connetti all'avvio** (`atStart`) | sì / no | sì | Se è spuntato, il blocco si collega appena il programma parte. Se no, solo con **connetti**. |

## Come funziona

- **All'avvio del programma**, se **Connetti all'avvio** è spuntato, il blocco apre la connessione e manda **connessione**, poi **connesso**, poi **server**. Altrimenti la connessione si apre solo con **connetti**.
- Con **connetti** il blocco chiude la connessione che aveva già (il suo vecchio riferimento smette di funzionare) e ne apre una nuova con le impostazioni di adesso.
- Con **chiudi** il blocco chiude la connessione e manda `connesso = false`.
- Quando il programma si ferma, tutte le connessioni (e le iscrizioni che hanno dentro) si chiudono.
- La connessione la fa il **kernel**, non il programma: il programma non vede mai la password né un collegamento di rete, solo il riferimento. Vedi [Blocchi Redis](logicstudio-redis).
- Il nome del server viene risolto e ogni indirizzo controllato; la connessione va proprio all'indirizzo controllato (con TLS il certificato è controllato sul nome del server). **Niente Sentinel né Cluster**: manderebbero il programma ad altri indirizzi, non controllati.
- Gli errori del server arrivano su **Exception** in una riga, senza la password (al suo posto ci sono tre pallini).
- Se la rete cade, il blocco prova a ricollegarsi fino a 3 volte; poi i comandi dicono «Connessione a Redis chiusa: riaprila con il blocco di connessione» e serve **connetti**.
- Le iscrizioni di [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) e le attese di [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop) usano connessioni in più, ognuna con le stesse impostazioni: contano nel limite delle connessioni aperte per utente.

### La password

L'impostazione **Password** è cifrata dal motore (AES-GCM) per te, su questo lilOS: nello schema resta solo il testo cifrato. Un altro utente, o lo stesso schema su un altro lilOS, non la può aprire e riceve l'errore «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)»: la password va scritta di nuovo. Può anche arrivare dall'ingresso nascosto **password**, per esempio da [Input (readline)](core.consoleRead) con **Nascondi quello che si scrive**; un valore non vuoto sull'ingresso vince su quello delle impostazioni.

### La cifratura (TLS)

| Scelta | Cosa vuol dire |
|---|---|
| **Sì, con il certificato controllato** | Cifrata, e il certificato (catena e nome del server) deve essere valido. È la scelta di partenza, e quella giusta per un server su internet (Redis Cloud, ElastiCache con TLS). |
| **Sì, senza controllare il certificato** | Cifrata, ma il certificato non viene controllato: protegge da chi ascolta, non da chi si finge il server. Per i server con un certificato autofirmato. |
| **No** | Niente cifratura: password e dati viaggiano in chiaro. Va bene solo su una rete di cui ti fidi, per esempio un Redis sul tuo computer (che l'amministratore deve aver permesso). |

Un Redis installato in casa senza TLS richiede quindi **No**: con la scelta di partenza la connessione fallisce.

## Esempi

### 1. Collegarsi a un Redis locale

Impostazioni: **Server** `127.0.0.1`, **Porta** 6379, **Cifratura (TLS)** «No». Un amministratore deve aver spuntato **Permetti i database su questo computer e sulla rete locale** nelle impostazioni del modulo.

```
[Redis · Connessione (connect)] connessione ──▶ connessione [Redis · Leggi (GET): contatore] valore ──▶ valore [Valore]
                                connesso ──▶ esegui
```

Appena la connessione è pronta, **connesso** fa partire [Redis · Leggi (GET)](redis.get) e il [Valore](ui.value) mostra il contenuto di `contatore`.

### 2. Redis Cloud con utente e password

**Server** `redis-12345.c1.eu-west-1.ec2.cloud.redislabs.com`, **Porta** 12345, **Utente** `default`, **Password** scritta nel campo, **Cifratura (TLS)** di partenza.

```
[Redis · Connessione (connect)] connessione ──▶ connessione [Redis · Scrivi (SET): avvio] ok ──▶ valore [Print (console.log)]
                                connesso ──▶ esegui
                                Exception ──▶ valore [Print (console.log)]
```

Se la password è sbagliata, **Exception** scrive «Accesso negato: utente o password non validi».

### 3. La password chiesta a chi usa il programma

Togli la spunta da **Connetti all'avvio** e lascia vuota la **Password**.

```
[Input (readline): "Password?", Nascondi quello che si scrive] valore ──▶ password [Redis · Connessione (connect)] connessione ──▶ connessione [Redis · Cerca chiavi (SCAN)] chiavi ──▶ valore [Print (console.log)]
[Pulsante: Connetti] premuto ───────────────────────────────────────────▶ connetti                          connesso ──▶ esegui
```

La password arriva sull'ingresso nascosto, che la tiene senza avviare il blocco; il [Pulsante](ui.button) apre la connessione.

## Errori

Gli errori di rete e di quota più comuni (indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe connessioni, password non leggibile…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca il server | **Server** è vuoto. |
| Nome del server non valido: … | Il nome è più lungo di 253 caratteri o contiene spazi, `/`, `\` o `@`. |
| Server sconosciuto: … / Server non raggiungibile: … (…) | Il nome non esiste o la rete non arriva al server. |
| Porta non valida: … | **Porta** non è un numero intero tra 1 e 65535. |
| Numero del database non valido: … | **Numero del database** non è un numero intero tra 0 e 10000. |
| Nome utente troppo lungo | **Utente** supera 200 caratteri. |
| Indirizzo non permesso: … | L'indirizzo è vietato (rete locale senza il permesso dell'amministratore, link-local, multicast). |
| L'amministratore non permette i database Redis | Redis è disattivato nelle impostazioni del modulo logicstudio-redis. |
| Accesso negato: utente o password non validi | Il server rifiuta l'utente o la password, o ne vuole una e non c'è. |
| Permesso negato dal database: … | L'utente ACL non può usare un comando o una chiave. |
| Connessione rifiutata dal server Redis | Il server non accetta connessioni su quella porta (spento, porta sbagliata). |
| Connessione a Redis chiusa: riaprila con il blocco di connessione | La connessione è caduta e non si è riaperta (o la cifratura TLS non va d'accordo con il server). |
| Redis non ha risposto in 30 s | Il server non ha risposto entro il tempo massimo di un'operazione. |
| ERR DB index is out of range | Il server non ha quel **Numero del database** (messaggio del server, in inglese). |

## Vedi anche

- [Redis · Leggi (GET)](redis.get), [Redis · Scrivi (SET)](redis.set), [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe), [Redis · Comando (call)](redis.command)
- [Blocchi Redis](logicstudio-redis), per gli indirizzi, i limiti, le quote e le impostazioni del modulo
- [Blocchi database (SQL)](logicstudio-db), per i database SQL; [Blocchi MongoDB](logicstudio-mongodb)
- [Input (readline)](core.consoleRead), per chiedere la password a chi usa il programma
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
