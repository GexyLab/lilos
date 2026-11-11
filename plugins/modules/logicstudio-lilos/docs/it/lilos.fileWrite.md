# Scrivi file

`lilos.fileWrite` · lilOS · [Blocchi di lilOS](logicstudio-lilos) · versione 1

Scrive un valore in un file della tua home, come testo o come JSON. **Il file viene sostituito**: quello che c'era prima si perde. Se il file non c'è, viene creato.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **contenuto** (`content`) | qualsiasi | Il valore da scrivere. Ogni valore che arriva qui scrive il file. |
| **percorso** (`path`) | testo | Il percorso del file. Se ha un valore, prende il posto del **Percorso** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **scritto** (`written`) | impulso | Manda `true` quando il file è stato scritto. |
| **dimensione (byte)** (`size`) | numero | Quanti byte sono stati scritti (la nuova dimensione del file). |
| **Eccezione** (`error`) | oggetto | Quando il file non si può scrivere: percorso non valido, cartella che non c'è, dati troppo grandi, quota finita… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Percorso (~/… o /home/…)** (`path`) | testo | `~/dati.txt` | Il file da scrivere, quando l'ingresso **percorso** non ha un valore. |
| **Formato** (`mode`) | Testo, JSON | Testo | Come il valore diventa il contenuto del file (vedi sotto). |

## Come funziona

