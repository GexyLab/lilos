# Regressione (fit)

`num.fit` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Trova la curva che **meglio approssima** i dati (regressione ai minimi quadrati): una retta, un polinomio, un esponenziale, un logaritmo o una potenza. Dà i coefficienti, la curva come funzione, quanto bene si adatta (R²) e, se serve, un valore previsto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | lista | La lista delle x. Se manca, le x sono 0, 1, 2… |
| **y** (`y`) | lista | La lista delle y, oppure una lista di punti `{x, y}` o `[x, y]`. |
| **at** (`at`) | numero | Una x in cui dare il valore della curva. Se non è collegato vale l'impostazione **x per il valore**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **coefficienti** (`coefficients`) | lista | I coefficienti della curva (vedi **Come funziona**). |
| **f (funzione)** (`f`) | testo | La curva come funzione di testo, da collegare agli altri blocchi. |
| **R²** (`r2`) | numero | R², da 0 a 1: 1 vuol dire che la curva passa per tutti i punti, 0 che non spiega niente. |
| **errore quadratico medio** (`rmse`) | numero | L'errore quadratico medio: la distanza tipica tra i dati e la curva, nelle unità di y. |
| **valore in x** (`prediction`) | numero | Il valore della curva nella x chiesta (esce solo se c'è una x). |
| **residui** (`residuals`) | lista | Le differenze tra i dati e la curva, una per punto. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Modello** (`model`) | Lineare: y = a·x + b / Polinomio di grado n / Esponenziale: y = a·e^(b·x) / Logaritmica: y = a + b·ln x / Potenza: y = a·x^b | Lineare: y = a·x + b | La famiglia di curve. **Lineare** `y = a·x + b`; **Polinomio** di grado n; **Esponenziale** `y = a·e^(b·x)`; **Logaritmica** `y = a + b·ln x`; **Potenza** `y = a·x^b`. |
| **Grado n** (`degree`) | numero (da 1 a 12) | `2` | Il grado del polinomio (da 1 a 12). |
| **Variabile della funzione** (`variable`) | un testo | `x` | Il nome della variabile nella funzione di testo. |
| **x per il valore (vuoto: nessuno)** (`at`) | un testo (numero o espressione, o vuoto) | vuoto | Una x per cui dare il valore (vuoto: nessuno), quando **in** non è collegato. |

## Come funziona

Il blocco aspetta di avere un valore su tutti gli ingressi collegati e calcola a ogni nuovo valore; non parte da solo all'avvio.

- **Coefficienti**: lineare `[a, b]` per `a·x + b`; polinomio dal grado più alto, `[c₂, c₁, c₀]`; esponenziale `[a, b]`; logaritmica `[a, b]` per `a + b·ln x`; potenza `[a, b]`. I coefficienti trascurabili (uno su mille miliardi del più grande) sono messi a 0.
- Esponenziale, logaritmica e potenza si calcolano con i logaritmi, quindi vogliono dati positivi.
- Servono almeno tanti punti quanti sono i coefficienti; con un grado alto i risultati possono essere instabili.
- Un R² alto non dice che il modello sia giusto: guarda anche i **residui**.

## Esempi

### 1. Una retta

I punti (0, 1), (1, 3), (2, 5), (3, 7):

```
[Costante · Variabile (JSON): [0, 1, 2, 3]] ──▶ x [Regressione]
[Costante · Variabile (JSON): [1, 3, 5, 7]] ──▶ y
```

**coefficienti** `[2, 1]`, **f** `2 * x + 1`, **R²** `1`.

### 2. Dati con rumore e una previsione

y = `[1, 3, 2, 5]` per x = `[0, 1, 2, 3]`, **x per il valore** 4:

```
[Regressione: lineare, x per il valore 4] prevista ──▶ valore [Print (console.log)]
```

La retta è `1.1 * x + 1.1`, R² = 0.69 e il valore previsto in 4 è `5.5`.

### 3. Una parabola

I punti di `x² + 1` in 0…3, **Polinomio** di grado 2:

```
[Regressione: polinomio, grado 2] f ──▶ f [Campiona f]
```

**coefficienti** `[1, 0, 1]`, **f** `x^2 + 1`.

## Errori

| Messaggio | Quando |
|---|---|
| Servono dei dati: una lista di numeri o di punti | L'ingresso non è una lista. |
| Le liste x e y hanno lunghezze diverse (… e …) | Le due liste non hanno lo stesso numero di elementi. |
| Serve una lista di numeri per le x | L'ingresso **x** non è una lista. |
| Servono almeno 2 punti | Dopo aver tolto gli elementi che non sono numeri restano meno di 2 punti. |
| Il modello esponenziale vuole tutte le y maggiori di zero | Con **Esponenziale** una y è zero o negativa. |
| Il modello logaritmico vuole tutte le x maggiori di zero | Con **Logaritmica** una x è zero o negativa. |
| Il modello a potenza vuole tutte le x e le y maggiori di zero | Con **Potenza** una x o una y è zero o negativa. |
| Grado: da 1 a 12 | L'impostazione **Grado n** non è un intero tra 1 e 12. |
| Servono almeno … punti per questo modello (ce ne sono …) | I punti sono meno dei coefficienti del modello (grado + 1). |
| I punti non bastano a determinare il modello | I punti sono troppo uguali tra loro (per esempio la stessa x per tutti). |
| x: serve un numero | Il valore **x** è vuoto o non è un numero. |
| x: serve un numero (o un'espressione come pi/2), non «…» | Il valore **x** è un testo che non è un numero né un'espressione di numeri (per esempio `abc`). |
| Nome di variabile non valido: «…» | Un nome di variabile non va bene (deve cominciare con una lettera o `_`, al massimo 16 caratteri; non può essere una funzione né `pi` o `e`). |

## Vedi anche

- [Interpolazione](num.interpolate) per una curva che passa per tutti i punti
- [Calcola f(x)](fn.eval) per calcolare la curva trovata in un punto
- [Campiona f](num.sample) per disegnare la curva trovata
- [Dispersione](charts.scatter) per disegnare i punti e la curva
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
