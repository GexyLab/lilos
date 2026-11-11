# Appiattisci

`coll.matFlatten` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Mette in fila tutte le celle di una matrice, riga dopo riga, in una lista sola.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice da appiattire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | Le celle della prima riga, poi quelle della seconda, e così via. Ha righe × colonne elementi. |
| **Eccezione** (`error`) | oggetto | Quando il valore non è una matrice valida. |

## Come funziona

A ogni matrice che arriva il blocco manda la lista delle sue celle, riga dopo riga.

- La matrice deve essere valida: le righe devono avere tutte la stessa lunghezza. `[[1], [2, 3]]` dà «Le righe della matrice devono avere tutte la stessa lunghezza», anche se in teoria si potrebbe mettere in fila. Per unire liste di lunghezze diverse usa [Unisci liste](coll.concat).
- Appiattisce **un livello solo**: se le celle sono liste, restano liste. `[[[1,2]],[[3,4]]]` dà `[[1,2],[3,4]]`.
- Le celle possono essere di qualsiasi tipo.
- Per tornare alla matrice usa [Matrice da lista](coll.matFromList) con lo stesso numero di colonne.

## Esempi

### 1. Una matrice 2 × 2

```
[Valore (JSON): [[1,2],[3,4]]] valore ──▶ matrice [Appiattisci] risultato ──▶ valore [Scrivi in console]
```

Scrive `[1,2,3,4]`.

### 2. La somma di tutte le celle

```
[Appiattisci] risultato ──▶ lista [Somma · Minimo · Massimo · Media: somma] risultato ──▶ valore [Valore mostrato]
```

Sulla matrice `[[1,2,3],[4,5,6]]` mostra `21`. Con **Operazione** massimo mostra la cella più grande, `6`.

### 3. Andata e ritorno

`[[1,2,3],[4,5,6]]` → Appiattisci → `[1,2,3,4,5,6]` → [Matrice da lista](coll.matFromList) con **colonne** 3 → `[[1,2,3],[4,5,6]]`. Con **colonne** 2 ottieni invece la stessa lista divisa in tre righe: `[[1,2],[3,4],[5,6]]`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore non è una lista, è vuoto, o un suo elemento non è una lista. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |

## Vedi anche

- [Matrice da lista](coll.matFromList), [Leggi riga](coll.matRow), [Unisci liste](coll.concat)
- [Come funziona un blocco](ide/blocks)
