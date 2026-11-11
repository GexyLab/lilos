# Cerchio

`plane.circle` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Un **cerchio** dal centro e dal raggio, o dai tre punti per cui passa: la figura, l'area e la circonferenza.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **centro [x, y]** (`center`) | lista | Il centro. Per **Centro e raggio**. |
| **raggio** (`radius`) | numero | Il raggio. Per **Centro e raggio**. |
| **punto 1 [x, y]** (`p1`) | lista | Il primo punto. Per **Tre punti**. |
| **punto 2 [x, y]** (`p2`) | lista | Il secondo punto. Per **Tre punti**. |
| **punto 3 [x, y]** (`p3`) | lista | Il terzo punto. Per **Tre punti**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **cerchio** (`circle`) | oggetto | La figura `{kind: "circle", center, radius}`, da dare a [Intersezione](plane.intersect), [Punto dentro figura](plane.inside), [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) e [Figura → SVG](plane.svg). |
| **centro** (`center`) | lista | Il centro. |
| **raggio** (`radius`) | numero | Il raggio. |
| **area** | numero | L'area `π·r²`. |
| **circonferenza** (`circumference`) | numero | La circonferenza `2·π·r`. |
| **Exception** (`error`) | oggetto | Un valore non è un punto o un numero, il raggio è negativo, o i tre punti sono allineati. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Definito da** (`mode`) | Centro e raggio / Tre punti | Centro e raggio | Come è definito il cerchio. |

## Come funziona

Con **Centro e raggio** il blocco aspetta **center** e **radius**. Con **Tre punti** aspetta **p1**, **p2**, **p3** e trova il cerchio che passa per tutti e tre (il cerchio circoscritto al triangolo); i punti allineati non ne hanno. Un raggio 0 è un cerchio ridotto a un punto, con area 0. Il cerchio è 2D: la z dei punti non conta.

## Esempi

### 1. Centro e raggio

```
[Punto: (1, 2)] punto ──▶ center [Cerchio]
[Costante: 3] valore ──▶ radius [Cerchio] area ──▶ valore [Print (console.log)]
```

L'area è `28.2743338823`, la circonferenza `18.8495559215`.

### 2. Per tre punti

Con `(0, 0)`, `(4, 0)` e `(0, 4)` il centro è `[2, 2]` e il raggio `2.82842712475`. Con `(0, 0)`, `(1, 1)` e `(2, 2)` (allineati) il blocco dà un errore.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Non è un numero: «…» | Un valore collegato non è un numero (un testo con un numero, come `"2,5"`, va bene). |
| Il raggio non può essere negativo | Con **Centro e raggio**: il raggio è minore di zero. |
| I tre punti sono allineati: non c'è un cerchio | Con **Tre punti**. |

## Vedi anche

- [Intersezione](plane.intersect) per l'incontro con rette e altri cerchi
- [Punto dentro figura](plane.inside) per sapere se un punto è nel cerchio
- [Risolvi triangolo (teoremi dei seni e del coseno)](trig.triangle) per il cerchio circoscritto e inscritto di un triangolo
- [Come funziona un blocco](ide/blocks)
