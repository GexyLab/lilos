# Coniche (ellisse · parabola · iperbole)

`plane.conic` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Una **conica** dai suoi parametri: ellisse, parabola o iperbole, con fuochi, vertici, eccentricità ed equazione scritta.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **centro / vertice [x, y]** (`center`) | lista | Il centro dell'ellisse e dell'iperbole, o il vertice della parabola. |
| **a** | numero | Ellisse: il semiasse **lungo l'asse principale**. Iperbole: il semiasse reale (dal centro al vertice). Non serve alla parabola. |
| **b** | numero | Ellisse: l'altro semiasse. Iperbole: il semiasse immaginario (determina le pendenze degli asintoti, `±b/a`). Non serve alla parabola. |
| **p (parabola)** (`p`) | numero | Parabola: la distanza dal vertice al fuoco, con segno (negativo = apre dall'altra parte). Non serve a ellisse e iperbole. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **conica** (`conic`) | oggetto | La figura: `{kind: "ellipse", center, rx, ry, rotation}`, `{kind: "parabola", vertex, p, orientation}` o `{kind: "hyperbola", center, a, b, orientation}`. Si può dare a [Figura → SVG](plane.svg), [Rettangolo di ingombro](plane.bounds) e [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform). |
| **fuochi** (`foci`) | lista | Una lista di punti: i due fuochi (ellisse, iperbole) o il fuoco (parabola). In un cerchio i due fuochi coincidono con il centro. |
| **vertici** (`vertices`) | lista | Una lista di punti: i 4 vertici dell'ellisse, i 2 dell'iperbole, il vertice della parabola. |
| **eccentricità** (`eccentricity`) | numero | L'eccentricità: da 0 (cerchio) a 1 (esclusa) per l'ellisse, 1 per la parabola, maggiore di 1 per l'iperbole. |
| **equazione** (`equation`) | testo | L'equazione come testo, per esempio `x²/25 + y²/9 = 1`. |
| **direttrice** (`directrix`) | testo | La direttrice come testo (`x = -2`). Esce solo per la parabola. |
| **area** | numero | L'area `π·a·b`. Esce solo per l'ellisse. |
| **Exception** (`error`) | oggetto | Un valore non è un punto o un numero, i semiassi non sono positivi, o `p` è zero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Conica** (`kind`) | Ellisse / Parabola / Iperbole | Ellisse | Che conica. |
| **Asse principale** (`orientation`) | Orizzontale (x) / Verticale (y) | Orizzontale (x) | L'asse principale: orizzontale (lungo x) o verticale (lungo y). Per l'ellisse e l'iperbole è l'asse su cui sta **a**; per la parabola è l'asse di simmetria. |

## Come funziona

Le coniche hanno sempre gli assi paralleli agli assi x e y; per ruotarle usa [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) (l'ellisse si ruota, la parabola e l'iperbole no).

| Conica | Equazione (asse orizzontale) | Fuochi | Eccentricità |
|---|---|---|---|
| Ellisse | `(x-h)²/a² + (y-k)²/b² = 1` | sull'asse più lungo, a distanza `√\|a²-b²\|` dal centro | `c/semiasse maggiore` |
| Iperbole | `(x-h)²/a² - (y-k)²/b² = 1` | a distanza `√(a²+b²)` dal centro, sull'asse principale | `c/a` |
| Parabola | `(y-k)² = 4p(x-h)` | a distanza `p` dal vertice, sull'asse | 1 |

Con l'asse **verticale** x e y si scambiano: l'ellisse ha **a** lungo y, l'iperbole `(y-k)²/a² - (x-h)²/b² = 1`, la parabola `(x-h)² = 4p(y-k)`. Nelle equazioni scritte, se il centro è nell'origine il termine si scrive `x²`, altrimenti `(x - 1)²` o `(x + 2)²`.

## Esempi

### 1. Un'ellisse

```
[Punto: (0, 0)] punto ──▶ center [Coniche: Ellisse]
[Costante: 5] valore ──▶ a [Coniche: Ellisse]
[Costante: 3] valore ──▶ b [Coniche: Ellisse] equazione ──▶ valore [Print (console.log)]
```

Esce `x²/25 + y²/9 = 1`. I fuochi sono `(-4, 0)` e `(4, 0)`, l'eccentricità `0.8`, l'area `47.1238898038`. Con l'asse verticale, centro `(1, -2)`: `(x - 1)²/9 + (y + 2)²/25 = 1` e fuochi `(1, -6)` e `(1, 2)`.

### 2. Parabola e iperbole

| Conica | Ingressi | Esce |
|---|---|---|
| Parabola | centro `(0, 0)`, p = 2 | `y² = 8x`, fuoco `(2, 0)`, direttrice `x = -2` |
| Parabola, asse verticale | centro `(1, 3)`, p = -1 | `(x - 1)² = -4(y - 3)`, fuoco `(1, 2)`, direttrice `y = 4` |
| Iperbole | centro `(0, 0)`, a = 3, b = 4 | `x²/9 - y²/16 = 1`, fuochi `(-5, 0)` e `(5, 0)`, eccentricità `1.66666666667` |

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Non è un numero: «…» | Un valore collegato non è un numero (un testo con un numero, come `"2,5"`, va bene). |
| I semiassi devono essere maggiori di zero | Con ellisse o iperbole: **a** o **b** è zero o negativo. |
| Il parametro p non può essere zero | Con la parabola: **p** è zero. |

## Vedi anche

- [Cerchio](plane.circle) per il cerchio
- [Figura → SVG](plane.svg) per disegnare la conica
- [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) per ruotare l'ellisse
- [Come funziona un blocco](ide/blocks)
