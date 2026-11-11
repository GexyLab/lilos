# Punto dentro figura

`plane.inside` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Dice se un **punto** è dentro una figura, sul suo bordo o fuori: poligono, cerchio o rettangolo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **figura** (`shape`) | qualsiasi | La figura: un poligono, un cerchio o un rettangolo (come escono da [Poligono (area · perimetro)](plane.polygon), [Poligono regolare](plane.regular), [Cerchio](plane.circle), [Rettangolo di ingombro](plane.bounds)), oppure una lista di punti, che vale come poligono. |
| **punto [x, y]** (`point`) | lista | Il punto da controllare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **posizione** (`where`) | testo | Il testo `inside` (dentro), `edge` (sul bordo) o `outside` (fuori). |
| **dentro** (`inside`) | sì/no | **sì** se il punto è dentro, bordo escluso. |
| **sul bordo** (`edge`) | sì/no | **sì** se il punto è sul bordo. |
| **fuori** (`outside`) | sì/no | **sì** se il punto è fuori. |
| **Exception** (`error`) | oggetto | Un valore non è un punto o una figura, o la figura non è tra quelle supportate. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tolleranza per il bordo** (`epsilon`) | un numero | 1e-9 | La tolleranza per il bordo: un punto a questa distanza o meno dal contorno è «sul bordo». |

## Come funziona

Per il poligono si guarda prima se il punto è vicino a un lato (sul bordo, entro la tolleranza), poi si conta quante volte una semiretta uscente dal punto taglia il contorno: dispari vuol dire dentro. Per il cerchio si confronta la distanza dal centro con il raggio; per il rettangolo le coordinate con i suoi limiti. Con la tolleranza `0` il bordo è solo il contorno esatto, e un punto a 1e-10 dal contorno cade fuori. Il controllo è 2D.

## Esempi

### 1. Un punto e un quadrato

```
[Poligono: (0,0) (4,0) (4,4) (0,4)] poligono ──▶ shape [Punto dentro figura]
[Punto: (2, 2)] punto ──▶ point [Punto dentro figura] dentro ──▶ condizione [If · Else]
```

| Punto | posizione |
|---|---|
| `(2, 2)` | `inside` |
| `(4, 2)` | `edge` |
| `(0, 0)` | `edge` |
| `(5, 2)` | `outside` |

### 2. Cerchio e rettangolo

Con il cerchio di centro `(0, 0)` e raggio 5: `(3, 4)` è sul bordo (distanza 5), `(1, 1)` è dentro, `(4, 4)` è fuori. Con il rettangolo da `(0, 0)` a `(4, 3)` di [Rettangolo di ingombro](plane.bounds): `(2, 1)` è dentro, `(4, 1)` sul bordo, `(5, 1)` fuori. Una lista `[[0, 0], [4, 0], [0, 4]]` vale come triangolo: `(1, 1)` è dentro.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Non è un cerchio: «…» | Il valore non è la figura di un cerchio (vedi [Cerchio](plane.circle)). |
| Figura non supportata: «…» | La figura non è un poligono, un cerchio, un rettangolo o una lista di punti. |
| Servono almeno 3 punti | Il poligono ha meno di 3 punti. |

## Vedi anche

- [Poligono (area · perimetro)](plane.polygon), [Cerchio](plane.circle) e [Rettangolo di ingombro](plane.bounds) per costruire la figura
- [Distanza (Math.hypot)](plane.distance) per sapere quanto è lontano
- [Come funziona un blocco](ide/blocks)
