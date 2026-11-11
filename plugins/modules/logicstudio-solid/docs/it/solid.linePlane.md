# Intersezione retta–piano

`solid.linePlane` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Dove una retta incontra un piano: il punto di intersezione, il parametro t e se la retta è parallela al piano.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **piano** (`plane`) | qualsiasi | Il piano: un oggetto `{a, b, c, d}` (per ax + by + cz + d = 0) o una lista `[a, b, c, d]`. |
| **punto della retta** (`point`) | lista | Un punto della retta. |
| **direzione della retta** (`direction`) | lista | La direzione della retta: un vettore non nullo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto** (`point`) | lista | Il punto di intersezione. **Non esce** se la retta è parallela al piano. |
| **t (punto + t·direzione)** (`t`) | numero | Il parametro: l'intersezione è punto + t·direzione. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **parallela** (`parallel`) | sì/no | `true` se la retta è parallela al piano (o ci sta dentro), altrimenti `false`. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

La retta è P + t·v (punto P, direzione v), il piano ha normale n = (a, b, c) e termine d:

- t = −(n·P + d) / (n·v)
- intersezione = P + t·v

Se n·v è (quasi) 0 la retta è parallela al piano: il blocco manda solo **parallela** = `true` (niente punto e niente t). Lo stesso succede se la retta sta nel piano: i due casi non si distinguono. Altrimenti manda punto, t e **parallela** = `false`. Il blocco aspetta piano, punto e direzione.

## Esempi

### 1. Una retta verticale che buca il piano z = 5

```
[Costante · Variabile: {"a":0,"b":0,"c":1,"d":-5}] valore ──▶ piano  [Intersezione retta–piano] punto ──▶ valore [Print (console.log)]
[Costante · Variabile: [1,2,0]] valore ──▶ punto della retta                                    t (punto + t·direzione) ──▶ valore [Print (console.log)]
[Costante · Variabile: [0,0,1]] valore ──▶ direzione della retta                                parallela ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
[1,2,5]
5
false
```

**t** è nascosta di serie.

### 2. Una retta orizzontale: parallela

```
[Costante · Variabile: {"a":0,"b":0,"c":1,"d":-5}] valore ──▶ piano  [Intersezione retta–piano] parallela ──▶ valore [Print (console.log)]
[Costante · Variabile: [0,0,0]] valore ──▶ punto della retta                                    punto ──▶ valore [Print (console.log)]
[Costante · Variabile: [1,0,0]] valore ──▶ direzione della retta
```

Scrive `true`.

Sulla porta **punto** non esce niente: la console scrive solo `true`.

## Errori

| Messaggio | Quando |
|---|---|
| direzione: il vettore nullo non individua una retta | La direzione è (0, 0, 0). |
| piano: serve un oggetto { a, b, c, d } o una lista [a, b, c, d] | Il piano non è un oggetto né una lista (altri messaggi «piano: …» come in [Distanza punto–piano](solid.planeDistance)). |
| punto: serve un punto o un vettore [x, y, z] | Il punto (o la direzione, con «direzione:») non è una lista di 3 (o 2) elementi né un oggetto. |

## Vedi anche

- [Piano per 3 punti](solid.plane) per ottenere il piano da tre punti
- [Distanza punto–piano](solid.planeDistance) la distanza di un punto dal piano
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
