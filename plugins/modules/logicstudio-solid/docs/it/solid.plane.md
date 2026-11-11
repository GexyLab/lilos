# Piano per 3 punti

`solid.plane` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Il piano che passa per tre punti: coefficienti, normale, equazione e area del triangolo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto 1** (`p1`) | lista | Il primo punto: lista `[x, y, z]` o oggetto `{x, y, z}`. |
| **punto 2** (`p2`) | lista | Il secondo punto. |
| **punto 3** (`p3`) | lista | Il terzo punto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **piano {a, b, c, d}** (`plane`) | oggetto | Il piano, un oggetto `{a, b, c, d}` per l'equazione ax + by + cz + d = 0. Si collega a [Distanza punto–piano](solid.planeDistance) e [Intersezione retta–piano](solid.linePlane). |
| **normale (versore)** (`normal`) | lista | La normale al piano, un vettore di lunghezza 1. |
| **equazione** (`equation`) | testo | L'equazione scritta, per esempio `z - 5 = 0`. |
| **area del triangolo** (`area`) | numero | L'area del triangolo formato dai tre punti. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Con i punti P₁, P₂, P₃:

- n = (P₂ − P₁) × (P₃ − P₁) (prodotto vettoriale), con componenti (a, b, c)
- d = −n·P₁; il piano è ax + by + cz + d = 0
- normale (versore) = n / |n|; area del triangolo = |n| / 2

L'equazione è scritta senza i termini a 0 e senza il coefficiente 1 (`x + y - 2 = 0`). Il blocco aspetta tutti e tre i punti. I coefficienti non sono ridotti: lo stesso piano può uscire con coefficienti multipli.

## Esempi

### 1. Il piano orizzontale a quota 5

```
[Costante · Variabile: [0,0,5]] valore ──▶ punto 1  [Piano per 3 punti] equazione ──▶ valore [Print (console.log)]
[Costante · Variabile: [1,0,5]] valore ──▶ punto 2                      normale (versore) ──▶ valore [Print (console.log)]
[Costante · Variabile: [0,1,5]] valore ──▶ punto 3
```

Scrive queste righe, una per uscita:

```
z - 5 = 0
[0,0,1]
```

### 2. Il piano per i tre assi (1, 0, 0), (0, 1, 0), (0, 0, 1)

```
[Costante · Variabile: [1,0,0]] valore ──▶ punto 1  [Piano per 3 punti] piano {a, b, c, d} ──▶ valore [Print (console.log)]
[Costante · Variabile: [0,1,0]] valore ──▶ punto 2                      equazione ──▶ valore [Print (console.log)]
[Costante · Variabile: [0,0,1]] valore ──▶ punto 3                      area del triangolo ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
{"a":1,"b":1,"c":1,"d":-1}
x + y + z - 1 = 0
0.866025403784439
```

L'area del triangolo è nascosta di serie.

## Errori

| Messaggio | Quando |
|---|---|
| I tre punti sono allineati: non individuano un piano | I tre punti stanno su una retta (o due coincidono). |
| punto 1: serve un punto o un vettore [x, y, z] | Un punto non è una lista di 3 (o 2) elementi né un oggetto (stessa cosa per «punto 2:» e «punto 3:»). |

## Vedi anche

- [Distanza punto–piano](solid.planeDistance) la distanza di un punto dal piano
- [Intersezione retta–piano](solid.linePlane) dove una retta incontra il piano
- [Vettori 3D (scalare, vettoriale…)](solid.vector) il prodotto vettoriale
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
