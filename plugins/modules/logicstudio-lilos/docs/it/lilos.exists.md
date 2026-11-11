# Esiste

`lilos.exists` · lilOS · [Blocchi di lilOS](logicstudio-lilos) · versione 1

Dice se un file o una cartella della tua home c'è, di che tipo è e quanto è grande. Ha due uscite a impulso per scegliere cosa fare: **se esiste** e **se non esiste**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **controlla** (`check`) | impulso | Qualsiasi valore che arriva qui fa controllare il percorso. |
| **percorso** (`path`) | testo | Il percorso da controllare. Se ha un valore, prende il posto del **Percorso** delle impostazioni. **A differenza degli altri blocchi di lilOS, questo ingresso avvia il blocco**: un nuovo percorso viene controllato subito. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **esiste** (`exists`) | sì/no | `true` se il percorso c'è, `false` se non c'è. |
| **se esiste** (`yes`) | impulso | Manda `true` solo se il percorso c'è. |
| **se non esiste** (`no`) | impulso | Manda `true` solo se il percorso non c'è. |
| **tipo (file, folder)** (`kind`) | testo | `file` o `folder` (o un altro tipo di lilOS, come `app`); testo vuoto se non esiste. |
| **dimensione (byte)** (`size`) | numero | La dimensione in byte; `0` per le cartelle e quando non esiste. |
| **Eccezione** (`error`) | oggetto | Quando il percorso non è valido o il file system non risponde. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Percorso (~/… o /home/…)** (`path`) | testo | `~/dati.txt` | Il percorso da controllare, quando l'ingresso **percorso** non ha un valore. |

## Come funziona

Quando arriva un valore su **controlla** (o su **percorso**), il blocco cerca il percorso **come te** e manda, in quest'ordine:

- se c'è: **esiste** = `true`, **se esiste**, **tipo** e **dimensione (byte)**;
- se non c'è: **esiste** = `false`, **se non esiste**, **tipo** = testo vuoto, **dimensione (byte)** = `0`.

Cose da sapere:

- Un file che non puoi vedere (di un altro utente, per esempio) per il blocco **non esiste**.
- `~` (la tua home) esiste sempre: tipo `folder`, dimensione 0.
- Il percorso segue le stesse regole di [Leggi file](lilos.fileRead). Un percorso **non valido** non dà `false`: va su **Eccezione**. Lo stesso per `~/.config`, che i programmi non possono usare: anche lì il blocco dà errore invece di rispondere.
- Un file protetto da un'app (FileCrypt) risulta esistente con il suo tipo e la sua dimensione, ma [Leggi file](lilos.fileRead) e [Scrivi file](lilos.fileWrite) non lo useranno.
- Il controllo e l'uso successivo non sono un'unica operazione: tra il controllo e una lettura il file può sparire. Collega comunque l'**Eccezione** del blocco che lo usa.
- Le lettere maiuscole e minuscole nella parte `/home/<utente>` non contano; per il resto del percorso dipende dal file system (con quello di serie di lilOS non contano).

Vedi anche [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Leggere le impostazioni, o crearle la prima volta

```
[All'avvio] impulso ──▶ controlla [Esiste: ~/serra/impostazioni.json] se esiste     ──▶ leggi [Leggi file: ~/serra/impostazioni.json]
                                                                     se non esiste ──▶ invia [Valore: {"soglia": 30}] valore ──▶ contenuto [Scrivi file: ~/serra/impostazioni.json]
```

All'avvio: se il file c'è, viene letto; se non c'è, il programma lo crea con i valori di partenza. Il [Valore](core.value) è di tipo JSON e ha **Invia all'avvio** tolto, così manda il suo valore solo quando arriva **se non esiste**. Leggi file e Scrivi file usano il formato JSON.

### 2. Controllare un nome scritto dall'utente

```
[Campo di testo: percorso] testo ──▶ percorso [Esiste] esiste ──▶ accesa [Spia]
                                                       tipo (file, folder) ──▶ valore [Valore: tipo]
```

Ogni volta che l'utente cambia il percorso nel [Campo di testo](ui.text), il blocco lo controlla subito (qui **percorso** avvia il blocco). La [Spia](ui.lamp) si accende se il percorso c'è; la componente [Valore](ui.value) mostra `file` o `folder`. Se l'utente scrive un percorso non valido, come `dati.txt` senza `~/`, il messaggio va su **Eccezione**.

### 3. Aspettare un file

```
[Ogni… 10 s] impulso ──▶ controlla [Esiste: ~/In arrivo/ordine.json] se esiste ──▶ leggi [Leggi file: ~/In arrivo/ordine.json]
```

Ogni 10 secondi il programma guarda se è arrivato il file; appena c'è, lo legge. Per non leggerlo a ogni giro, dopo averlo usato spostalo o svuotalo con [Scrivi file](lilos.fileWrite).

## Errori

| Messaggio | Quando |
|---|---|
| Manca il percorso del file | Il percorso è vuoto. |
| Percorso non valido: … | Il percorso non rispetta le regole (vedi [Leggi file](lilos.fileRead) per tutti i casi). |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … | Il percorso è fuori dalla tua home. |
| La cartella .config è di lilOS: i programmi non la usano | Il percorso è `~/.config` o dentro di essa. |
| Non hai il permesso di usare «~/dati.txt» | Il file system ti nega l'accesso. |
| Il file system di lilOS non risponde: riprova più tardi | Il file system non risponde. |
| Esiste ha impiegato più di 30 s | Il controllo ha superato il tempo massimo di un blocco (30 secondi di serie). |
| Il programma non è in esecuzione | Il programma si stava fermando. |

## Permessi

Il blocco lavora come l'utente che possiede il programma. Un'app fatta con **Crea app** che contiene questo blocco, prima di partire, ti chiede il permesso di «leggere e cambiare i tuoi file» (anche se questo blocco legge soltanto). Vedi [Permessi](logicstudio-engine/permissions).

## Vedi anche

- [Leggi file](lilos.fileRead), [Scrivi file](lilos.fileWrite), [Elenca cartella](lilos.folderList)
- [Se](core.if), per scegliere con il valore di **esiste**
- [Come funziona un blocco](ide/blocks)
