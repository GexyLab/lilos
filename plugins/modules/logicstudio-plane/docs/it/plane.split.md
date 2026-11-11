# Coordinate di un punto 2D

`plane.split` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Scompone un **punto 2D** nelle sue coordinate x e y.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto [x, y]** (`point`) | lista | Il punto: una lista `[x, y]` (anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** | numero | La coordinata x. |
| **y** | numero | La coordinata y. |
| **Exception** (`error`) | oggetto | Il valore non è un punto. |

## Come funziona

A ogni punto che arriva il blocco manda le due coordinate insieme. Per un punto nello spazio c'è [Coordinate di un punto](solid.pointXYZ).

## Esempi

### 1. Le coordinate di un punto

```
[Punto: (3, 4)] punto ──▶ point [Coordinate di un punto 2D] x ──▶ valore [Print (console.log)]
```

Esce `3`. Dalla porta **y** esce `4`.

### 2. Da un oggetto o da una lista a tre valori

Con `{"x": 1, "y": 2}` si ottiene x = 1, y = 2. Con la lista `[1, 2, 7]` si ottiene ancora x = 1, y = 2: la z non conta.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |

## Vedi anche

- [Punto 2D [x, y]](plane.point), che fa il contrario
- [Coordinate di un punto](solid.pointXYZ) per un punto nello spazio
- [Come funziona un blocco](ide/blocks)
