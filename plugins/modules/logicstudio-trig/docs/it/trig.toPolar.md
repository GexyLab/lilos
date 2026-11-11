# Cartesiane → polari

`trig.toPolar` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Trasforma un punto (x, y) in coordinate polari: la distanza dall'origine e l'angolo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | numero | La coordinata x del punto. |
| **y** (`y`) | numero | La coordinata y del punto. |

Il blocco lavora quando **x** e **y** hanno un valore: se uno dei due manca, aspetta.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **r (distanza)** (`r`) | numero | La distanza del punto dall'origine, `√(x² + y²)`. Mai negativa. |
| **θ (angolo)** (`angle`) | numero | L'angolo del punto, nell'**Unità** scelta e nell'**Intervallo** scelto. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Un valore non è un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Unità** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità in cui esce l'angolo. |
| **Intervallo** (`range`) | Da −180° a 180°, Da 0° a 360° | Da 0° a 360° | In quale giro cade l'angolo. |

## Come funziona

A ogni coppia (x, y) il blocco calcola la distanza `r = √(x² + y²)` e l'angolo θ della semiretta che va dall'origine al punto, contato dall'asse x positivo in senso antiorario.

- Con **Da 0° a 360°** (di serie) un punto in basso a sinistra come (−1, −1) ha l'angolo 225°; con **Da −180° a 180°** ha −135°.
- L'origine (0, 0) non dà un errore: **r** vale 0 e **θ** vale 0.
- Il risultato è arrotondato a **15 cifre significative**.
- Per avere solo l'angolo, con l'errore sull'origine, usa [Angolo di un punto (Math.atan2)](trig.atan2) (qui l'intervallo di serie è l'altro).
- Per il contrario usa [Polari → cartesiane](trig.fromPolar).

## Esempi

### 1. Il punto (3, 4)

```
[Costante · Variabile: 3] valore ──▶ x [Cartesiane → polari: °] r ──▶ valore [Print (console.log)]
[Costante · Variabile: 4] valore ──▶ y
```

Scrive `5`. L'angolo θ è `53.130102354156`.

### 2. Un punto in basso a sinistra

(x = −1, y = −1): r `1.4142135623731` e θ `225`. Con l'intervallo da −180° a 180° θ è `-135`.

### 3. Sull'asse y negativo

(x = 0, y = −2): r `2`, θ `270`.

### 4. In radianti e l'origine

(x = 0, y = 2), **Unità** radianti: r `2`, θ `1.5707963267949`. Il punto (0, 0) dà r `0` e θ `0`.

### 5. In giri

(x = 6, y = 8), **Unità** giri: r `10`, θ `0.147583617650433`.

## Errori

| Messaggio | Quando |
|---|---|
| x: serve un numero | **x** non è un numero. |
| y: serve un numero | **y** non è un numero. |

## Vedi anche

- [Polari → cartesiane](trig.fromPolar) per il contrario
- [Angolo di un punto (Math.atan2)](trig.atan2) per il solo angolo
- [Coordinate](solid.coords) per le coordinate sferiche e cilindriche (pacchetto [Geometria solida](logicstudio-solid))
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
