# Elenca cartella

`lilos.folderList` · lilOS · [Blocchi di lilOS](logicstudio-lilos) · versione 1

Elenca gli elementi di una cartella della tua home: file, cartelle, o entrambi. Per ognuno dà nome, tipo, dimensione, data dell'ultima modifica e percorso.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Qualsiasi valore che arriva qui fa leggere la cartella. |
| **percorso** (`path`) | testo | Il percorso della cartella. Se ha un valore, prende il posto del **Percorso** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **elementi** (`items`) | lista | Un oggetto per elemento (vedi sotto). |
| **nomi** (`names`) | lista | Solo i nomi, nello stesso ordine. |
| **quanti** (`count`) | numero | Quanti elementi ci sono, dopo i filtri. |
| **Eccezione** (`error`) | oggetto | Quando la cartella non si può leggere: non c'è, non è una cartella, percorso non valido… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Percorso (~/… o /home/…)** (`path`) | testo | `~` | La cartella da elencare, quando l'ingresso **percorso** non ha un valore. `~` è la tua home. |
| **Mostra** (`show`) | File e cartelle, Solo file, Solo cartelle | File e cartelle | Quali elementi elencare. |
| **Anche i nascosti (.nome)** (`hidden`) | sì / no | no | Se è spuntata, elenca anche gli elementi il cui nome comincia con un punto. |

## Come funziona

Quando arriva un valore su **leggi**, il blocco legge la cartella **come te** e manda, in quest'ordine, **elementi**, **nomi** e **quanti**.

Ogni elemento di **elementi** è un oggetto così:

```
{
  "name": "dati.txt",
  "type": "file",
  "size": 1534,
  "modified": 1762855200000,
  "path": "~/serra/dati.txt"
}
```

| Campo | Cosa c'è |
|---|---|
| `name` | Il nome dell'elemento. |
| `type` | `folder` per le cartelle, `file` per i file; altri elementi di lilOS hanno il loro tipo (per esempio `app`). |
| `size` | La dimensione in byte (0 per le cartelle e quando non si conosce). |
| `modified` | La data dell'ultima modifica, in millisecondi dal 1° gennaio 1970 (`null` se non si conosce). |
| `path` | Il percorso dell'elemento, sempre nella forma `~/…`: puoi mandarlo direttamente all'ingresso **percorso** degli altri blocchi di lilOS. |

Cose da sapere:

- L'ordine è: **prima le cartelle, poi il resto**, ciascun gruppo in ordine alfabetico.
- **Solo file** elenca tutto quello che non è una cartella (anche gli elementi di altri tipi).
- Gli elementi che cominciano con un punto (per esempio `.bozza.txt`) sono nascosti, a meno che spunti **Anche i nascosti (.nome)**. La cartella `.config` della home non compare **mai**, nemmeno con i nascosti.
- **elementi** e **nomi** contengono al massimo **2000** elementi; **quanti** dice quanti sono in tutto, anche oltre 2000.
- Il blocco elenca solo il primo livello: non entra nelle sottocartelle.
- Se il percorso è vuoto, il blocco elenca la home.
- Il percorso segue le stesse regole di [Leggi file](lilos.fileRead): solo dentro la tua home, mai in `~/.config`.
- Vedi solo gli elementi che puoi vedere tu.

Vedi anche [Come funziona un blocco](ide/blocks).

## Esempi

### 1. I nomi dei file di una cartella

Imposta **Percorso** `~/Documenti` e **Mostra** «Solo file»:

```
[All'avvio] impulso ──▶ leggi [Elenca cartella: ~/Documenti] nomi ──▶ valore [Scrivi in console]
                                                             quanti ──▶ valore [Scrivi in console]
```

Se `~/Documenti` contiene la cartella `Vecchi` e i file `lista.txt` e `conti.csv`, la console scrive `["conti.csv","lista.txt"]` e `2`.

### 2. Un elenco di file in una finestra

```
[Pulsante: Aggiorna] premuto ──▶ leggi [Elenca cartella: ~/Foto] elementi ──▶ righe [Tabella]
```

La componente [Tabella](ui.table), con **Colonne** `name, size`, mostra il nome e la dimensione di ogni elemento. Quando l'utente sceglie una riga, la Tabella manda l'oggetto della riga: con [Prendi campo](core.get) (`path`) ottieni il percorso, da mandare a [Leggi file](lilos.fileRead) o [Esiste](lilos.exists).

### 3. Controllare quanti file ci sono

```
[Ogni… 300 s] impulso ──▶ leggi [Elenca cartella: ~/In arrivo] quanti ──▶ a [Confronta: a > b] se vero ──▶ invia [Notifica: "Ci sono file nuovi"]
                                                  [Valore: 0] valore ──▶ b
```

Ogni 5 minuti il programma conta gli elementi di `~/In arrivo` e ti manda una [Notifica](lilos.notify) se ce n'è almeno uno. Ricorda il limite di 10 notifiche al minuto.

## Errori

| Messaggio | Quando |
|---|---|
| Percorso non valido: … | Il percorso non rispetta le regole (vedi [Leggi file](lilos.fileRead) per tutti i casi). |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … | Il percorso è fuori dalla tua home. |
| La cartella .config è di lilOS: i programmi non la usano | Il percorso è `~/.config` o dentro di essa. |
| La cartella «~/Documenti» non esiste | La cartella non c'è. |
| «~/dati.txt» non è una cartella | Il percorso è un file. |
| «~/Documenti» non esiste (o non puoi vederlo) | Il file system dice che non c'è. |
| Non hai il permesso di usare «~/Documenti» | Il file system ti nega l'accesso. |
| Il file system di lilOS non risponde: riprova più tardi | Il file system non risponde. |
| Elenca cartella ha impiegato più di 30 s | La lettura ha superato il tempo massimo di un blocco (30 secondi di serie). |
| Il programma non è in esecuzione | Il programma si stava fermando. |

## Permessi

Il blocco lavora come l'utente che possiede il programma. Un'app fatta con **Crea app** che contiene questo blocco, prima di partire, ti chiede il permesso di «leggere e cambiare i tuoi file». Vedi [Permessi](logicstudio-engine/permissions).

## Vedi anche

- [Esiste](lilos.exists), per un solo file o cartella
- [Leggi file](lilos.fileRead), [Scrivi file](lilos.fileWrite), [Aggiungi a file](lilos.fileAppend)
- [Lunghezza](coll.length) e [Filtra](coll.filter), per lavorare sulla lista
- [Come funziona un blocco](ide/blocks)
