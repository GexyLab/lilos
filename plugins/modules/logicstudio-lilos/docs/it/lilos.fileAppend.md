# Aggiungi a file

`lilos.fileAppend` · lilOS · [Blocchi di lilOS](logicstudio-lilos) · versione 1

Aggiunge un valore in fondo a un file della tua home, senza toccare quello che c'è già. È il blocco giusto per un **registro**: una riga per ogni misura, per ogni evento, per ogni errore. Se il file non c'è, viene creato.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **contenuto** (`content`) | qualsiasi | Il valore da aggiungere. Ogni valore che arriva qui viene aggiunto al file. |
| **percorso** (`path`) | testo | Il percorso del file. Se ha un valore, prende il posto del **Percorso** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **scritto** (`written`) | impulso | Manda `true` quando il valore è stato aggiunto. |
| **dimensione (byte)** (`size`) | numero | La nuova dimensione del file, in byte. |
| **Eccezione** (`error`) | oggetto | Quando non si può aggiungere: percorso non valido, cartella che non c'è, file troppo grande, quota finita… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Percorso (~/… o /home/…)** (`path`) | testo | `~/registro.txt` | Il file a cui aggiungere, quando l'ingresso **percorso** non ha un valore. |
| **Formato** (`mode`) | Testo, JSON, uno per riga | Testo | **Testo**: il valore come testo. **JSON, uno per riga**: il valore come JSON su una sola riga, seguito da un a capo (il formato «JSON Lines»). |
| **A capo dopo ognuno** (`newline`) | sì / no | sì | Solo con il formato Testo: aggiunge un a capo dopo ogni valore, così ogni valore è su una riga sua. |

## Come funziona

Quando arriva un valore su **contenuto**, il blocco prepara i byte da aggiungere, li mette in fondo al file e manda **scritto** e **dimensione (byte)**.

### Cosa viene aggiunto

| Valore su **contenuto** | Testo, con a capo | Testo, senza a capo | JSON, uno per riga |
|---|---|---|---|
| `22,5` (testo) | `22,5` + a capo | `22,5` | `"22,5"` + a capo |
| `22.5` (numero) | `22.5` + a capo | `22.5` | `22.5` + a capo |
| `{ "t": 22.5, "h": 60 }` | `{"t":22.5,"h":60}` + a capo | `{"t":22.5,"h":60}` | `{"t":22.5,"h":60}` + a capo |
| `null` | solo un a capo | niente | `null` + a capo |

- Un oggetto o una lista diventa sempre JSON su una riga.
- Con il formato **JSON, uno per riga** l'impostazione **A capo dopo ognuno** non conta: l'a capo c'è sempre.
- L'a capo è `\n` (quello di Linux, che lilOS usa ovunque).
- Il testo è scritto in UTF-8.

### Regole e limiti

- Il percorso segue le stesse regole di [Leggi file](lilos.fileRead): `~/…` oppure `/home/<utente>/…`, solo dentro la tua home, mai in `~/.config`.
- Se il file non c'è, viene creato, ma **la sua cartella deve esserci**.
- Si aggiungono al massimo **5 MB** alla volta.
- Il file può crescere con questo blocco fino a **64 MB**: oltre, il blocco dà errore e non aggiunge niente. Quando un registro si avvicina al limite, cambia file (per esempio uno al giorno) o svuotalo con [Scrivi file](lilos.fileWrite).
- Fino a 5 MB il file viene letto e riscritto intero; oltre i 5 MB viene riscritto a pezzi, senza tenerlo tutto in memoria. Se il file system non sa riscrivere a pezzi, oltre i 5 MB il blocco dà errore.
- Lo spazio conta nella quota della tua home.
- I file protetti da un'app (FileCrypt) non vengono cambiati.
- Un valore che arriva solo su **percorso** non aggiunge niente.
- Se un file nuovo viene creato ma poi l'aggiunta non riesce, resta un file vuoto.
- Ogni valore viene aggiunto uno alla volta, nell'ordine in cui arriva: due valori vicini non si mescolano.

