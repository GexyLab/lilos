# Debounce

`core.debounce` · Tempo · [Blocchi di base](logicstudio-core) · versione 1

Aspetta che i valori smettano di arrivare e poi manda solo l'ultimo. Serve quando un valore cambia molte volte di fila (un campo mentre si scrive, un cursore trascinato) e ti interessa solo dove si ferma.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | I valori che arrivano, anche molti di fila. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | L'ultimo valore arrivato, quando per **Fermo per** secondi non ne è arrivato un altro. |
| **Exception** (`error`) | oggetto | In pratica non succede. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Fermo per (secondi)** (`seconds`) | da 0 a 3600 (un'ora), anche con i decimali | 0,5 | Quanto tempo deve passare senza valori nuovi prima di mandare l'ultimo. |

## Come funziona

Ogni valore che arriva fa **ricominciare l'attesa da capo**:

- Se **mentre aspetta** arriva un valore nuovo, quello che aspettava **viene scartato** (non uscirà mai) e il nuovo comincia ad aspettare **Fermo per** secondi interi.
- Quando per **Fermo per** secondi non arriva niente, esce l'ultimo valore arrivato, uguale a com'era.
- Dopo l'uscita il blocco ricomincia da zero: il valore successivo aspetta di nuovo.

Conseguenze da sapere:

- Se i valori arrivano **sempre più fitti** di **Fermo per** (per esempio uno ogni 0,2 secondi con **Fermo per** = 0,5), **non esce mai niente** finché non smettono.
- Con **Fermo per** = 0 esce l'ultimo dei valori arrivati **nello stesso momento** (per esempio quelli mandati insieme da un blocco), e gli altri vengono scartati. Valori che arrivano in momenti diversi escono tutti.
- Un numero negativo vale 0. Se il campo resta **vuoto**, vale 0 (non 0,5).
- Quando il programma si ferma, il valore che aspettava va perso.

Il blocco non ferma il programma: mentre aspetta, gli altri blocchi continuano a lavorare.

Confronto con gli altri blocchi di tempo:

| Blocco | Valori che arrivano mentre aspetta |
|---|---|
| [Ritardo (setTimeout)](core.delay) | Escono tutti, ognuno dopo la sua attesa. |
| **Debounce** | Esce solo l'ultimo, dopo un po' di calma. |
| [Throttle](core.throttle) | Esce subito il primo; quelli troppo vicini vengono scartati. |

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Tre valori di fila e uno da solo

**Fermo per** = 0,3 secondi.

| Arriva | Cosa succede |
|---|---|
| 1 a 0 s | aspetta |
| 2 a 0,1 s | 1 scartato, 2 aspetta |
| 3 a 0,2 s | 2 scartato, 3 aspetta |
| (niente fino a 0,5 s) | **esce 3 a 0,5 s** |
| 4 a 1 s | aspetta |
| (niente) | **esce 4 a 1,3 s** |

### 2. Cercare mentre si scrive

```
[Campo di testo: cerca] testo ──▶ valore [Debounce: 0,5 s] valore ──▶ … [HTTP (fetch)]
```

Mentre l'utente scrive, il [Campo di testo](ui.text) manda un valore a ogni tasto. La ricerca parte solo quando l'utente si ferma per mezzo secondo, con il testo completo, invece di partire a ogni lettera.

### 3. Salvare un cursore solo quando si ferma

```
[Cursore: volume] valore ──▶ valore [Debounce: 1 s] valore ──▶ contenuto [writeFile: ~/volume.txt]
```

Trascinando il [Cursore](ui.slider) da 10 a 80 escono decine di valori; il file viene scritto una volta sola, con 80, un secondo dopo che il cursore si è fermato.

## Vedi anche

- [Ritardo (setTimeout)](core.delay) e [Throttle](core.throttle)
- [Al cambio (fronte ↑↓)](core.edge) per reagire solo quando un sì/no cambia
- [Come funziona un blocco](ide/blocks)
