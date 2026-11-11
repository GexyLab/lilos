# Scrivi lista[i]

`coll.set` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Sostituisce l'elemento in una posizione e manda la lista nuova.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista di partenza. Non viene cambiata: il blocco ne fa una copia. |
| **indice** (`index`) | numero | La posizione da sostituire: 0 è il primo, -1 l'ultimo. |
| **valore** (`value`) | qualsiasi | Il valore da mettere in quella posizione. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | Una copia della lista con il valore nuovo nella posizione scelta. Ha la stessa lunghezza. |
| **Eccezione** (`error`) | oggetto | Lista non valida, indice non intero o fuori dalla lista. |

## Come funziona

Il blocco aspetta di avere **lista**, **indice** e **valore**. Poi, a ogni valore nuovo su uno dei tre, manda la lista con l'elemento sostituito.

- L'indice si legge come in [Leggi lista[i]](coll.get): da 0, negativo dalla fine, `"2"` vale 2, `""` e `null` valgono 0.
- Si può solo **sostituire** un elemento che c'è: l'indice deve stare tra 0 e lunghezza-1 (o tra -1 e -lunghezza). Per allungare la lista usa [Push · Unshift](coll.add) o [Inserisci (splice)](coll.insert).
- Su una lista vuota ogni indice è fuori dalla lista.
- Il valore può essere qualsiasi cosa, anche `null` o un'altra lista (che diventa un elemento, non viene «aperta»).
- La lista in ingresso resta com'era: se è collegata anche ad altri blocchi, loro vedono ancora la vecchia.

## Esempi

### 1. Cambiare il secondo elemento

```
[Costante · Variabile (JSON): [1,2,3]] valore ──▶ lista  [Scrivi lista[i]] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 1]              valore ──▶ indice
[Costante · Variabile (testo): x]      valore ──▶ valore
```

Scrive `[1,"x",3]`.

### 2. L'ultimo elemento

Con indice `-1` e valore `0` sulla lista `[5, 6, 7]` il risultato è `[5, 6, 0]`.

### 3. Una lista che si aggiorna da sola

Per tenere una lista e cambiarne un elemento alla volta, rimanda il risultato nel blocco [Memoria (set · get)](core.store):

```
[Memoria (set · get)] valore ──▶ lista  [Scrivi lista[i]] risultato ──▶ imposta [Memoria (set · get)]
[Campo numerico: posizione] valore ──▶ indice
[Campo di testo: nuovo nome] testo ──▶ valore
```

Dai all'ingresso **imposta** del blocco Memoria (set · get) la lista di partenza come valore iniziale (per esempio `["Anna","Bruno","Carla"]`) e accendi **Invia quando cambia**; togli «lo avvia» dall'ingresso **lista** del blocco, così il blocco gira solo quando l'utente scrive, e non di nuovo quando il blocco Memoria rimanda la lista appena cambiata.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Indice: serve un numero intero | L'indice ha la virgola o non è un numero. |
| Indice fuori dalla lista | L'indice non corrisponde a un elemento che c'è. |

## Vedi anche

- [Leggi lista[i]](coll.get), [Inserisci (splice)](coll.insert), [Rimuovi (splice)](coll.removeAt)
- [Scrivi m[r][c]](coll.matSet) per una matrice
- [Memoria (set · get)](core.store)
- [Come funziona un blocco](ide/blocks)
