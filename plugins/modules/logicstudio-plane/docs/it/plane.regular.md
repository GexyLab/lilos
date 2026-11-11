# Poligono regolare

`plane.regular` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Un **poligono regolare** (lati e angoli tutti uguali) dal numero di lati e dal raggio: i vertici, l'area, l'apotema e il lato.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lati** (`n`) | numero | Il numero di lati. Se non è collegato vale l'impostazione **Lati**. |
| **raggio** (`radius`) | numero | Il raggio: la distanza dal centro ai vertici. |
| **centro [x, y]** (`center`) | lista | Il centro. Se non è collegato è l'origine `(0, 0)`. |
| **rotazione** (`rotation`) | numero | La rotazione: l'angolo del primo vertice, misurato dall'asse x in senso antiorario. Se non è collegata vale 0. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **poligono** (`polygon`) | oggetto | La figura `{kind: "polygon", points}`. |
| **vertici** (`vertices`) | lista | La lista dei vertici, in senso antiorario, il primo a distanza **radius** dal centro nella direzione della rotazione. |
| **area** | numero | L'area. |
| **apotema** (`apothem`) | numero | L'apotema: la distanza dal centro al punto medio di un lato. |
| **lato** (`side`) | numero | La lunghezza del lato. |
| **perimetro** (`perimeter`) | numero | Il perimetro. |
| **angolo interno** (`interior`) | numero | L'angolo interno, nell'unità scelta. |
| **Exception** (`error`) | oggetto | Un valore non è un numero o un punto, i lati non sono un intero da 3 a 1000, o il raggio è negativo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Lati (se non collegato)** (`sides`) | da 3 a 1000 | 6 | Il numero di lati quando **n** non è collegato (da 3 a 1000). |
| **Unità degli angoli** (`unit`) | Gradi (°) / Radianti (rad) / Gradi centesimali (gon) | Gradi (°) | L'unità della rotazione e dell'angolo interno. |

## Come funziona

Il blocco aspetta **radius**. Il lato è `2·r·sin(π/n)`, l'apotema `r·cos(π/n)`, l'area `½·n·r²·sin(2π/n)` e l'angolo interno `(n-2)·180°/n`. Per un esagono di raggio 1 il lato è 1.

## Esempi

### 1. Un esagono

```
[Costante: 1] valore ──▶ radius [Poligono regolare: 6 lati] area ──▶ valore [Print (console.log)]
```

Area `2.59807621135`, apotema `0.866025403784`, lato `1`, perimetro `6`, angolo interno `120`. Il primo vertice è `[1, 0]`.

### 2. Un quadrato ruotato

Con **n** = `4`, **radius** = `2`, **center** = `(1, 1)` e **rotation** = `45` si ottiene un quadrato con i lati paralleli agli assi: lato `2.82842712475` e primo vertice `[2.41421356237, 2.41421356237]`.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un numero: «…» | Un valore collegato non è un numero (un testo con un numero, come `"2,5"`, va bene). |
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| I lati devono essere un intero da 3 a 1000 | Il numero di lati è 2, 3.5, 1001… |
| Il raggio non può essere negativo | Il raggio è minore di zero. |

## Vedi anche

- [Poligono (area · perimetro)](plane.polygon) per un poligono qualsiasi
- [Cerchio](plane.circle) per il cerchio circoscritto
- [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) per spostarlo
- [Come funziona un blocco](ide/blocks)
