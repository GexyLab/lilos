# SQL · Ascolta (LISTEN)

`db.listen` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Solo **PostgreSQL**: riceve le **notifiche** (`NOTIFY`) di un canale finché il programma gira. È il modo con cui il database avvisa il programma che qualcosa è cambiato (una riga nuova, un ordine arrivato…) senza dover chiedere ogni tanto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **avvia** (`start`) | impulso | Comincia ad ascoltare il canale (se già ascoltava, ricomincia). |
| **ferma** (`stop`) | impulso | Nascosta. Smette di ascoltare e manda `in ascolto = false`. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione **PostgreSQL**. **Avvia il blocco**: appena arriva la connessione, l'ascolto comincia da solo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **messaggio** (`message`) | testo | Il testo di ogni notifica; con **I messaggi sono JSON**, il valore letto dal JSON (se il testo è JSON valido). |
| **notifica** (`data`) | oggetto | Nascosta. Ogni notifica per intero: `{ "channel": "ordini", "payload": …, "pid": 4821 }` (`pid` è il numero del processo del server che l'ha mandata). |
| **in ascolto** (`listening`) | sì/no | `true` quando l'ascolto è cominciato; `false` quando finisce (con **ferma** o perché la connessione si è chiusa). |
| **Exception** (`error`) | oggetto | Quando l'ascolto non comincia: non è una connessione PostgreSQL, canale non valido, connessione chiusa… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Canale** (`channel`) | testo | `eventi` | Il nome del canale da ascoltare: lettere, cifre, `_` e `$`, che comincia con una lettera o `_`, al massimo 63 caratteri. |
| **I messaggi sono JSON** (`json`) | sì / no | no | Se è spuntato, il testo di ogni notifica è letto come JSON: **messaggio** manda l'oggetto o la lista. Se il testo non è JSON valido, esce il testo. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

1. Con **avvia** (o appena arriva la **connessione**) il blocco chiede al server di ascoltare il canale (`LISTEN canale`). Manda `in ascolto = true`.
2. Il blocco aspetta le notifiche (in attesa lunga, senza consumare risorse). Per ogni notifica manda **notifica** e poi **messaggio**.
3. L'ascolto finisce con **ferma**, quando il programma si ferma o quando la connessione si chiude: allora manda `in ascolto = false`.

- **Solo PostgreSQL**: con un altro database dà l'errore «SQL · Ascolta (LISTEN) funziona solo con le connessioni PostgreSQL».
- **Una connessione del pool**: ogni ascolto tiene occupata una delle **Connessioni nel pool** della connessione PostgreSQL, finché dura.
- **Solo i messaggi mandati dopo**: le notifiche mandate prima che l'ascolto cominci non si ricevono (PostgreSQL non le conserva).
- **Se arrivano troppe** notifiche in fretta, il blocco ne tiene in coda fino a 1000; le più vecchie oltre quel numero si perdono.
- Il messaggio è al massimo di 8000 byte (il limite di PostgreSQL).
- **Dentro una transazione** non si ascolta: collega la connessione, non la transazione.
- Le notifiche non cambiano il tempo massimo delle operazioni: l'ascolto è una connessione lunga, non una query.

## Esempi

### 1. Ogni nuovo ordine in una finestra

Nel database una funzione fa `NOTIFY ordini, '{"id": 7, "cliente": "Rossi"}'` quando si inserisce un ordine. **Canale** `ordini`, **I messaggi sono JSON** spuntato.

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Ascolta (LISTEN)] messaggio ──▶ oggetto [Destruttura oggetto: cliente] ──▶ valore [Valore: ultimo cliente]
```

L'ascolto comincia da solo all'arrivo della connessione. Ogni ordine nuovo aggiorna il [Valore](ui.value).

### 2. Ascoltare solo quando serve

La connessione resta aperta, e l'ascolto si comanda con i pulsanti.

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Ascolta (LISTEN): avvisi] messaggio ──▶ valore [Print (console.log)]
[Pulsante: Ascolta] premuto ──▶ avvia
[Pulsante: Smetti]  premuto ──▶ ferma (porta nascosta)
```

Mostra l'ingresso nascosto **ferma** con l'**occhio**; **in ascolto** può accendere una [Spia](ui.lamp).

### 3. Un avviso in tempo reale

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Ascolta (LISTEN): allarmi] messaggio ──▶ testo [Notify]
```

Quando un altro programma (o un trigger del database) manda un `NOTIFY allarmi`, arriva subito una [Notify](lilos.notify).

## Errori

| Messaggio | Quando |
|---|---|
| Troppe transazioni, cursori o ascolti aperti su questa connessione (al massimo 20) | Sulla stessa connessione ce ne sono già 20 aperti: chiudi quelli che non servono. |
| SQL · Ascolta (LISTEN) funziona solo con le connessioni PostgreSQL | La connessione non è di PostgreSQL, o è una transazione o un cursore. |
| Canale non valido: «…» (lettere, cifre e _) | Il **Canale** ha spazi o simboli non ammessi. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| Il database non ha risposto in 30 s | L'avvio dell'ascolto ha superato il tempo massimo. |

## Vedi anche

- [SQL · Notifica (NOTIFY)](db.notify), per mandare le notifiche
- [SQL · PostgreSQL (connect)](db.postgres)
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
