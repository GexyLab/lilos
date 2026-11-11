# Shape

`coll.matSize` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Dice quante righe e quante colonne ha una matrice. Serve anche a controllare che un valore sia una matrice valida.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice da misurare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe** (`rows`) | numero | Il numero di righe. |
| **colonne** (`cols`) | numero | Il numero di colonne. |
| **Exception** (`error`) | oggetto | Quando il valore non è una matrice valida. |

## Come funziona

A ogni matrice che arriva il blocco manda **righe** e **colonne**.

Il valore deve essere una matrice valida (vedi [Liste e matrici](logicstudio-collections)):

- una lista con **almeno una riga**: `[]` dà «Serve una matrice»;
- **ogni elemento è una lista** (una riga): `[1, 2]` dà «Serve una matrice»; anche un testo o un oggetto;
- **tutte le righe hanno la stessa lunghezza**, almeno 1: `[[1, 2], [3]]` dà «Le righe della matrice devono avere tutte la stessa lunghezza»; anche `[[]]` (una riga vuota) dà lo stesso messaggio.

Le celle possono contenere qualsiasi valore: `[["a", null]]` è una matrice 1 × 2.

## Esempi

### 1. Una matrice 2 × 3

```
[Costante · Variabile (JSON): [[1,2,3],[4,5,6]]] valore ──▶ matrice [Shape] righe   ──▶ valore [Print (console.log)]
                                                                   colonne ──▶ valore [Print (console.log)]
```

Le due console scrivono `2` e `3`.

### 2. Righe di lunghezza diversa

Con `[[1], [2, 3]]` non esce niente su **righe** e **colonne**, e sull'**Exception** (o nella console principale) arriva «Shape: Le righe della matrice devono avere tutte la stessa lunghezza».

### 3. L'ultima cella

Per leggere l'ultima cella non servono le dimensioni: [Leggi m[r][c]](coll.matGet) accetta riga -1 e colonna -1.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore non è una lista, è vuoto, o un suo elemento non è una lista. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima riga è vuota. |

## Vedi anche

- [Length](coll.length) per una lista
- [Nuova matrice (fill)](coll.matNew), [Riga m[r]](coll.matRow), [Colonna m[][c]](coll.matCol)
- [Come funziona un blocco](ide/blocks)
