# Punto medio · Lerp (t)

`plane.midpoint` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Il **punto medio** tra due punti, o un punto qualsiasi del segmento che li unisce (interpolazione lineare, *lerp*).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a [x, y]** (`a`) | lista | Il primo punto (quello di `t = 0`). |
| **b [x, y]** (`b`) | lista | Il secondo punto (quello di `t = 1`). |
| **t** | numero | Dove stare tra **a** e **b**. Se non è collegato vale l'impostazione **t**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto [x, y]** (`point`) | lista | Il punto `a + (b - a) × t`, una lista `[x, y]`. |
| **Exception** (`error`) | oggetto | Un valore non è un punto o un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **t (se non collegato)** (`t`) | un numero | 0.5 | Il valore di **t** quando l'ingresso non è collegato. `0.5` è il punto medio. |

## Come funziona

Con `t = 0` esce **a**, con `t = 1` esce **b**, con `t = 0.5` il punto medio. **t** può anche uscire dall'intervallo da 0 a 1: `t = 2` è il punto oltre **b**, alla stessa distanza di **b** da **a**; `t = -1` è il punto dall'altra parte di **a**. Per due punti nello spazio [Distanza e punto medio](solid.distance) dà il punto medio.

## Esempi

### 1. Il punto medio

```
[Punto: (0, 0)] punto ──▶ a [Punto medio · Lerp (t)]
[Punto: (4, 2)] punto ──▶ b [Punto medio · Lerp (t)] punto ──▶ valore [Print (console.log)]
```

Esce `[2, 1]`.

### 2. Un movimento

Con **a** = `(0, 0)`, **b** = `(10, 0)` e **t** che arriva da un cursore da 0 a 1, il punto scorre da una parte all'altra: `t = 0.1` dà `[1, 0]`, `t = 2` dà `[20, 0]`.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Non è un numero: «…» | Un valore collegato non è un numero (un testo con un numero, come `"2,5"`, va bene). |

## Vedi anche

- [Distanza (Math.hypot)](plane.distance) per la distanza
- [Asse · Bisettrice](plane.bisector) per l'asse di un segmento
- [Distanza e punto medio](solid.distance) per la distanza e il punto medio nello spazio
- [Come funziona un blocco](ide/blocks)
