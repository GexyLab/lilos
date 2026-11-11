# Identità (eye)

`coll.matIdentity` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Crea la matrice identità: quadrata, con 1 sulla diagonale e 0 altrove.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dimensione** (`n`) | numero | Quante righe e colonne: un intero da 1 a 316. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice n × n con 1 dove riga e colonna coincidono, 0 nelle altre celle. |
| **Eccezione** (`error`) | oggetto | Dimensione non valida o troppo grande. |

## Come funziona

A ogni valore su **dimensione** il blocco manda la matrice identità di quella misura.

- La dimensione deve essere un intero: `2.5` dà «Dimensione: serve un numero intero». `"3"` vale 3, `true` vale 1; `""` e `null` valgono 0 e danno l'errore sotto.
- Deve essere almeno 1: 0 o un negativo danno «Righe e colonne devono essere interi maggiori di zero».
- Le celle sono al massimo 100000: la dimensione massima è quindi 316 (316 × 316 = 99856). Con 317 esce «Matrice troppo grande (massimo 100000 celle)».
- Moltiplicare una matrice quadrata per l'identità della stessa misura ([A × B](coll.matMultiply)) ridà la stessa matrice.

## Esempi

### 1. 3 × 3

```
[Costante · Variabile: 3] valore ──▶ dimensione [Identità (eye)] matrice ──▶ valore [Print (console.log)]
```

Scrive `[[1,0,0],[0,1,0],[0,0,1]]`.

### 2. Una matrice con tutti 5 sulla diagonale

```
[Identità (eye): 2] matrice ──▶ matrice [Scala (k·A)] matrice ──▶ valore [Print (console.log)]
[Costante · Variabile: 5]   valore  ──▶ fattore
```

Con dimensione 2 scrive `[[5,0],[0,5]]`.

### 3. Il determinante

Il blocco [Det](coll.matDet) di un'identità vale sempre 1.

## Errori

| Messaggio | Quando |
|---|---|
| Dimensione: serve un numero intero | La dimensione ha la virgola o non è un numero. |
| Righe e colonne devono essere interi maggiori di zero | La dimensione è 0 o negativa. |
| Matrice troppo grande (massimo 100000 celle) | La dimensione è più di 316. |

## Vedi anche

- [Nuova matrice (fill)](coll.matNew), [Scala (k·A)](coll.matScale), [A × B](coll.matMultiply), [Det](coll.matDet)
- [Come funziona un blocco](ide/blocks)
