# Funzioni trigonometriche (Math.sin, Math.cos…)

`trig.fn` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Calcola seno, coseno, tangente, cotangente, secante o cosecante di un angolo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **angolo** (`angle`) | numero | L'angolo, nell'**Unità** scelta. Un testo con un numero (`"30,5"`) va bene. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore della funzione. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. L'angolo non è un numero, o la funzione non è definita per quell'angolo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`fn`) | sin, cos, tan, cot, sec, csc | sin | Quale funzione calcolare. |
| **Unità** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità in cui arriva l'angolo. |

## Come funziona

A ogni angolo che arriva il blocco calcola la funzione e manda il risultato su **valore**.

| Funzione | Vale | Non è definita quando |
|---|---|---|
| **sin** | seno | mai |
| **cos** | coseno | mai |
| **tan** | seno ÷ coseno | il coseno è 0 (90°, 270°…) |
| **cot** | coseno ÷ seno | il seno è 0 (0°, 180°…) |
| **sec** | 1 ÷ coseno | il coseno è 0 |
| **csc** | 1 ÷ seno | il seno è 0 |

- Gli **angoli retti sono esatti**: sin 180° dà `0` e non `1.22e-16`, cos 90° dà `0`. Per questo tan 90° è un **errore** e non un numero enorme (`1.6e16`). Vale per gradi, gradi centesimali e giri; in radianti solo per 0 (π non si scrive esattamente).
- Il risultato è arrotondato a **15 cifre significative**.
- Se il numero ha più giri (450° è 90° più un giro intero) il blocco lo tratta bene: tan 450° è un errore come tan 90°.
- Il blocco [Funzioni Math](core.math) fa seno e coseno solo in radianti; questo lavora nell'unità scelta.

## Esempi

### 1. Il seno di 30°

```
[Costante · Variabile: 30] valore ──▶ angolo [Funzioni trigonometriche: sin] valore ──▶ valore [Print (console.log)]
```

Scrive `0.5`.

### 2. Il coseno di 60°

Funzione **cos**, angolo 60: scrive `0.5`. Con angolo 90 scrive `0` (esatto).

### 3. La tangente di 1 radiante

Funzione **tan**, **Unità** radianti, angolo 1: scrive `1.5574077246549`.

### 4. Un quarto di giro

**Unità** giri, funzione **sin**, angolo 0,25: scrive `1`.

### 5. La cotangente di 30°

Funzione **cot**, angolo 30: scrive `1.73205080756888`.

## Errori

| Messaggio | Quando |
|---|---|
| angolo: serve un numero | L'angolo non è un numero (per esempio un testo come `"abc"`). |
| tan non è definita per 90° (cos = 0) | La funzione non è definita: **tan** o **sec** quando il coseno è 0, **cot** o **csc** quando il seno è 0 (qui `(sin = 0)`). Il nome della funzione e l'angolo cambiano (`1.5707963267949 rad`, `100 gon`, `0.25 giri`). |

## Vedi anche

- [Funzioni inverse (Math.asin, Math.acos…)](trig.inverse) per tornare dal valore all'angolo
- [Funzioni iperboliche (Math.sinh, Math.cosh…)](trig.hyperbolic)
- [Converti e normalizza angolo](trig.convert) per cambiare l'unità di un angolo
- [Funzioni Math](core.math) per seno e coseno in radianti
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