Quando arriva un valore su **contenuto**, il blocco prende il percorso (quello dell'ingresso **percorso**, se ha un valore non vuoto, altrimenti quello delle impostazioni), prepara i byte da scrivere e chiede al kernel di scrivere il file **come te**. Poi manda **scritto** e **dimensione (byte)**.

### Cosa finisce nel file

| Valore su **contenuto** | Formato Testo | Formato JSON |
|---|---|---|
| `ciao` (testo) | `ciao` | `"ciao"` |
| `42` (numero) | `42` | `42` |
| `true` | `true` | `true` |
| `{ "a": 1, "b": [1, 2] }` | `{"a":1,"b":[1,2]}` (su una riga) | il JSON su più righe, rientrato di 2 spazi |
| `null` | file vuoto | `null` |

- Nel formato **Testo** non viene aggiunto un a capo alla fine.
- Il formato **JSON** scrive un JSON leggibile, con un campo per riga e 2 spazi di rientro: è quello che serve per rileggerlo con [Leggi file](lilos.fileRead) in formato JSON.
- Il testo è scritto in UTF-8, senza BOM.

### Regole

- Il percorso segue le stesse regole di [Leggi file](lilos.fileRead): `~/…` oppure `/home/<utente>/…`, solo dentro la tua home, mai in `~/.config`, niente `.` e `..`.
- Il percorso deve essere quello di un **file**: `~` da solo (la home) è rifiutato.
- Se il file non c'è, viene creato. **La sua cartella però deve esserci**: il blocco non crea cartelle.
- Se il file c'è, viene sostituito per intero.
- Si scrivono al massimo **5 MB** alla volta.
- I file il cui contenuto è protetto da un'app (FileCrypt) non vengono cambiati.
- Lo spazio usato conta nella **quota della tua home**: se è finita, il blocco dà errore. Vale anche il limite di dimensione dei file di lilOS.
- Un valore che arriva solo su **percorso** non scrive niente, anche se a quell'ingresso hai dato «lo avvia».
- Se un file nuovo viene creato ma poi la scrittura non riesce (per esempio per la quota), nella cartella resta un **file vuoto** con quel nome.

> Un programma attivo scrive davvero, anche quando non guardi. Provalo prima con **Prova** su un file di prova.

Vedi anche [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Salvare un numero

```
[Campo numerico: soglia] valore ──▶ contenuto [Scrivi file: ~/serra/soglia.txt] scritto ──▶ valore [Scrivi in console]
```

Ogni volta che l'utente cambia il [Campo numerico](ui.number), per esempio a 28, il file `~/serra/soglia.txt` contiene `28` e la console scrive `true`. La cartella `~/serra` deve esistere.

### 2. Salvare le impostazioni in JSON

```
[Campo numerico: soglia] valore ──▶ soglia [Componi oggetto] oggetto ──▶ contenuto [Scrivi file: ~/serra/impostazioni.json]
[Campo di testo: nome]   testo  ──▶ nome
```

Con **Formato** JSON, [Componi oggetto](core.compose) (con gli ingressi aggiunti **soglia** e **nome**) produce `{ "soglia": 28, "nome": "Serra nord" }` e il file diventa:

```
{
  "soglia": 28,
  "nome": "Serra nord"
}
```

All'avvio puoi rileggerlo con [Leggi file](lilos.fileRead) in formato JSON.

### 3. Salvare una nota con un pulsante

```
[Campo di testo: nome] testo ──▶ a [Formatta testo: "~/Note/{a}.txt"] testo ──▶ percorso [Scrivi file]
[Campo di testo: nota] testo ──▶ imposta [Memoria] valore ─────────────────────▶ contenuto
[Pulsante: Salva]    premuto ──▶ leggi
```

L'utente scrive `spesa` nel primo campo, `latte, pane` nel secondo e preme **Salva**: il file `~/Note/spesa.txt` contiene `latte, pane`. Il percorso arriva da [Formatta testo](core.format) (con l'ingresso aggiunto **a**) e, siccome **percorso** non avvia il blocco, cambiare il nome non scrive niente. La nota aspetta in [Memoria](core.store) e va su **contenuto** solo quando premi il [Pulsante](ui.button). La cartella `~/Note` deve esistere.

> Se **contenuto** arriva prima che **percorso** abbia un valore, il blocco usa il **Percorso** delle impostazioni (`~/dati.txt` di serie).

## Errori

| Messaggio | Quando |
|---|---|
| Manca il percorso del file | Il percorso è vuoto. |
| Percorso non valido: … | Il percorso non rispetta le regole (vedi [Leggi file](lilos.fileRead) per tutti i casi). |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … | Il percorso è fuori dalla tua home. |
| La cartella .config è di lilOS: i programmi non la usano | Il percorso è dentro `~/.config`. |
| Serve il nome di un file, non la home | Il percorso è `~` (o la home scritta per intero). |
| La cartella «~/serra» non esiste | Il file non c'è e nemmeno la sua cartella. |
| «~/serra» non è una cartella | Una parte del percorso è un file. |
| «~/dati.txt» non è un file | Il percorso è una cartella. |
| Il contenuto di «~/dati.txt» è protetto da un'app: i programmi non lo cambiano | Il file è protetto (FileCrypt). |
| Troppi dati da scrivere in una volta: 6144 KB (al massimo 5 MB) | Il contenuto supera 5 MB. |
| Spazio finito: la tua home ha raggiunto la sua quota | La quota della tua home è piena. |
| «~/dati.txt» è troppo grande per i limiti di lilOS | Il file supererebbe la dimensione massima dei file di lilOS. |
| Non hai il permesso di usare «~/dati.txt» | Il file system ti nega l'accesso. |
| «~/dati.txt» non esiste (o non puoi vederlo) | Il file system non trova il file mentre lo scrive. |
| «~/dati.txt»: … | Il file system rifiuta l'operazione, con la sua spiegazione. |
| Il file system di lilOS non risponde: riprova più tardi | Il file system non risponde. |
| Scrivi file ha impiegato più di 30 s | La scrittura ha superato il tempo massimo di un blocco (30 secondi di serie). |
| Il programma non è in esecuzione | Il programma si stava fermando. |

## Permessi

Il blocco lavora come l'utente che possiede il programma. Un'app fatta con **Crea app** che contiene questo blocco, prima di partire, ti chiede il permesso di «leggere e cambiare i tuoi file». Vedi [Permessi](logicstudio-engine/permissions).

## Vedi anche

- [Aggiungi a file](lilos.fileAppend), per allungare un file invece di sostituirlo
- [Leggi file](lilos.fileRead), [Esiste](lilos.exists), [Elenca cartella](lilos.folderList)
- [Componi oggetto](core.compose), per preparare un JSON
- [Come funziona un blocco](ide/blocks)
