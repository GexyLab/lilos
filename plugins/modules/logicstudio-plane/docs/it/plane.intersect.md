# Intersezione

`plane.intersect` · Geometria · [Geometria piana](logicstudio-plane) · versione 1

Dove due oggetti si **incontrano**: due rette, due segmenti, una retta e un cerchio, due cerchi. Dice anche quando non si incontrano.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | qualsiasi | Il primo oggetto. Una retta è la figura di [Retta per due punti](plane.line), una lista di due punti `[[x1, y1], [x2, y2]]` o un oggetto `{a, b, c}`; un cerchio è la figura di [Cerchio](plane.circle). |
| **b** | qualsiasi | Il secondo oggetto, dello stesso genere. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punti [[x, y], …]** (`points`) | lista | La lista dei punti in comune, ciascuno una lista `[x, y]` (vuota se non ce ne sono). |
| **primo punto** (`point`) | lista | Il primo punto, una lista `[x, y]`. Non esce se non ce ne sono. |
| **quanti** (`count`) | numero | Quanti punti: 0, 1 o 2. |
| **trovato** (`found`) | sì/no | **sì** se c'è almeno un punto, **no** altrimenti. |
| **nessuna** (`none`) | impulso | Un impulso quando i due oggetti **non** si incontrano. |
| **Exception** (`error`) | oggetto | Un oggetto non è del tipo atteso, o i due oggetti coincidono (infiniti punti in comune). |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tra** (`mode`) | Due rette / Due segmenti / Una retta e un cerchio / Due cerchi | Due rette | Tra quali oggetti cercare. |
| **Tolleranza (ε)** (`epsilon`) | un numero | 1e-9 | La tolleranza (ε) con cui si decide che due rette sono parallele o che una retta è tangente. |

## Come funziona

| Tra | Oggetti | Punti possibili |
|---|---|---|
| Due rette | **a**, **b** rette | 0 (parallele) o 1 |
| Due segmenti | **a**, **b** segmenti (la retta di [Retta per due punti](plane.line) vale come il segmento tra i suoi due punti, e una lista di due punti è il segmento) | 0 o 1 |
| Una retta e un cerchio | una retta e un cerchio, in qualsiasi ordine | 0, 1 (tangente) o 2 |
| Due cerchi | **a**, **b** cerchi | 0, 1 (tangenti) o 2 |

Quando i punti ci sono escono **points**, **point**, **count** e **found** = sì. Quando non ci sono esce l'impulso **none**, **found** è no e **count** è 0.

Due rette uguali, due cerchi uguali o due segmenti che si sovrappongono hanno **infiniti** punti in comune: il blocco dà un errore, perché la lista non potrebbe contenerli. Due segmenti che si toccano in un solo estremo hanno quel punto in comune. Per l'incontro di una retta con un piano nello spazio c'è [Intersezione retta–piano](solid.linePlane).

## Esempi

### 1. Due rette che si incrociano

```
[Retta (0,0)-(2,2)] retta ──▶ a [Intersezione: Due rette]
[Retta (0,2)-(2,0)] retta ──▶ b [Intersezione: Due rette] punto ──▶ valore [Print (console.log)]
                                                 nessuna ──▶ [Print: «parallele»]
```

Esce il punto `[1, 1]`. Con due rette parallele (`(0,0)-(1,0)` e `(0,1)-(1,1)`) esce invece l'impulso **nessuna**.

### 2. Cerchi e rette

Con il cerchio di centro `(0, 0)` e raggio 5:

| Con | Esce |
|---|---|
| la retta `y = 0` | `[[-5, 0], [5, 0]]` |
| la retta `y = 5` (tangente) | `[[0, 5]]` |
| la retta `y = 6` | nessun punto, impulso **nessuna** |
| il cerchio di centro `(8, 0)` e raggio 5 | `[[4, 3], [4, -3]]` |
| il cerchio di centro `(10, 0)` e raggio 5 | `[[5, 0]]` |

## Errori

| Messaggio | Quando |
|---|---|
| Non è una retta: «…» | Il valore non è una retta: serve la retta di [Retta per due punti](plane.line), una lista di due punti `[[x1, y1], [x2, y2]]` o un oggetto `{a, b, c}`. |
| Non è un cerchio: «…» | Il valore non è la figura di un cerchio (vedi [Cerchio](plane.circle)). |
| Non è un punto: «…» | Un valore collegato non è un punto: serve una lista `[x, y]` (va bene anche `[x, y, z]`, la z si ignora) o un oggetto `{x, y}`. |
| Le rette coincidono: i punti in comune sono infiniti | Con **Due rette**: sono la stessa retta. |
| I segmenti si sovrappongono: i punti in comune sono infiniti | Con **Due segmenti**: stanno sulla stessa retta e hanno un tratto in comune. |
| I cerchi coincidono: i punti in comune sono infiniti | Con **Due cerchi**: stesso centro e stesso raggio. |
| I due punti coincidono: non definiscono una retta | I due punti sono lo stesso punto. |

## Vedi anche

- [Retta per due punti](plane.line) e [Cerchio](plane.circle) per costruire gli oggetti
- [Punto dentro figura](plane.inside) per sapere se un punto è dentro una figura
- [Distanza (Math.hypot)](plane.distance) per la distanza tra punto e retta
- [Intersezione retta–piano](solid.linePlane) per l'incontro di una retta con un piano
- [Come funziona un blocco](ide/blocks)
