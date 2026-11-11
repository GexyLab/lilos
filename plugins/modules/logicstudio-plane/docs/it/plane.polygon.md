# Poligono (area · perimetro)

`plane.polygon` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Un **poligono** da una lista di punti: area (formula dei lacci, *shoelace*), perimetro, baricentro, se è convesso e il verso dei vertici.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punti [[x, y], …]** (`points`) | lista | I vertici, in ordine lungo il contorno: una lista di punti (almeno 3). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **poligono** (`polygon`) | oggetto | La figura `{kind: "polygon", points}`, da dare a [Punto dentro figura](plane.inside), [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) e [Figura → SVG](plane.svg). |
| **area** | numero | L'area, sempre positiva. |
| **perimetro** (`perimeter`) | numero | Il perimetro (il contorno è chiuso: l'ultimo vertice torna al primo). |
| **baricentro** (`centroid`) | lista | Il baricentro (il centro di massa della figura piena). |
| **convesso** (`convex`) | sì/no | **sì** se il poligono è convesso (nessun angolo rientrante). |
| **orientamento** (`orientation`) | testo | `ccw` se i vertici vanno in senso antiorario, `cw` se in senso orario, `none` se l'area è zero. |
| **vertici** (`count`) | numero | Quanti vertici. |
| **Exception** (`error`) | oggetto | L'ingresso non è una lista di punti, o ha meno di 3 punti. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tolleranza (ε)** (`epsilon`) | un numero | 1e-9 | La tolleranza (ε) con cui tre vertici di fila si considerano allineati, per decidere se il poligono è convesso. |

## Come funziona

I vertici vanno dati in ordine lungo il contorno, in senso orario o antiorario. L'area e il baricentro sono quelli di un poligono **semplice** (il contorno non si taglia da solo): per un poligono con il contorno intrecciato, come una stella a cinque punte disegnata senza staccare la penna, il risultato non ha un significato geometrico. Un poligono intrecciato non è mai convesso.

Con l'area zero (vertici allineati) il baricentro è la media dei vertici e l'orientamento è `none`. Il poligono è 2D: la z dei punti non conta.

## Esempi

### 1. Un rettangolo

```
[Lista: (0,0) (4,0) (4,3) (0,3)] lista ──▶ points [Poligono (area · perimetro)] area ──▶ valore [Print (console.log)]
```

| Uscita | Valore |
|---|---|
| area | `12` |
| perimetro | `14` |
| baricentro | `[2, 1.5]` |
| convesso | sì |
| verso | `ccw` |
| vertici | `4` |

Con gli stessi punti in ordine inverso il verso è `cw` e il resto non cambia.

### 2. Non convesso

Con `(0, 0)`, `(4, 0)`, `(1, 1)`, `(0, 4)` il vertice `(1, 1)` è rientrante e **convesso** è no. Con `(0, 0)`, `(2, 0)`, `(4, 0)`, `(4, 3)`, `(0, 3)` il vertice `(2, 0)` è sul lato e **convesso** resta sì.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista di punti | L'ingresso non è una lista. |
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Servono almeno 3 punti | La lista ha meno di 3 punti. |

## Vedi anche

- [Inviluppo convesso](plane.hull) per l'inviluppo convesso di una nuvola di punti
- [Poligono regolare](plane.regular) per un poligono regolare
- [Punto dentro figura](plane.inside) per sapere se un punto è dentro
- [Rettangolo di ingombro](plane.bounds) per il rettangolo che lo contiene
- [Come funziona un blocco](ide/blocks)
