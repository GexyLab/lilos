# readFile

`lilos.fileRead` · lilOS · [Blocchi di lilOS](logicstudio-lilos) · versione 1

Legge un file della tua home, tutto intero, come testo o come JSON, e ne manda il contenuto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Qualsiasi valore che arriva qui fa leggere il file. |
| **percorso** (`path`) | testo | Il percorso del file. Se ha un valore, prende il posto del **Percorso** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **contenuto** (`content`) | qualsiasi | Il contenuto del file: un testo, oppure (formato JSON) il valore letto dal JSON. |
| **dimensione (byte)** (`size`) | numero | Quanti byte ha il file. |
| **Eccezione** (`error`) | oggetto | Quando il file non si può leggere: non c'è, non è un file, è troppo grande, il JSON non è valido… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Percorso (~/… o /home/…)** (`path`) | testo | `~/dati.txt` | Il file da leggere, quando l'ingresso **percorso** non ha un valore. |
| **Formato** (`mode`) | Testo, JSON | Testo | **Testo**: il contenuto esce così com'è, come testo. **JSON**: il contenuto viene letto come JSON ed esce il valore (oggetto, lista, numero…). |

## Come funziona

Quando arriva un valore su **leggi**, il blocco prende il percorso (quello dell'ingresso **percorso**, se ha un valore non vuoto, altrimenti quello delle impostazioni), lo controlla e chiede al kernel di leggere il file **come te**. Poi manda prima **contenuto** e poi **dimensione (byte)**.

### Il percorso

- `~` è la tua home; `~/dati.txt` è il file `dati.txt` nella home; `~/serra/log.txt` è dentro la cartella `serra`.
- Puoi anche scrivere il percorso completo, `/home/<utente>/…` (per esempio `/home/anna/dati.txt` se sei l'utente `anna`). La parte `/home/<utente>` non distingue maiuscole e minuscole.
- Il percorso deve cominciare con `~/` (o essere `~`) oppure con `/`. Un percorso relativo come `dati.txt` non va bene.
- Non sono ammessi `.` e `..`, la barra rovesciata `\`, nomi più lunghi di 255 caratteri, più di 32 livelli di cartelle, percorsi più lunghi di 4096 caratteri.
- Solo la **tua** home: un percorso fuori, come `/home/marco/…` o `/Sistema/…`, è rifiutato.
- La cartella `~/.config` è di lilOS (le tue impostazioni): i programmi non la usano mai.
- Gli spazi all'inizio e alla fine del percorso vengono tolti. Un oggetto o una lista sull'ingresso **percorso** diventa testo JSON (e quindi un percorso non valido).

### Il contenuto

- Si legge al massimo **5 MB**. Un file più grande dà errore e non viene letto.
- Il file è letto come testo UTF-8. Nel formato **Testo** esce così com'è, a capo compresi (anche l'a capo finale, se c'è).
- Nel formato **JSON** il testo viene interpretato: `{"a": 1}` esce come oggetto, `[1, 2]` come lista, `42` come numero, `"ciao"` come testo. Un file vuoto (o di soli spazi) dà `null`. Un JSON non valido dà errore.
- **dimensione (byte)** è la dimensione del file in byte, non il numero di caratteri: una lettera accentata vale 2 byte.
- Un file JSON che comincia con il segno BOM (alcuni programmi di Windows lo aggiungono) non viene riconosciuto come JSON valido: salvalo in UTF-8 senza BOM, oppure leggilo come Testo.
- I file il cui contenuto è protetto da un'app (per esempio cifrati con FileCrypt) non si leggono.
- Vedi e leggi solo quello che puoi vedere tu: un file condiviso con te da altri non è nella tua home, quindi non si raggiunge.
- Di alcuni file (per esempio in certe cartelle di rete) lilOS non conosce la dimensione prima di leggerli: il blocco li legge a pezzi e si ferma con un errore appena supera i 5 MB.

Vedi anche [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Leggere un testo all'avvio

```
[All'avvio (main)] impulso ──▶ leggi [readFile: ~/note.txt] contenuto ──▶ valore [Print (console.log)]
```

Se `~/note.txt` contiene `Comprare il latte`, la console principale mostra «Comprare il latte».

### 2. Leggere un'impostazione in JSON

Il file `~/serra/impostazioni.json` contiene:

```
{ "soglia": 30, "nome": "Serra nord" }
```

Imposta **Formato** JSON e prendi un campo con [Get proprietà (obj.campo)](core.get):

```
[All'avvio (main)] impulso ──▶ leggi [readFile: ~/serra/impostazioni.json] contenuto ──▶ oggetto [Get proprietà (obj.campo): soglia] valore ──▶ b [Confronto (== ≠ < >)]
```

**contenuto** è l'oggetto `{ "soglia": 30, "nome": "Serra nord" }`; il blocco Get proprietà manda `30`.

### 3. Un file scelto dall'utente

```
[Campo di testo: nome del file] testo ──▶ a [Template (formatta): "~/Documenti/{a}"] testo ──▶ percorso [readFile] contenuto ──▶ valore [Valore: testo letto]
[Pulsante: Apri]                premuto ──────────────────────────────────────────▶ leggi
```

L'utente scrive `lista.txt` nel [Campo di testo](ui.text) e preme il [Pulsante](ui.button): il blocco legge `~/Documenti/lista.txt` e la componente [Valore](ui.value) della finestra lo mostra. [Template (formatta)](core.format) ha un ingresso aggiunto chiamato **a**. Se il file non c'è, **Eccezione** manda «Il file «~/Documenti/lista.txt» non esiste».

### 4. Leggere ogni minuto un file aggiornato da altri

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [readFile: ~/sensori/ultimo.txt] contenuto ──▶ valore [Print (console.log)]
                                              dimensione (byte) ──▶ a [Confronto (== ≠ < >): a = b] se vero ──▶ invia [Notify: "Il file è vuoto"]
                                                       [Costante · Variabile: 0] valore ──▶ b
```

Utile quando un altro programma (o un'app) aggiorna il file. Con **dimensione (byte)** ti accorgi di un file vuoto (0 byte) e ricevi una [Notify](lilos.notify).

## Errori

| Messaggio | Quando |
|---|---|
| Manca il percorso del file | Il percorso è vuoto. |
| Percorso non valido: … (scrivi ~/… oppure /home/…) | Il percorso non comincia con `~` o `/`. |
| Percorso non valido: … | Il percorso comincia con `~` ma non con `~/` (per esempio `~dati`), contiene `\`, è più lungo di 4096 caratteri. |
| Percorso non valido: «.» e «..» non sono ammessi (…) | Il percorso contiene `.` o `..`. |
| Un nome del percorso è troppo lungo (al massimo 255 caratteri) | Un nome supera i 255 caratteri. |
| Percorso troppo profondo (al massimo 32 livelli) | Più di 32 parti nel percorso. |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … | Il percorso è fuori dalla tua home. |
| La cartella .config è di lilOS: i programmi non la usano | Il percorso è dentro `~/.config`. |
| Il file «~/dati.txt» non esiste | Il file non c'è (o non lo puoi vedere). |
| «~/dati.txt» non è un file | Il percorso è una cartella (o un altro tipo). |
| Il contenuto di «~/dati.txt» è protetto da un'app: i programmi non lo usano | Il file è protetto (FileCrypt). |
| Il file «~/dati.txt» è troppo grande: 8 MB (si leggono al massimo 5 MB) | Il file supera 5 MB. |
| Il file «~/dati.txt» è troppo grande (si leggono al massimo 5 MB) | Il file supera 5 MB mentre viene letto (dimensione non nota prima). |
| Il file «~/dati.txt» non è JSON valido: … | Formato JSON e il contenuto non è JSON; segue la spiegazione tecnica. |
| «~/dati.txt» non esiste (o non puoi vederlo) | Il file system dice che non c'è. |
| Non hai il permesso di usare «~/dati.txt» | Il file system ti nega l'accesso. |
| Il file system di lilOS non risponde: riprova più tardi | Il file system (per esempio una cartella di rete) non risponde. |
| Il file system di lilOS non c'è | Il modulo del file system manca. |
| readFile ha impiegato più di 30 s | La lettura ha superato il tempo massimo di un blocco (30 secondi di serie). |
| Il programma non è in esecuzione | Il programma si stava fermando. |

## Permessi

Il blocco lavora come l'utente che possiede il programma. Un'app fatta con **Crea app** che contiene questo blocco, prima di partire, ti chiede il permesso di «leggere e cambiare i tuoi file». Vedi [Permessi](logicstudio-engine/permissions).

## Vedi anche

- [writeFile](lilos.fileWrite), [appendFile](lilos.fileAppend)
- [exists](lilos.exists), per controllare prima che il file ci sia
- [readdir (elenca cartella)](lilos.folderList)
- [Get proprietà (obj.campo)](core.get), per prendere un campo dal JSON letto
- [Come funziona un blocco](ide/blocks)
