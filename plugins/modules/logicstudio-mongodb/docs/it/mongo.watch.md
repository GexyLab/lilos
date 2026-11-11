# MongoDB · Osserva modifiche (watch)

`mongo.watch` · Database · [Blocchi MongoDB](logicstudio-mongodb) · versione 1

Manda ogni **modifica** di una raccolta (o di tutto il database) appena avviene: un inserimento, un aggiornamento, una sostituzione, un'eliminazione. Serve un replica set o un cluster di MongoDB. Il blocco resta in ascolto finché il programma gira.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **ascolta** (`listen`) | impulso | Qualsiasi valore che arriva qui inizia ad ascoltare (se il blocco ascoltava già, riparte da capo). |
| **smetti** (`stop`) | impulso | Nascosta. Smette di ascoltare. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [MongoDB · Connessione (MongoClient)](mongo.connect). **Avvia il blocco**: con **Ascolta appena arriva la connessione** spuntato, quando arriva la connessione inizia ad ascoltare. |
| **raccolta** (`collection`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto della **Raccolta (collection)** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **documento** (`document`) | oggetto | Il documento della modifica, intero (con **Documento intero anche per gli aggiornamenti**). Per le eliminazioni è `null`. |
| **operazione** (`operation`) | testo | Che modifica è: `insert`, `update`, `replace` o `delete` (e, con **Tutte**, anche altre, come `drop` o `invalidate`). |
| **chiave (_id)** (`key`) | oggetto | Nascosta. La chiave del documento: `{"_id": {"$oid": "…"}}`. |
| **modifica** (`change`) | oggetto | Nascosta. La modifica completa come la manda MongoDB (`operationType`, `ns`, `documentKey`, `updateDescription` con i campi cambiati…). |
| **in ascolto** (`listening`) | sì/no | Nascosta. `true` quando il blocco ha iniziato ad ascoltare, `false` quando smette (con **smetti**, per un errore o perché la connessione si è chiusa). |
| **perse** (`dropped`) | numero | Nascosta. Quante modifiche sono andate perse perché il programma non le leggeva abbastanza in fretta (vedi sotto). |
| **Exception** (`error`) | oggetto | Quando l'ascolto non parte o si interrompe: connessione mancante o chiusa, server singolo, pipeline non valida, troppe osservazioni, errore del server… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Raccolta (vuoto = tutto il database)** (`collection`) | testo | vuoto | La raccolta da osservare. Vuoto: tutte le raccolte del database della connessione. L'ingresso **raccolta** (se ha un valore) prende il suo posto; un valore su **raccolta** non fa ripartire l'ascolto. |
| **Modifiche** (`operation`) | Tutte, Inserimenti (insert), Aggiornamenti (update, replace), Eliminazioni (delete) | Tutte | Quali modifiche far uscire. |
| **Altri passi (lista JSON, per esempio [{"$match": {"fullDocument.stato": "nuovo"}}])** (`pipeline`) | JSON | vuoto | Passi di aggregazione in più, applicati dopo la scelta di **Modifiche**: per esempio `$match` su `fullDocument.campo`. |
| **Documento intero anche per gli aggiornamenti (updateLookup)** (`fullDocument`) | sì / no | sì | Per gli aggiornamenti il server aggiunge il documento intero com'è adesso. Senza, **documento** per un aggiornamento è `null` (si vede solo **modifica**). |
| **Ascolta appena arriva la connessione** (`auto`) | sì / no | sì | Se è spuntato, quando arriva la connessione il blocco inizia ad ascoltare. Se no, solo con **ascolta**. |

## Come funziona

- **Si parte** con **ascolta**, oppure (con **Ascolta appena arriva la connessione**) quando arriva la **connessione**: il blocco chiede a MongoDB un *change stream* sulla raccolta o sul database, e manda `in ascolto = true` quando il server ha risposto.
- **Ogni modifica** esce con quattro uscite, nell'ordine **operazione**, **chiave (_id)**, **documento**, **modifica**. Collega **operazione** a un [If · Else](core.if) o a [Scegli per indice (MUX)](core.select) per fare cose diverse per un inserimento e per un'eliminazione.
- **Il kernel tiene l'ascolto** e il blocco lo legge ogni tanto: se in quel momento non c'è niente, aspetta fino a 20 secondi. Quando il programma si ferma, l'ascolto si chiude.
- **Modifiche perse**: il kernel tiene in attesa al massimo 1000 modifiche (e al massimo 4096 KB: la dimensione massima di un risultato). Se il programma non le legge abbastanza in fretta, le più vecchie si perdono e l'uscita **perse** dice quante.
- **Un errore** del server (per esempio il replica set ha cambiato primario in modo che l'ascolto non continua) ferma l'ascolto: **in ascolto** diventa `false` e l'errore esce su **Exception**. Per ripartire serve di nuovo **ascolta**. Se la connessione si chiude (con **chiudi** o perché il programma si ferma), l'ascolto finisce senza errore.
- **Operazioni scelte**: «Inserimenti» fa passare `insert`; «Aggiornamenti» `update` e `replace`; «Eliminazioni» `delete`. «Tutte» non filtra.
- Una connessione può avere al massimo **10** ascolti.
- **Serve un replica set o un cluster** (anche un replica set di un solo server): con un server singolo il blocco dà un errore chiaro. L'uscita **server** della connessione dice `changeStreams`.

## Esempi

### 1. Avvisare quando arriva un ordine

**Raccolta** `ordini`, **Modifiche** «Inserimenti (insert)».

```
[MongoDB · Connessione (MongoClient)] connessione ──▶ connessione [MongoDB · Osserva modifiche (watch)] documento ──▶ valore [Get proprietà (obj.campo): cliente] valore ──▶ testo [Notify: "Nuovo ordine"]
```

Appena la connessione è pronta, [MongoDB · Osserva modifiche (watch)](mongo.watch) inizia ad ascoltare; per ogni ordine inserito, [Get proprietà (obj.campo)](core.get) legge il cliente e [Notify](lilos.notify) manda l'avviso.

### 2. Solo gli ordini grandi, senza partire da soli

Togli la spunta da **Ascolta appena arriva la connessione**. **Altri passi**: `[{"$match": {"fullDocument.totale": {"$gt": 1000}}}]`.

```
[Pulsante: Ascolta]  premuto ──▶ ascolta [MongoDB · Osserva modifiche (watch)] documento ──▶ valore [Print (console.log)]
[Pulsante: Smetti]   premuto ──▶ smetti                                      operazione ──▶ valore [Valore]
```

Con **Ascolta** il programma inizia a ricevere solo i documenti con `totale` oltre 1000; con **Smetti** si ferma. Le uscite nascoste, come **smetti** e **in ascolto**, si mostrano con l'**occhio**.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server MongoDB sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi MongoDB](logicstudio-mongodb). In più:

| Messaggio | Quando |
|---|---|
| Manca il nome della raccolta (collection) | **Raccolta** è vuota e l'ingresso **raccolta** non ha un valore. |
| Nome della raccolta non valido: … | Il nome è più lungo di 200 caratteri o contiene `$`. |
| Osserva modifiche funziona solo con un replica set o un cluster di MongoDB (non con un server singolo) | Il server a cui sei collegato non è un replica set. Un server singolo si può trasformare in un replica set di un solo server. |
| Troppe osservazioni su questa connessione (al massimo 10) | Hai già 10 ascolti su questa connessione. |
| Pipeline non valida: serve una lista di passi [{ "$match": … }] | **Altri passi** non è una lista di oggetti. |
| Pipeline non valida: scrivi un JSON, per esempio … (…) | **Altri passi** non è JSON. |
| MongoDB non ha risposto in 30 s | Il server non ha aperto l'ascolto entro il tempo massimo di un'operazione. |
| E11000 duplicate key error … / altri messaggi del server | Il server rifiuta l'operazione (chiave duplicata, validazione, permessi…): il messaggio è del server, in inglese. |

## Vedi anche

- [MongoDB · Connessione (MongoClient)](mongo.connect), per la connessione e `changeStreams`
- [MongoDB · Trova (find)](mongo.find), per leggere i documenti già presenti
- [If · Else](core.if), [Scegli per indice (MUX)](core.select), per agire secondo l'operazione
- [Notify](lilos.notify), per avvisare chi usa lilOS
- [Blocchi MongoDB](logicstudio-mongodb), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
