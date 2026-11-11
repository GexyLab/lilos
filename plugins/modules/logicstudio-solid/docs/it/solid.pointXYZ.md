# Coordinate di un punto

`solid.pointXYZ` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Divide un punto o un vettore 3D nelle sue tre coordinate.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto** (`point`) | lista | Il punto: una lista `[x, y, z]` (o `[x, y]`, con z = 0) o un oggetto `{x, y, z}`. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | numero | La coordinata x. |
| **y** (`y`) | numero | La coordinata y. |
| **z** (`z`) | numero | La coordinata z. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

A ogni punto che arriva il blocco manda le tre coordinate sulle tre uscite. Con due valori la coordinata **z** esce 0. Le coordinate possono essere testi con un numero (`"2,5"`).

## Esempi

### 1. Le coordinate di un punto

```
[Costante · Variabile: [3,-4,12]] valore ──▶ punto  [Coordinate di un punto] x ──▶ valore [Print (console.log)]
                                                                             y ──▶ valore [Print (console.log)]
                                                                             z ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
3
-4
12
```

### 2. Un oggetto {x, y} senza z

```
[Costante · Variabile: {"x":5,"y":6}] valore ──▶ punto  [Coordinate di un punto] x ──▶ valore [Print (console.log)]
                                                                                 y ──▶ valore [Print (console.log)]
                                                                                 z ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
5
6
0
```

## Errori

| Messaggio | Quando |
|---|---|
| punto: serve un punto o un vettore [x, y, z] | Il valore non è una lista di 3 (o 2) elementi né un oggetto. |
| punto: le coordinate devono essere numeri | Una coordinata non è un numero. |

## Vedi anche

- [Punto 3D [x, y, z]](solid.point) il contrario: tre numeri in un punto
- [Leggi lista[i]](coll.get) un altro modo di leggere un elemento
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
