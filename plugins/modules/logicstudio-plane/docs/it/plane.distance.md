# Distanza (Math.hypot)

`plane.distance` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Misura la **distanza** di un punto da un altro punto, da una retta o da un segmento, e trova il punto più vicino.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto [x, y]** (`p`) | lista | Il punto da misurare. |
| **a [x, y]** (`a`) | lista | Il secondo punto, o il primo punto della retta o del segmento. |
| **b [x, y]** (`b`) | lista | Il secondo punto della retta o del segmento. Serve solo per **la retta** e **il segmento**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **distanza** (`distance`) | numero | La distanza, sempre positiva o zero. |
| **punto più vicino** (`closest`) | lista | Il punto più vicino a **p** sulla retta o sul segmento (il «piede» della perpendicolare), una lista `[x, y]`. Non esce per la distanza tra due punti. |
| **Exception** (`error`) | oggetto | Un valore non è un punto, o i due punti della retta coincidono. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Distanza del punto da** (`mode`) | un altro punto (p, a) / la retta per a e b / il segmento a-b | un altro punto (p, a) | Da cosa si misura. Vedi la tabella sotto. |

## Come funziona

È la formula `Math.hypot` per due punti; per gli altri casi si proietta **p** sull'oggetto e si misura il tratto. Per le distanze nello spazio e dal piano c'è [Distanza e punto medio](solid.distance) e [Distanza punto–piano](solid.planeDistance).

| Da cosa | Ingressi | Cosa si misura |
|---|---|---|
| Un altro punto | p, a | La distanza in linea retta tra **p** e **a**. |
| La retta per a e b | p, a, b | La distanza dalla retta che passa per **a** e **b** (infinita da tutte e due le parti). |
| Il segmento a-b | p, a, b | Come la retta, ma se la perpendicolare cade fuori dal segmento conta l'estremo più vicino. |

Con il segmento, se **a** e **b** sono lo stesso punto, la distanza è quella da quel punto.

## Esempi

### 1. Tra due punti

```
[Punto: (0, 0)] punto ──▶ p [Distanza (Math.hypot)]
[Punto: (3, 4)] punto ──▶ a [Distanza (Math.hypot)] distanza ──▶ valore [Print (console.log)]
```

Esce `5`.

### 2. Da una retta e da un segmento

| Da cosa | p | a | b | distanza | più vicino |
|---|---|---|---|---|---|
| retta | `[0, 5]` | `[0, 0]` | `[10, 0]` | `5` | `[0, 0]` |
| retta | `[20, 5]` | `[0, 0]` | `[10, 0]` | `5` | `[20, 0]` |
| segmento | `[13, 4]` | `[0, 0]` | `[10, 0]` | `5` | `[10, 0]` |

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| I due punti coincidono: non definiscono una retta | I due punti sono lo stesso punto. |

## Vedi anche

- [Distanza e punto medio](solid.distance) per la distanza e il punto medio nello spazio
- [Retta per due punti](plane.line) per avere la retta con la sua equazione
- [Intersezione](plane.intersect) per trovare dove due oggetti si incontrano
- [Come funziona un blocco](ide/blocks)
