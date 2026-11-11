# Angolo di un punto (Math.atan2)

`trig.atan2` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Trova l'angolo di un punto (x, y) rispetto all'asse x, nel quadrante giusto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **y** (`y`) | numero | La coordinata y del punto. |
| **x** (`x`) | numero | La coordinata x del punto. |

Il blocco lavora quando **y** e **x** hanno un valore: se uno dei due manca, aspetta.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **angolo** (`angle`) | numero | L'angolo del punto, nell'**Unità** scelta e nell'**Intervallo** scelto. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Un valore non è un numero, o il punto è l'origine. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Unità** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità in cui esce l'angolo. |
| **Intervallo** (`range`) | Da −180° a 180°, Da 0° a 360° | Da −180° a 180° | In quale giro cade l'angolo. |

## Come funziona

A ogni coppia (y, x) il blocco calcola l'angolo della semiretta che va dall'origine al punto, contato dall'asse x positivo in senso antiorario, e lo manda su **angolo**.

- Con **Da −180° a 180°** i punti sotto l'asse x hanno un angolo negativo: (−1, −1) è −135°. Con **Da 0° a 360°** lo stesso punto è 225°. L'intervallo vale in qualsiasi unità (in radianti è da −π a π e da 0 a 2π; in giri da −0,5 a 0,5 e da 0 a 1).
- A differenza di [Funzioni inverse (Math.asin, Math.acos…)](trig.inverse) con **atan**, che dà solo angoli tra −90° e 90°, qui il segno di x e di y dice il quadrante.
- Un punto sull'asse x negativo (y = 0, x < 0) è 180° (con l'intervallo da −180° a 180° è 180°, non −180°).
- L'origine (0, 0) non ha un angolo: è un errore.
- Il risultato è arrotondato a **15 cifre significative**.

## Esempi

### 1. Il punto (1, 1)

```
[Costante · Variabile: 1] valore ──▶ y [Angolo di un punto: °] angolo ──▶ valore [Print (console.log)]
[Costante · Variabile: 1] valore ──▶ x
```

Scrive `45`.

### 2. Un punto in basso a sinistra

(y = −1, x = −1): con l'intervallo da −180° a 180° scrive `-135`; con da 0° a 360° scrive `225`.

### 3. Un punto sull'asse x negativo

(y = 0, x = −5): scrive `180`.

### 4. In radianti

(y = 1, x = 0), **Unità** radianti: scrive `1.5707963267949` (π ÷ 2).

### 5. Un punto qualsiasi

(y = 3, x = 4): scrive `36.869897645844`. Con y = −3 e intervallo da 0° a 360° scrive `323.130102354156`.

## Errori

| Messaggio | Quando |
|---|---|
| y: serve un numero | **y** non è un numero. |
| x: serve un numero | **x** non è un numero. |
| L'angolo non è definito per x = 0 e y = 0 | Il punto è l'origine. |

## Vedi anche

- [Cartesiane → polari](trig.toPolar) per avere anche la distanza dall'origine
- [Funzioni inverse (Math.asin, Math.acos…)](trig.inverse) per l'arcotangente semplice
- [Converti e normalizza angolo](trig.convert) per cambiare l'unità o l'intervallo di un angolo
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
