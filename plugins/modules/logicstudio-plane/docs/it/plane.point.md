# Punto 2D [x, y]

`plane.point` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Compone un **punto 2D** da due numeri: la lista `[x, y]`.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** | numero | La coordinata x. |
| **y** | numero | La coordinata y. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto [x, y]** (`point`) | lista | Il punto, la lista `[x, y]`. |
| **Exception** (`error`) | oggetto | Una coordinata non è un numero. |

## Come funziona

Il blocco aspetta **x** e **y**: quando li ha entrambi manda il punto, e lo rimanda a ogni nuovo valore. I numeri possono arrivare anche come testo (`"2,5"`).

Come in [Geometria solida](logicstudio-solid), un punto è una **lista** `[x, y]`: così va bene per i blocchi di [Liste e matrici](logicstudio-collections). Gli altri blocchi di questo pacchetto accettano un punto anche come oggetto `{x, y}` o come lista `[x, y, z]` (la z si ignora, perché qui si lavora nel piano). Per i punti nello spazio c'è [Punto 3D [x, y, z]](solid.point).

## Esempi

### 1. Un punto

```
[Costante: 3] valore ──▶ x [Punto 2D [x, y]]
[Costante: 4] valore ──▶ y [Punto 2D [x, y]] punto ──▶ valore [Print (console.log)]
```

Esce `[3, 4]`.

### 2. Numeri come testo

Con **x** = `"2,5"` e **y** = `"-1"` esce `[2.5, -1]`. Con il solo **x** collegato il blocco aspetta e non manda niente.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un numero: «…» | Un valore collegato non è un numero (un testo con un numero, come `"2,5"`, va bene). |

## Vedi anche

- [Coordinate di un punto 2D](plane.split), che fa il contrario
- [Punto 3D [x, y, z]](solid.point) per un punto nello spazio
- [Polari → cartesiane](trig.fromPolar) per partire da raggio e angolo
- [Come funziona un blocco](ide/blocks)
