# Distanza e punto medio

`solid.distance` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

La distanza tra due punti, il loro punto medio e il vettore da uno all'altro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto P** (`p`) | lista | Il punto P: lista `[x, y, z]` o oggetto `{x, y, z}`. |
| **punto Q** (`q`) | lista | Il punto Q. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **distanza** (`distance`) | numero | La distanza tra P e Q. |
| **punto medio** (`midpoint`) | lista | Il punto medio del segmento PQ. |
| **vettore P→Q** (`vector`) | lista | Il vettore da P a Q (Q − P). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Con P = (x₁, y₁, z₁) e Q = (x₂, y₂, z₂):

- vettore P→Q = (x₂ − x₁, y₂ − y₁, z₂ − z₁)
- distanza = √((x₂ − x₁)² + (y₂ − y₁)² + (z₂ − z₁)²)
- punto medio = ((x₁ + x₂)/2, (y₁ + y₂)/2, (z₁ + z₂)/2)

Il blocco aspetta tutti e due i punti.

## Esempi

### 1. Dall'origine a (3, 4, 12)

```
[Costante · Variabile: [0,0,0]] valore ──▶ punto P   [Distanza e punto medio] distanza ──▶ valore [Print (console.log)]
[Costante · Variabile: [3,4,12]] valore ──▶ punto Q                           punto medio ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
13
[1.5,2,6]
```

### 2. Due punti qualsiasi, con il vettore

```
[Costante · Variabile: [1,2,3]] valore ──▶ punto P   [Distanza e punto medio] distanza ──▶ valore [Print (console.log)]
[Costante · Variabile: [4,-2,3]] valore ──▶ punto Q                           vettore P→Q ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
5
[3,-4,0]
```

Il vettore è nascosto di serie.

## Errori

| Messaggio | Quando |
|---|---|
| P: serve un punto o un vettore [x, y, z] | P non è una lista di 3 (o 2) elementi né un oggetto (e lo stesso per «Q:»). |
| P: le coordinate devono essere numeri | Una coordinata di P (o di Q) non è un numero. |

## Vedi anche

- [Vettori 3D (scalare, vettoriale…)](solid.vector) altre operazioni sui vettori
- [Punto 3D [x, y, z]](solid.point) per costruire i punti
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
