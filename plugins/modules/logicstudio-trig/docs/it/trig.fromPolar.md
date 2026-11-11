# Polari → cartesiane

`trig.fromPolar` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Trasforma coordinate polari (distanza e angolo) in un punto (x, y).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **r (distanza)** (`r`) | numero | La distanza dall'origine. Se è negativa il punto è dalla parte opposta. |
| **θ (angolo)** (`angle`) | numero | L'angolo, nell'**Unità** scelta, contato dall'asse x positivo in senso antiorario. |

Il blocco lavora quando **r** e **θ** hanno un valore: se uno dei due manca, aspetta.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | numero | La coordinata x, `r × cos θ`. |
| **y** (`y`) | numero | La coordinata y, `r × sin θ`. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Un valore non è un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Unità** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità in cui arriva l'angolo. |

## Come funziona

A ogni coppia (r, θ) il blocco calcola `x = r × cos θ` e `y = r × sin θ` e li manda su **x** e **y**.

- Gli **angoli retti sono esatti**: con θ = 90° il punto è (0, r) e non (1.2e-16, r). Vale per gradi, gradi centesimali e giri; in radianti solo per 0, perché π non si scrive esattamente (θ = π rad dà y `1.22464679914735e-16`, non 0).
- Un angolo più grande di un giro, o negativo, va bene: −90° è lo stesso punto di 270°.
- I risultati sono arrotondati a **15 cifre significative**.
- Per il contrario usa [Cartesiane → polari](trig.toPolar).

## Esempi

### 1. Un punto sull'asse y

```
[Costante · Variabile: 2] valore ──▶ r (distanza) [Polari → cartesiane: °] y ──▶ valore [Print (console.log)]
[Costante · Variabile: 90] valore ──▶ θ (angolo)
```

Scrive `2`. La x è `0`.

### 2. Un angolo di 30°

r = 10, θ = 30°: x `8.66025403784439`, y `5`.

### 3. Mezzo giro

r = 5, θ = 180°: x `-5`, y `0`.

### 4. In giri

r = 1, θ = 0,125 giri (45°): x `0.707106781186548`, y `0.707106781186547`. Le due ultime cifre possono differire per gli arrotondamenti del computer.

### 5. Tornare al punto di partenza

r = 5, θ = 53.13010235415598°: x `3`, y `4`. Con θ = −90° e r = 2: x `0`, y `-2`.

## Errori

| Messaggio | Quando |
|---|---|
| r: serve un numero | **r** non è un numero. |
| angolo: serve un numero | **θ** non è un numero. |

## Vedi anche

- [Cartesiane → polari](trig.toPolar) per il contrario
- [Funzioni trigonometriche (Math.sin, Math.cos…)](trig.fn)
- [Coordinate](solid.coords) per le coordinate sferiche e cilindriche (pacchetto [Geometria solida](logicstudio-solid))
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
