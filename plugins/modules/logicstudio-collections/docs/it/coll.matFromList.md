# Reshape

`coll.matFromList` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Taglia una lista in righe della stessa lunghezza e ne fa una matrice.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista dei valori, riga dopo riga. |
| **colonne** (`cols`) | numero | Quanti valori per riga: un intero da 1 in su. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice: i primi **colonne** valori sono la prima riga, i successivi la seconda, e così via. |
| **Eccezione** (`error`) | oggetto | Lista non valida, colonne non valide, lista che non si divide esattamente. |

## Come funziona

Il blocco aspetta di avere **lista** e **colonne**; poi, a ogni valore nuovo, manda la matrice.

- Le righe sono *lunghezza della lista ÷ colonne*: 6 valori con 3 colonne fanno 2 righe, con 2 colonne fanno 3 righe.
- **La lista deve dividersi esattamente**: 5 valori con 2 colonne danno «La lista (5 elementi) non si divide in righe di 2». Anche una **lista vuota** non va: «La lista (0 elementi) non si divide in righe di 2».
- **colonne** deve essere un intero: `1.5` dà «Colonne: serve un numero intero». `"2"` vale 2. Se è 0 o negativo (anche `""` e `null`, che valgono 0): «Righe e colonne devono essere interi maggiori di zero».
- I valori possono essere di qualsiasi tipo: vanno nelle celle così come sono.
- La matrice può avere al massimo 100000 celle.

## Esempi

### 1. Sei numeri in due righe

```
[Costante · Variabile (JSON): [1,2,3,4,5,6]] valore ──▶ lista   [Reshape] matrice ──▶ valore [Print (console.log)]
[Costante · Variabile: 3]                    valore ──▶ colonne
```

Scrive `[[1,2,3],[4,5,6]]`. Con **colonne** 2 scrive `[[1,2],[3,4],[5,6]]`; con **colonne** 4 dà «La lista (6 elementi) non si divide in righe di 4».

### 2. Una matrice scritta in un campo

```
[Campo di testo] testo ──▶ testo [Split: ;] risultato ──▶ lista [Reshape (colonne 2)] matrice ──▶ matrice [Det]
```

Scrivendo `1; 2; 3; 4` si ottiene la matrice `[["1","2"],["3","4"]]`, ma i valori sono **testi** e il blocco [Det](coll.matDet) dà «La matrice deve contenere solo numeri». Per i calcoli i valori devono essere numeri: usa per esempio un blocco [Costante · Variabile](core.value) di tipo JSON con `[1,2,3,4]`.

### 3. Righe di 1

Con **colonne** 1, `[7, 8, 9]` diventa la matrice colonna `[[7],[8],[9]]`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Colonne: serve un numero intero | **colonne** ha la virgola o non è un numero. |
| Righe e colonne devono essere interi maggiori di zero | **colonne** è 0 o negativo. |
| La lista (N elementi) non si divide in righe di C | La lista è vuota, o la sua lunghezza non è un multiplo di **colonne**. |
| Matrice troppo grande (massimo 100000 celle) | La matrice avrebbe più di 100000 celle. |

## Vedi anche

- [Flatten](coll.matFlatten), il contrario di questo blocco
- [Nuova matrice (fill)](coll.matNew), [Shape](coll.matSize)
- [Come funziona un blocco](ide/blocks)
