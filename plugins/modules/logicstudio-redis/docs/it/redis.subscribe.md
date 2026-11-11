# Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)

`redis.subscribe` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Manda ogni **messaggio** pubblicato su uno o più canali (o su dei modelli come `notizie.*`) appena arriva, con il nome del canale. Il blocco resta in ascolto finché il programma gira, con una connessione sua.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **ascolta** (`listen`) | impulso | Qualsiasi valore che arriva qui inizia ad ascoltare (se il blocco ascoltava già, riparte da capo). |
| **smetti** (`stop`) | impulso | Nascosta. Smette di ascoltare. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). **Avvia il blocco**: con **Ascolta appena arriva la connessione** spuntato, quando arriva la connessione inizia ad ascoltare. |
| **canali** (`channels`) | qualsiasi | Nascosta. I canali: un testo con i canali separati da virgole, o una lista di testi. Se ha un valore non vuoto, prende il posto dei **Canali** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **messaggio** (`message`) | qualsiasi | Il messaggio: un testo, oppure (con **JSON**) il valore convertito (se il messaggio non è JSON resta un testo). |
| **canale** (`channel`) | testo | Il canale su cui è stato pubblicato. |
| **modello** (`pattern`) | testo | Nascosta. Con i modelli, il modello che ha corrisposto (per esempio `notizie.*`). Senza modelli non esce niente. |
| **in ascolto** (`listening`) | sì/no | Nascosta. `true` quando il blocco ha iniziato ad ascoltare, `false` quando smette (con **smetti**, per un errore o perché la connessione si è chiusa). |
| **persi** (`dropped`) | numero | Nascosta. Quanti messaggi sono andati persi perché il programma non li leggeva abbastanza in fretta. |
| **Exception** (`error`) | oggetto | Quando l'ascolto non parte o si interrompe: connessione mancante o chiusa, nessun canale, troppi canali o iscrizioni, connessione dell'iscrizione caduta… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Canali (separati da virgole)** (`channels`) | testo | vuoto | I canali da ascoltare, per esempio `allarmi, avvisi`. Fino a 32. Con i modelli: `stanza:*, notizie.*`. |
| **Modelli, come notizie.* (PSUBSCRIBE)** (`pattern`) | sì / no | no | Se è spuntato, i canali sono modelli: `*` vale qualsiasi testo, `?` un carattere, `[ab]` uno dei due. |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |
| **Ascolta appena arriva la connessione** (`auto`) | sì / no | sì | Se è spuntato, quando arriva la connessione il blocco inizia ad ascoltare. Se no, solo con **ascolta**. |

## Come funziona

- **Si parte** con **ascolta**, oppure (con **Ascolta appena arriva la connessione**) quando arriva la **connessione**: il blocco chiede al kernel di iscriversi (`SUBSCRIBE`, o `PSUBSCRIBE` con i modelli) e manda `in ascolto = true`.
- **Ogni messaggio** esce con le uscite **canale**, **modello** (solo con i modelli) e **messaggio**, in quest'ordine.
- **Una connessione sua**: l'iscrizione usa una connessione in più, con le stesse impostazioni (utente, password, TLS), che conta nelle connessioni aperte dell'utente. Ogni connessione può avere al massimo **10** iscrizioni; i canali di una iscrizione sono al massimo 32.
- **Il kernel tiene l'ascolto** e il blocco lo legge ogni tanto: se in quel momento non c'è niente, aspetta fino a 20 secondi. Quando il programma si ferma, l'iscrizione si chiude.
- **Messaggi persi**: il kernel tiene in attesa al massimo 1000 messaggi (e al massimo 4096 KB). Se il programma non li legge abbastanza in fretta, i più vecchi si perdono e l'uscita **persi** dice quanti.
- **Se la connessione dell'iscrizione cade**, **in ascolto** diventa `false` e su **Exception** esce «La connessione dell'iscrizione si è chiusa»: serve di nuovo **ascolta**. Se la connessione principale si chiude (con **chiudi** o perché il programma si ferma), l'ascolto finisce senza errore.
- Redis non conserva i messaggi: arrivano solo quelli pubblicati mentre sei in ascolto.
- Con **JSON** il messaggio è letto con `JSON.parse`; se non è JSON **non** è un errore, resta un testo.

## Esempi

### 1. Ricevere gli allarmi

**Canali** `allarmi`, **JSON** spuntato.

```
[Redis · Connessione (connect)] connessione ──▶ connessione [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)] messaggio ──▶ valore [Print (console.log)]
                                                                                       canale ──▶ valore [Valore: canale]
```

Appena la connessione è pronta, il blocco inizia ad ascoltare; ogni messaggio pubblicato sul canale `allarmi` esce come oggetto.

### 2. Tutte le stanze con un modello

**Canali** `stanza:*`, **Modelli** spuntato.

```
[Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)] messaggio ──▶ valore [Print (console.log)]
                                             modello  ──▶ valore [Valore]
```

Un messaggio su `stanza:cucina` e uno su `stanza:bagno` arrivano tutti e due, con **canale** diverso e **modello** `stanza:*`.

### 3. Ascolta e smetti a comando

Togli la spunta da **Ascolta appena arriva la connessione**.

```
[Pulsante: Ascolta] premuto ──▶ ascolta [Redis · Iscriviti (SUBSCRIBE · PSUBSCRIBE)] messaggio ──▶ valore [Print (console.log)]
[Pulsante: Smetti]  premuto ──▶ smetti
```

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca il canale: scrivi uno o più canali (per i modelli, per esempio notizie.*) | Non c'è nessun canale. |
| Troppi canali (al massimo 32) | Più di 32 canali. |
| Troppe iscrizioni su questa connessione (al massimo 10) | Hai già 10 iscrizioni su questa connessione. |
| Troppe connessioni aperte: al massimo 10 per utente | L'iscrizione ha bisogno di una connessione in più e hai già il massimo. |
| La connessione dell'iscrizione si è chiusa | La connessione dell'iscrizione è caduta mentre ascoltava. |
| Redis non ha risposto in 30 s | Il server non ha confermato l'iscrizione entro il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Pubblica (PUBLISH)](redis.publish), per mandare i messaggi
- [Redis · Lista: togli (LPOP · RPOP · BLPOP)](redis.pop), per le code che devono conservare i lavori
- [Redis · Connessione (connect)](redis.connect)
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