Vedi anche [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un registro di temperature

```
[Ogni… 60 s] impulso ──▶ leggi [Data e ora] ISO ──▶ ora   [Formatta testo: "{ora};{temp}"] testo ──▶ contenuto [Aggiungi a file: ~/serra/temperature.csv]
[Leggi file: ~/sensori/ultimo.txt]      contenuto ──▶ temp
```

[Formatta testo](core.format) ha due ingressi aggiunti, **ora** e **temp**; togli «lo avvia» da **temp**, così la riga si scrive solo quando arriva l'ora (altrimenti ogni nuova temperatura scriverebbe una riga in più). La temperatura arriva da un file che un altro programma aggiorna, letto quando vuoi tu. Ogni minuto il file riceve una riga come:

```
2026-11-11T10:00:00.000Z;22,5
2026-11-11T10:01:00.000Z;22,7
```

### 2. Un registro JSON

Imposta **Formato** «JSON, uno per riga» e collega un oggetto:

```
[Componi oggetto] oggetto ──▶ contenuto [Aggiungi a file: ~/serra/eventi.jsonl]
```

Con [Componi oggetto](core.compose) che produce `{ "evento": "porta aperta", "alle": "10:42" }`, il file riceve la riga:

```
{"evento":"porta aperta","alle":"10:42"}
```

Ogni riga è un JSON a sé: è un formato facile da rileggere con altri programmi.

### 3. Tenere gli errori del programma

```
[Richiesta web] Eccezione ──▶ oggetto [Prendi campo: message] valore ──▶ contenuto [Aggiungi a file: ~/errori.txt]
```

Ogni volta che la [Richiesta web](net.request) non riesce, il messaggio d'errore (per esempio «Indirizzo non trovato: esempio.invalid») finisce in una riga di `~/errori.txt`. Puoi anche collegare **Eccezione** direttamente a **contenuto**: allora viene scritto tutto l'oggetto `{ message, block, schema, at }` su una riga.

## Errori

| Messaggio | Quando |
|---|---|
| Manca il percorso del file | Il percorso è vuoto. |
| Percorso non valido: … | Il percorso non rispetta le regole (vedi [Leggi file](lilos.fileRead) per tutti i casi). |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … | Il percorso è fuori dalla tua home. |
| La cartella .config è di lilOS: i programmi non la usano | Il percorso è dentro `~/.config`. |
| Serve il nome di un file, non la home | Il percorso è `~`. |
| La cartella «~/serra» non esiste | Il file non c'è e nemmeno la sua cartella. |
| «~/serra» non è una cartella | Una parte del percorso è un file. |
| «~/registro.txt» non è un file | Il percorso è una cartella. |
| Il contenuto di «~/registro.txt» è protetto da un'app: i programmi non lo cambiano | Il file è protetto (FileCrypt). |
| Troppi dati da scrivere in una volta: 6144 KB (al massimo 5 MB) | Il valore da aggiungere supera 5 MB. |
| Il file «~/registro.txt» diventerebbe troppo grande (si aggiunge fino a 64 MB) | Con l'aggiunta il file supererebbe 64 MB. |
| Il file «~/registro.txt» è troppo grande per aggiungere (al massimo 5 MB) | Il file supera 5 MB e il file system non sa riscriverlo a pezzi. |
| Spazio finito: la tua home ha raggiunto la sua quota | La quota della tua home è piena. |
| «~/registro.txt» è troppo grande per i limiti di lilOS | Il file supererebbe la dimensione massima dei file di lilOS. |
| Non hai il permesso di usare «~/registro.txt» | Il file system ti nega l'accesso. |
| Il file system di lilOS non risponde: riprova più tardi | Il file system non risponde. |
| Aggiungi a file ha impiegato più di 30 s | L'operazione ha superato il tempo massimo di un blocco (30 secondi di serie). |
| Il programma non è in esecuzione | Il programma si stava fermando. |

## Permessi

Il blocco lavora come l'utente che possiede il programma. Un'app fatta con **Crea app** che contiene questo blocco, prima di partire, ti chiede il permesso di «leggere e cambiare i tuoi file». Vedi [Permessi](logicstudio-engine/permissions).

## Vedi anche

- [Scrivi file](lilos.fileWrite), per sostituire tutto il file
- [Leggi file](lilos.fileRead), [Esiste](lilos.exists), [Elenca cartella](lilos.folderList)
- [Formatta testo](core.format), per preparare una riga
- [Come funziona un blocco](ide/blocks)
