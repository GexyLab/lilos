# Interpolazione

`num.interpolate` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Trova una curva che **passa esattamente per** i punti dati, e dà il valore in un punto qualsiasi in mezzo (o una lista di punti), con tre metodi: lineare, polinomio di Lagrange, spline cubica naturale.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | lista | La lista delle x (non serve che siano in ordine). |
| **y** (`y`) | lista | La lista delle y, oppure una lista di punti `{x, y}` o `[x, y]`. |
| **in** (`at`) | qualsiasi | Dove calcolare: un numero, un'espressione, o una lista di numeri. Se non è collegato vale l'impostazione **x**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **y** (`y`) | qualsiasi | Il valore (o i valori, se **in** è una lista) della curva. |
| **f (funzione)** (`f`) | testo | La curva come funzione di testo, da collegare agli altri blocchi (per esempio [Campiona f](num.sample)). Non esce se sarebbe più lunga di 2000 caratteri (tanti punti). |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Metodo** (`method`) | Lineare / Polinomio di Lagrange / Spline cubica naturale | Spline cubica naturale | **Lineare** unisce i punti con segmenti. **Polinomio di Lagrange** è l'unico polinomio che passa per tutti (instabile con tanti punti). **Spline cubica naturale** è una curva liscia fatta di pezzi di terzo grado (la scelta di serie). |
| **x (se l'ingresso non è collegato)** (`at`) | un testo (numero o espressione) | `0` | Dove calcolare quando l'ingresso **in** non è collegato: un numero o un'espressione come `pi/2`. |
| **Ammetti x fuori dai dati** (`extrapolate`) | sì / no | no | Se attivata, si può chiedere un x fuori dall'intervallo dei dati (si prolunga il primo o l'ultimo pezzo). |
| **Variabile della funzione** (`variable`) | un testo | `x` | Il nome della variabile nella funzione di testo. |

## Come funziona

Il blocco aspetta di avere un valore su tutti gli ingressi collegati e calcola a ogni nuovo valore; non parte da solo all'avvio.

- I dati sono ordinati per x e i valori che non sono numeri sono tolti. Servono almeno 2 punti, al massimo 5000 (60 per Lagrange).
- Fuori dall'intervallo dei dati si ha un errore, a meno di attivare **Ammetti x fuori dai dati**: allora si prolunga il primo o l'ultimo pezzo (la spline naturale diventa una retta).
- La funzione **f** usa `max(0, x − x₀)` per unire i pezzi, così è una formula normale: la spline per (0, 0), (1, 1), (2, 4) è `0.5x + 0.5x^3 - max(0, x - 1)^3`. Con Lagrange è il polinomio. Con più di circa 40 punti la formula supera i 2000 caratteri e **f** non esce.

## Esempi

### 1. Una retta a pezzi

Dati (0, 0), (1, 1), (2, 4), metodo **Lineare**, in 1.5:

```
[Costante · Variabile (JSON): [0, 1, 2]] ──▶ x [Interpolazione]
[Costante · Variabile (JSON): [0, 1, 4]] ──▶ y
[Costante · Variabile: 1.5]             ──▶ in
```

**y** vale `2.5`, e **f** è `x + 2 * max(0, x - 1)`.

### 2. Una curva liscia

Gli stessi dati con la **Spline cubica naturale**:

```
[Interpolazione: spline] y ──▶ valore [Print (console.log)]
```

In 1.5 vale `2.3125`; passa esattamente per (0, 0), (1, 1), (2, 4).

### 3. Un polinomio

I punti di `x^3` in 0…4 con **Lagrange**, in 2.5:

```
[Interpolazione: Lagrange] y ──▶ valore [Print (console.log)]
```

Scrive `15.625` (2.5 al cubo): il polinomio è proprio `x^3`.

## Errori

| Messaggio | Quando |
|---|---|
| Servono dei dati: una lista di numeri o di punti | L'ingresso non è una lista. |
| Le liste x e y hanno lunghezze diverse (… e …) | Le due liste non hanno lo stesso numero di elementi. |
| Serve una lista di numeri per le x | L'ingresso **x** non è una lista. |
| Servono almeno 2 punti | Dopo aver tolto gli elementi che non sono numeri restano meno di 2 punti. |
| Troppi punti per interpolare (al massimo 5000) | I dati hanno più di 5000 punti. |
| Il polinomio di Lagrange è instabile con più di 60 punti: usa la spline | Con **Polinomio di Lagrange** i dati hanno più di 60 punti. |
| Due punti hanno la stessa x (…) | Nei dati c'è due volte la stessa x. |
| x = … è fuori dai dati (da … a …) | Il punto chiesto è fuori dall'intervallo dei dati e **Ammetti x fuori dai dati** è spenta. |
| x: serve un numero | Il valore **x** è vuoto o non è un numero. |
| x: serve un numero (o un'espressione come pi/2), non «…» | Il valore **x** è un testo che non è un numero né un'espressione di numeri (per esempio `abc`). |
| x: l'infinito non è ammesso qui | Il valore **x** è `inf` o `∞`. |
| La lista delle x ha più di 10000 elementi | Il punto è una lista troppo lunga. |
| Nome di variabile non valido: «…» | Un nome di variabile non va bene (deve cominciare con una lettera o `_`, al massimo 16 caratteri; non può essere una funzione né `pi` o `e`). |

## Vedi anche

- [Regressione (fit)](num.fit) per una curva che passa vicino ai punti senza toccarli tutti
- [Campiona f](num.sample) per ottenere dati da una funzione
- [Ricampiona (resample)](sig.resample) per ricampionare un segnale
- [Dispersione](charts.scatter) per disegnare i punti
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
