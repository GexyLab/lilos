# Figura → SVG

`plane.svg` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Trasforma una figura, dei punti o una lista di figure in testo **SVG**, pronto per essere mostrato o salvato in un file.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **figura, punti o lista** (`shapes`) | qualsiasi | Quello da disegnare: una figura, un punto, o una lista di figure e di punti insieme. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **SVG** (`svg`) | testo | Il testo SVG: un elemento `<svg>` con `viewBox` calcolato da solo. |
| **Exception** (`error`) | oggetto | Un colore non è valido, un valore non è un punto né una figura, o non c'è niente da disegnare. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Colore del contorno** (`stroke`) | testo | #222222 | Il colore del contorno: un nome (`red`), un colore esadecimale (`#ff0000`), `rgb(…)`, `hsl(…)`, `none` o `currentColor`. I punti sono pieni di questo colore. |
| **Colore di riempimento** (`fill`) | testo | none | Il colore di riempimento delle figure chiuse, negli stessi formati. `none` lascia vuoto. |
| **Spessore del contorno (pixel)** (`strokeWidth`) | da 0 a 50 | 1.5 | Lo spessore del contorno, in pixel (non cambia con lo zoom). |
| **Raggio dei punti (pixel)** (`pointRadius`) | da 0 a 50 | 3 | Il raggio dei punti, in pixel. |
| **Margine (pixel)** (`padding`) | da 0 a 1000 | 10 | Il margine attorno al disegno, in pixel. |
| **Larghezza (pixel)** (`width`) | da 10 a 4000 | 400 | La larghezza del disegno in pixel; l'altezza segue le proporzioni. |
| **La y va verso l'alto (come in matematica)** (`flipY`) | sì / no | sì | Se attivo, la y va verso l'alto come in matematica (in SVG di norma va verso il basso). |

## Come funziona

Cosa viene disegnato: un **punto** come un pallino; un **cerchio**, un'**ellisse** (anche ruotata), un **rettangolo**, un **poligono** come la figura; una **retta** come il segmento tra i due punti che la definiscono (non è infinita); una **parabola** e un'**iperbole** come una curva campionata vicino al vertice. Tutte le figure hanno gli stessi colori.

Il blocco è pensato per essere semplice e sicuro: nel testo ci sono solo numeri calcolati e i due colori, che vengono controllati (un colore con caratteri strani, come `"><script>` o `url(#x)`, dà un errore) e comunque protetti. Il disegno è centrato e riempie la larghezza scelta.

## Esempi

### 1. Un cerchio e un punto

```
[Cerchio: centro (0,0) r 5] cerchio ──▶ shapes [Lista] lista ──▶ shapes [Figura → SVG] svg ──▶ valore [Print (console.log)]
[Punto: (1, 1)]             punto  ──▶ shapes [Lista]
```

Esce un testo come `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="…"><circle … /><circle … /></svg>`. Mostralo con un componente che sa disegnare HTML o salvalo in un file `.svg`.

### 2. Un poligono colorato

Con **Colore del contorno** `#1f6feb` e **Colore di riempimento** `#cfe3ff`, il poligono di [Poligono (area · perimetro)](plane.polygon) esce con un contorno blu e il riempimento azzurro. Mettendo insieme le coniche di [Coniche (ellisse · parabola · iperbole)](plane.conic) si disegnano ellisse, parabola e iperbole nello stesso SVG.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Non è un punto né una figura: «…» | Il valore non è un punto, una lista di punti o una figura. |
| Figura sconosciuta: «…» | Una figura ha un `kind` che il blocco non conosce. |
| Colore non valido: «…» | Il colore del contorno o di riempimento non è nei formati ammessi: il messaggio dice quale (`contorno` o `riempimento`). |
| Non c'è niente da disegnare | La lista è vuota. |

## Vedi anche

- [Poligono (area · perimetro)](plane.polygon), [Cerchio](plane.circle), [Coniche (ellisse · parabola · iperbole)](plane.conic), [Retta per due punti](plane.line) per le figure da disegnare
- [Rettangolo di ingombro](plane.bounds) per le dimensioni del disegno
- [Come funziona un blocco](ide/blocks)
