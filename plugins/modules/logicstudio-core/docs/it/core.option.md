# Opzione (-x · --nome)

`core.option` · Programma · [Blocchi di base](logicstudio-core) · versione 1

Legge **un'opzione** degli argomenti della riga di comando, con il suo nome corto (`-o`) e lungo (`--output`): se c'è, il suo valore, convertito nel tipo che vuoi. È come una riga di `argparse` o di `getopt`: un blocco per ogni opzione del programma.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie. Se non è collegato il blocco manda **una volta, all'avvio**; se è collegato, a ogni impulso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore dell'opzione (vedi **Tipo**); se non c'è, **Quando non c'è**. |
| **data** (`present`) | sì/no | Se l'opzione è sulla riga di comando. |
| **Exception** (`error`) | oggetto | Un'opzione obbligatoria che manca, un valore che non è un numero, un'opzione senza il suo valore. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Nome corto** (`short`) | una lettera (o vuoto) | vuoto | `o` vale per `-o`. I trattini scritti davanti vengono tolti. |
| **Nome lungo** (`long`) | un nome (o vuoto) | `output` | `output` vale per `--output`. Serve almeno uno dei due nomi. |
| **Tipo** (`kind`) | Interruttore, Con un valore, Ripetibile | Con un valore | **Interruttore**: c'è o non c'è (`-v`, `--verbose`), esce sì/no. **Con un valore**: `-o FILE`, `-oFILE`, `--output FILE`, `--output=FILE`; esce l'ultimo dato. **Ripetibile**: come Con un valore, ma escono tutti in una lista (`-I a -I b` → `["a","b"]`). |
| **Valore** (`type`) | Testo, Numero, Sì/no | Testo | Solo per Con un valore e Ripetibile: come convertire il valore. Un **Numero** accetta la virgola (`2,5`); un **Sì/no** è no per `0`, `false`, `no`, `off` e il vuoto. |
| **Quando non c'è** (`default`) | testo | vuoto | Il valore se l'opzione manca, convertito come gli altri. Vuoto: esce `null` (un Interruttore: no; un Ripetibile: una lista vuota). Per un Ripetibile si scrivono più valori separati da virgola. |
| **Obbligatoria** (`required`) | sì/no | no | Se manca, invece dei valori esce un'Exception. |

## Come legge la riga

- `--output=FILE` e `--output FILE`: l'argomento dopo è sempre il valore, anche se comincia con `-`.
- `-o FILE`, `-oFILE` e `-o=FILE` per il nome corto. In un gruppo come `-vo FILE` le lettere prima di `o` sono altri interruttori.
- Per un **Interruttore**: `--verbose` è sì, `--no-verbose` è no, `--verbose=false` è no; `-v` (anche dentro `-xv`) è sì.
- Tutto quello che viene dopo `--` non è letto: sono posizionali.
- Il blocco non conosce le altre opzioni: in `-ofile` vede anche le lettere `f`, `i`, `l`, `e`. Se il programma ha interruttori corti e opzioni con valore, scrivi i valori staccati (`-o file`) o con il nome lungo.

## Come funziona

- Gli argomenti arrivano da `lilos logic run FILE ARGOMENTI…` o, nelle prove, dal pulsante **Argomenti** dell'IDE (vedi [Argomenti (argv)](core.args)).
- **valore** e **data** escono insieme, una volta all'avvio (o a ogni impulso su **invia**).

## Esempi

### 1. Un nome con un valore di serie

Impostazioni: Nome corto `n`, Nome lungo `name`, Tipo Con un valore, Quando non c'è `mondo`.

```
[Opzione: --name] valore ──▶ nome [Template (formatta): "Ciao {nome}"] testo ──▶ valore [Print (console.log)]
```

| Riga di comando | La console scrive |
|---|---|
| `lilos logic run ciao.lsch` | `Ciao mondo` |
| `lilos logic run ciao.lsch --name Eugenio` | `Ciao Eugenio` |
| `lilos logic run ciao.lsch -n=Anna` | `Ciao Anna` |

### 2. Una porta obbligatoria e un interruttore

Due blocchi: **Opzione** `--port` (Con un valore, Numero, Obbligatoria) e **Opzione** `-v` / `--verbose` (Interruttore).

```
[Opzione: --port]    valore    ──▶ …
[Opzione: --port]    Exception ──▶ exception [Dati di Exception (e.message…)] messaggio ──▶ valore [Print (console.log): errore] scritto ──▶ chiudi [Exit (chiudi il programma · return): 2]
[Opzione: --verbose] valore    ──▶ condizione [If · Else] …
```

Su [Exit](core.exit) mostra **chiudi** con l'occhio e metti **Valore se non ne arriva nessuno** a 2. Senza `--port` il programma scrive «Manca l'opzione obbligatoria --port» (sull'uscita degli errori, con `lilos logic run`) e si chiude con il codice 2, come i programmi che si lamentano di un uso sbagliato; con `--port abc` scrive «--port: «abc» non è un numero» e fa lo stesso.

## Errori

| Messaggio | Quando |
|---|---|
| Manca l'opzione obbligatoria *--nome* | **Obbligatoria** accesa e l'opzione non c'è. |
| *--nome*: «*testo*» non è un numero | Valore **Numero** e il valore dato non lo è. |
| L'opzione *--nome* vuole un valore | L'opzione è l'ultimo argomento, o è seguita da `--`, e non ha un valore. |
| Dai all'opzione un nome corto o un nome lungo | Tutti e due i nomi sono vuoti. |
| Il nome corto è una lettera sola, come -o | **Nome corto** ha più di una lettera. |

## Vedi anche

- [Argomenti (argv)](core.args), per tutti gli argomenti e i posizionali
- [Exit (chiudi il programma · return)](core.exit)
- [I programmi](logicstudio-engine/programs), per `lilos logic run`
