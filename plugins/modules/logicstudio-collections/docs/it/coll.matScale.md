# Scala

`coll.matScale` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Moltiplica ogni cella di una matrice per lo stesso numero.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice. Solo numeri. |
| **fattore** (`factor`) | numero | Il numero per cui moltiplicare ogni cella. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice con ogni cella moltiplicata per il fattore. |
| **Eccezione** (`error`) | oggetto | Fattore non numerico, matrice non valida o con celle non numeriche. |

## Come funziona

Il blocco aspetta di avere **matrice** e **fattore**; poi, a ogni valore nuovo, manda la matrice scalata.

- Il **fattore** viene convertito in numero: `"0,5"` vale 0,5, `true` vale 1, `false` vale 0. Attenzione: anche `""` e `null` valgono **0**, e danno una matrice di zeri. Un testo come `"doppio"` dà «Serve un numero».
- **Le celle della matrice invece devono essere numeri veri**: un testo come `"2"` dà «La matrice deve contenere solo numeri».
- Il fattore -1 cambia il segno di tutte le celle; il fattore 0 dà tutti zeri.
- Il risultato non viene arrotondato: `0.1 × 3` dà `0.30000000000000004`.

## Esempi

### 1. Il doppio

```
[Valore (JSON): [[1,2,3],[4,5,6]]] valore ──▶ matrice [Scala] matrice ──▶ valore [Scrivi in console]
[Valore: 2]                        valore ──▶ fattore
```

Scrive `[[2,4,6],[8,10,12]]`.

### 2. Un fattore scritto con la virgola

Con il fattore `"0,5"` (per esempio da un [Campo di testo](ui.text)) la stessa matrice dà `[[0.5,1,1.5],[2,2.5,3]]`.

### 3. Da centimetri a metri

Una matrice di misure in centimetri, `[[120, 85], [200, 150]]`, con fattore `0.01` dà `[[1.2, 0.85], [2, 1.5]]`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | Il fattore non si può convertire in numero. |
| Serve una matrice | Il valore su **matrice** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |
| La matrice deve contenere solo numeri | Una cella non è un numero. |

## Vedi anche

- [Somma matrici](coll.matAdd), [Sottrai matrici](coll.matSubtract), [Moltiplica matrici](coll.matMultiply)
- [Come funziona un blocco](ide/blocks)
