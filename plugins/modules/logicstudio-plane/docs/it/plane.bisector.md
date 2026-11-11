# Asse · Bisettrice

`plane.bisector` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

L'**asse** di un segmento (la perpendicolare per il suo punto medio) o la **bisettrice** di un angolo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a [x, y]** (`a`) | lista | Il primo estremo del segmento, o un punto sul primo lato dell'angolo. |
| **b [x, y]** (`b`) | lista | Il secondo estremo del segmento, o un punto sul secondo lato dell'angolo. |
| **vertice [x, y]** (`vertex`) | lista | Il vertice dell'angolo. Serve solo per **Angolo a-vertice-b**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **retta** (`line`) | oggetto | La retta, come figura. |
| **equazione** (`equation`) | testo | L'equazione come testo. |
| **punto medio** (`midpoint`) | lista | Il punto medio del segmento. Esce solo per **Segmento a-b**. |
| **Exception** (`error`) | oggetto | Un valore non è un punto, o i punti coincidono. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Di** (`mode`) | Segmento a-b (asse) / Angolo a-vertice-b (bisettrice) | Segmento a-b (asse) | Di cosa fare l'asse o la bisettrice. |

## Come funziona

**Segmento a-b**: la retta perpendicolare ad `a-b` che passa per il suo punto medio; ogni suo punto è alla stessa distanza da **a** e da **b**.

**Angolo a-vertice-b**: l'angolo ha il vertice in **vertex** e i lati verso **a** e verso **b**. La bisettrice lo divide in due angoli uguali. Se i due lati sono opposti (angolo piatto) la bisettrice è la perpendicolare ai lati.

## Esempi

### 1. L'asse di un segmento

```
[Punto: (0, 0)] punto ──▶ a [Asse · Bisettrice: Segmento]
[Punto: (4, 0)] punto ──▶ b [Asse · Bisettrice: Segmento] equazione ──▶ valore [Print (console.log)]
```

Esce `x = 2` e il punto medio `[2, 0]`.

### 2. La bisettrice di un angolo retto

Con **vertex** = `(0, 0)`, **a** = `(1, 0)` e **b** = `(0, 1)` esce `y = x`. Con **a** = `(1, 0)` e **b** = `(-1, 0)` (angolo piatto) esce `x = 0`.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| I due punti coincidono: non definiscono una retta | I due punti sono lo stesso punto. |
| Il vertice coincide con un punto | Con **Angolo a-vertice-b**: **a** o **b** è nel vertice, e il lato non ha direzione. |

## Vedi anche

- [Punto medio · Lerp (t)](plane.midpoint) per il solo punto medio
- [Parallela · Perpendicolare](plane.parallel) per una perpendicolare per un punto qualsiasi
- [Intersezione](plane.intersect) per trovare il centro di un cerchio dall'incontro di due assi
- [Come funziona un blocco](ide/blocks)
