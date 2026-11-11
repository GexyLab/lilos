# SQL · Notifica (NOTIFY)

`db.notify` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Solo **PostgreSQL**: manda una **notifica** su un canale. Chi ascolta quel canale (un altro programma con [SQL · Ascolta (LISTEN)](db.listen), o qualsiasi applicazione collegata allo stesso database) la riceve subito.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui manda la notifica. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione **PostgreSQL**. Non avvia il blocco. |
| **messaggio** (`message`) | qualsiasi | Il contenuto della notifica. Un testo è mandato così com'è; un oggetto o una lista come testo JSON; un numero o un sì/no come testo; nessun valore, un messaggio vuoto. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **mandata** (`sent`) | impulso | Un impulso quando la notifica è stata mandata. |
| **Exception** (`error`) | oggetto | Quando la notifica non parte: non è una connessione PostgreSQL, canale non valido, messaggio troppo lungo, connessione chiusa… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Canale** (`channel`) | testo | `eventi` | Il nome del canale: lettere, cifre, `_` e `$`, che comincia con una lettera o `_`, al massimo 63 caratteri. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**, il blocco prende il **messaggio** e il **Canale** e chiede al server di mandare la notifica (`pg_notify`). Quando il server ha risposto, manda **mandata**.

- **Solo PostgreSQL**: con un altro database dà l'errore «SQL · Notifica (NOTIFY) funziona solo con le connessioni PostgreSQL».
- **Lunghezza**: il messaggio può essere lungo al massimo 8000 byte (un po' meno, per lo spazio che serve); oltre, errore.
- **Subito**: la notifica non fa parte di una transazione, anche se colleghi una [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)](db.transaction): parte quando il blocco la manda.
- **Chi non ascolta non la riceve**: PostgreSQL non conserva le notifiche per chi si collega dopo.
- Il canale è lo stesso nome che scrivi in [SQL · Ascolta (LISTEN)](db.listen).

## Esempi

### 1. Avvisare un altro programma

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Notifica (NOTIFY): produzione] mandata ──▶ valore [Print (console.log)]
[Oggetto { }: { "linea": 2, "stato": "ferma" }] oggetto ──▶ messaggio
[Pulsante: Avvisa] premuto ──▶ esegui
```

Il messaggio parte come testo JSON `{"linea":2,"stato":"ferma"}`: chi ascolta `produzione` con **I messaggi sono JSON** lo riceve già come oggetto.

### 2. Una notifica ogni minuto

```
[SQL · PostgreSQL (connect)] connessione ──▶ connessione [SQL · Notifica (NOTIFY): battito]
[Now (data e ora)] ISO ──▶ messaggio
[Intervallo (setInterval): 60 s] impulso ──▶ esegui
```

Un «battito» con l'ora, utile per sapere che un programma è vivo.

## Errori

| Messaggio | Quando |
|---|---|
| SQL · Notifica (NOTIFY) funziona solo con le connessioni PostgreSQL | La connessione non è di PostgreSQL. |
| Canale non valido: «…» (lettere, cifre e _) | Il **Canale** ha spazi o simboli non ammessi. |
| Messaggio troppo lungo (PostgreSQL ne accetta al massimo 8000 byte) | Il messaggio supera 8000 byte. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione è stata chiusa. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| Il database non ha risposto in 30 s | L'invio ha superato il tempo massimo. |

## Vedi anche

- [SQL · Ascolta (LISTEN)](db.listen), per ricevere le notifiche
- [SQL · PostgreSQL (connect)](db.postgres)
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
