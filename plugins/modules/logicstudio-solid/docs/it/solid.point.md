# Punto 3D [x, y, z]

`solid.point` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Mette insieme tre numeri in un punto (o vettore) 3D, una lista `[x, y, z]`.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | numero | La coordinata x. |
| **y** (`y`) | numero | La coordinata y. |
| **z** (`z`) | numero | La coordinata z. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto** (`point`) | lista | Il punto `[x, y, z]`. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Un ingresso **non collegato** vale 0: se colleghi solo **x** e **y** esce `[x, y, 0]`. Il blocco aspetta tutti gli ingressi che sono collegati, poi a ogni nuovo valore manda il punto.

Un testo con un numero (`"2,5"`) va bene. Per il contrario, vedi [Coordinate di un punto](solid.pointXYZ).

## Esempi

### 1. Un punto da tre numeri

```
[Costante · Variabile: 1] valore ──▶ x  [Punto 3D [x, y, z]] punto ──▶ valore [Print (console.log)]
[Costante · Variabile: 2] valore ──▶ y
[Costante · Variabile: 3] valore ──▶ z
```

Scrive `[1,2,3]`.

### 2. Solo x e y collegati: z vale 0

```
[Costante · Variabile: 4] valore ──▶ x   [Punto 3D [x, y, z]] punto ──▶ valore [Print (console.log)]
[Costante · Variabile: -2] valore ──▶ y
```

Scrive `[4,-2,0]`.

## Errori

| Messaggio | Quando |
|---|---|
| x: serve un numero | Il valore di **x** non è un numero (e lo stesso per «y:» e «z:»). |

## Vedi anche

- [Coordinate di un punto](solid.pointXYZ) il contrario: le tre coordinate di un punto
- [Distanza e punto medio](solid.distance) la distanza tra due punti
- [Leggi lista[i]](coll.get) per leggere una coordinata come elemento di lista
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
