# Retta tangente

`fn.tangent` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

La retta tangente al grafico di una funzione in un punto, e la retta normale: pendenza, intercetta ed equazioni.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo. Se non è collegato vale l'impostazione **Funzione**. |
| **x₀** (`x0`) | numero | L'ascissa del punto di tangenza. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **pendenza m** (`slope`) | numero | La pendenza m, cioè la derivata in x₀. |
| **intercetta q** (`intercept`) | numero | L'intercetta q: dove la tangente taglia l'asse y. |
| **equazione** (`equation`) | testo | L'equazione della tangente, come testo, per esempio `y = 2x - 1`. |
| **f(x₀)** (`y0`) | numero | Il valore f(x₀). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **retta normale** (`normal`) | testo | L'equazione della retta normale (perpendicolare alla tangente nel punto): `y = -x/2 + 3/2`, oppure `x = 1` se la tangente è orizzontale. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `x^2` | La funzione, quando **f** non è collegato. |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

In questo blocco la variabile è sempre **x**; gli altri nomi sono parametri e devono avere un valore (vedi [Funzione f(x)](fn.define)).

Il blocco calcola y₀ = f(x₀) e la pendenza m = f'(x₀) (con la derivata simbolica, o numerica se la funzione non ne ha), poi scrive la tangente y = m·x + q con q = y₀ − m·x₀. La normale ha pendenza −1/m e passa dallo stesso punto; se m = 0 la normale è la retta verticale `x = x₀`.

Le equazioni sono semplificate: `y = x - 1`, `y = -x/4 + 1`. I numeri non razionali sono scritti con 12 cifre (`y = 2.71828182846x`).

- Se f non ha un valore finito in x₀ c'è un errore; se la derivata non è finita (tangente verticale, `sqrt(x)` in 0) il messaggio lo dice.
- In un punto angoloso (`abs(x)` in 0, dove le pendenze a sinistra e a destra sono diverse) la tangente non esiste e il blocco dà un errore.
- Il blocco non parte da solo all'avvio: serve **x₀**.

## Esempi

### 1. Una parabola

`x^2` in **x₀** = 1:

```
[Costante · Variabile: 1] valore ──▶ x₀ [Retta tangente: x^2] equazione ──▶ valore [Print (console.log)]
```

Scrive `y = 2x - 1`. **Pendenza m** è `2`, **intercetta q** `-1`, **f(x₀)** `1`, **retta normale** `y = -x/2 + 3/2`.

### 2. Altre funzioni

- `ln(x)` in 1: `y = x - 1`, normale `y = -x + 1`.
- `1/x` in 2: `y = -x/4 + 1`, normale `y = 4x - 15/2`.
- `sin(x)` in 0: `y = x`, normale `y = -x`.
- `x^2` in 0: `y = 0`, normale `x = 0`.
- `e^x` in 1: `y = 2.71828182846x`.

### 3. Quando non va

- `sqrt(x)` in 0: «La tangente in x = 0 è verticale o non esiste».
- `abs(x)` in 0: «La derivata non esiste in x = 0: è un punto angoloso».
- `1/x` in 0: «La funzione non ha un valore finito in x = 0».

## Errori

| Messaggio | Quando |
|---|---|
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il blocco si è fermato e «…» dice perché (vedi la pagina [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| f deve essere un'espressione di testo, come «x^2 + 1» | Su **f** arriva qualcosa che non è un testo né un numero (una lista, un oggetto). |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | La funzione contiene un nome che non è la variabile e non ha un valore. Con più nomi il messaggio dice «Parametri senza valore», e con più variabili finisce con «le variabili sono x, y». |
| La funzione non ha un valore finito in x = … | La funzione dà un valore infinito o non numerico (divisione per zero, radice di un numero negativo, logaritmo di zero…). |
| La tangente in x = … è verticale o non esiste | La derivata nel punto non è un numero finito. |
| La derivata non esiste in x = …: è un punto angoloso | Le pendenze a sinistra e a destra del punto sono diverse (per esempio `abs(x)` in 0). In questo blocco la variabile è sempre x. |
| x₀: serve un numero | **x₀** non è un numero. |

## Vedi anche

- [Derivata in un punto f'(x)](fn.derivativeAt) per la sola pendenza
- [Polinomio di Taylor](fn.taylor) per approssimare meglio della tangente
- [Tabella valori](fn.table) per disegnare la funzione insieme alla tangente
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
