# Inviluppo convesso

`plane.hull` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

L'**inviluppo convesso** (*convex hull*) di una nuvola di punti: il poligono convesso più piccolo che li contiene tutti.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punti [[x, y], …]** (`points`) | lista | Una lista di punti (anche con doppioni, e con punti dentro la figura). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **inviluppo** (`hull`) | lista | I vertici dell'inviluppo, in senso antiorario, a partire dal punto più a sinistra (e in basso). I punti allineati sui lati non ci sono. |
| **poligono** (`polygon`) | oggetto | L'inviluppo come figura poligono. Non esce se i punti diversi sono meno di 3. |
| **quanti** (`count`) | numero | Quanti vertici. |
| **area** | numero | L'area dell'inviluppo (0 se non è un poligono). |
| **Exception** (`error`) | oggetto | L'ingresso non è una lista di punti. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tolleranza (ε)** (`epsilon`) | un numero | 1e-9 | La tolleranza (ε) con cui tre punti si considerano allineati. |

## Come funziona

Il blocco usa l'algoritmo *monotone chain*: ordina i punti e costruisce prima il lato inferiore, poi quello superiore. I punti uguali contano una volta. Se tutti i punti sono su una retta l'inviluppo è fatto dai due estremi; se ce n'è uno solo, da quello; con una lista vuota **hull** è la lista vuota e **count** è 0. Il calcolo è 2D.

## Esempi

### 1. Un quadrato con punti dentro

```
[Lista: (0,0) (2,0) (1,1) (2,2) (0,2) (1,0) (1,2)] lista ──▶ points [Inviluppo convesso] inviluppo ──▶ valore [Print (console.log)]
```

Escono i quattro angoli `(0, 0)`, `(2, 0)`, `(2, 2)`, `(0, 2)`: il punto `(1, 1)` è dentro e `(1, 0)` e `(1, 2)` sono sui lati. L'area è `4`.

### 2. Punti allineati

Con `(0, 0)`, `(1, 1)`, `(2, 2)` esce `[(0, 0), (2, 2)]`, **count** è `2` e **polygon** non esce.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista di punti | L'ingresso non è una lista. |
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |

## Vedi anche

- [Poligono (area · perimetro)](plane.polygon) per area, perimetro e baricentro dell'inviluppo
- [Rettangolo di ingombro](plane.bounds) per il rettangolo di ingombro
- [Come funziona un blocco](ide/blocks)
