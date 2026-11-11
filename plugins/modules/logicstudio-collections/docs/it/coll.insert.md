# Inserisci (splice)

`coll.insert` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Mette un valore in una posizione della lista, spostando avanti quelli che seguono, e manda la lista nuova.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista di partenza. Non viene cambiata: il blocco ne fa una copia. |
| **indice** (`index`) | numero | La posizione che avrà il valore nuovo: 0 = all'inizio, la lunghezza della lista = in fondo. Un numero negativo conta dalla fine. |
| **valore** (`value`) | qualsiasi | Il valore da inserire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | La lista con un elemento in più. |
| **Exception** (`error`) | oggetto | Lista non valida, indice non intero o fuori dalla lista, lista troppo lunga. |

## Come funziona

Il blocco aspetta di avere **lista**, **indice** e **valore**, poi a ogni valore nuovo manda la lista con il valore inserito. Il valore nuovo prende il posto dell'indice e gli elementi da lì in poi si spostano di uno.

Con una lista di lunghezza N gli indici validi sono **da 0 a N** (uno in più che negli altri blocchi, perché si può inserire anche dopo l'ultimo):

| Indice | Dove finisce il valore |
|---|---|
| 0 | all'inizio |
| 1 … N-1 | prima dell'elemento che era in quella posizione |
| N | in fondo (come [Push · Unshift](coll.add)) |
| -1 | **prima dell'ultimo**, non in fondo |
| -N | all'inizio |
| più di N, meno di -N | errore «Indice fuori dalla lista» |

- Su una lista vuota l'unico indice valido è 0 (anche `-0`).
- L'indice si legge come in [Leggi lista[i]](coll.get): `"2"` vale 2, `""` e `null` valgono 0, `1.5` è un errore.
- Il valore è inserito come un elemento solo: inserire una lista non la «apre».
- Il risultato può avere al massimo 100000 elementi.

## Esempi

### 1. In mezzo

```
[Costante · Variabile (JSON): ["a","b","c"]] valore ──▶ lista  [Inserisci (splice)] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 1]                    valore ──▶ indice
[Costante · Variabile (testo): X]            valore ──▶ valore
```

Scrive `["a","X","b","c"]`.

### 2. In fondo e prima dell'ultimo

Sulla lista `[1, 2, 3]` con valore `"x"`:

- indice `3` → `[1, 2, 3, "x"]`
- indice `-1` → `[1, 2, "x", 3]`
- indice `-3` → `["x", 1, 2, 3]`
- indice `4` → errore «Indice fuori dalla lista»

### 3. Lista vuota

Su `[]` con indice `0` e valore `5` il risultato è `[5]`; con indice `1` è l'errore «Indice fuori dalla lista».

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Indice: serve un numero intero | L'indice ha la virgola o non è un numero. |
| Indice fuori dalla lista | L'indice è maggiore della lunghezza o minore di -lunghezza. |
| Lista troppo grande (massimo 100000 elementi) | Il risultato avrebbe più di 100000 elementi. |

## Vedi anche

- [Push · Unshift](coll.add), [Scrivi lista[i]](coll.set), [Rimuovi (splice)](coll.removeAt)
- [Come funziona un blocco](ide/blocks)
