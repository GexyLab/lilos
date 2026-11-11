# Polinomio di Taylor

`fn.taylor` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Il polinomio di Taylor di una funzione intorno a un punto: l'approssimazione con un polinomio, fino al 12° ordine.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo. Se non è collegato vale l'impostazione **Funzione**. |
| **x₀ (centro)** (`x0`) | numero | Il centro dello sviluppo, in cui la funzione e le sue derivate devono avere un valore. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **polinomio** (`polynomial`) | testo | Il polinomio, come testo, per esempio `x^3/6 + x^2/2 + x + 1`. Si collega a **f** degli altri blocchi. |
| **coefficienti c₀, c₁…** (`coefficients`) | lista | I coefficienti c₀, c₁… c_n del polinomio nelle potenze di (x − x₀): c_k = f⁽ᵏ⁾(x₀) / k!. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `e^x` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile. |
| **Ordine** (`order`) | numero (da 1 a 12) | 3 | Quante volte derivare (da 1 a 12). |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

La variabile è **x**, oppure il nome scelto in **Variabile** (lettere, cifre e `_`, con eventuali apostrofi alla fine; non può essere `pi` né `e`). Gli altri nomi sono parametri e devono avere un valore (vedi [Funzione f(x)](fn.define)).

Il blocco deriva la funzione in modo simbolico da 0 a **Ordine** volte, calcola ogni derivata in **x₀**, divide per il fattoriale (c_k = f⁽ᵏ⁾(x₀) / k!) e scrive la somma c₀ + c₁(x − x₀) + c₂(x − x₀)² + …, senza i termini con coefficiente 0. Con x₀ = 0 i termini sono semplici potenze di x.

- Il testo è il polinomio **semplificato**, che può mescolare forme (`x - (x - 1)^2/2 + (x - 1)^3/3 - 1` per `ln(x)` in 1: è uguale a (x−1) − (x−1)²/2 + (x−1)³/3). Per le potenze di (x − x₀) usa i **coefficienti**.
- Le frazioni sono scritte come frazioni quando il denominatore è al massimo 64 (`x^3/6`); più grandi restano decimali (`0.00833333333333x^5` per 1/120).
- Se una derivata non ha un valore finito in x₀ (`ln(x)` in 0) c'è un errore. Per `min` e `max` non c'è la derivata simbolica (errore). In un punto angoloso come `abs(x)` in 0 c'è un errore.
- Il blocco non parte da solo all'avvio: serve **x₀**.

## Esempi

### 1. eˣ in 0

`e^x`, **Ordine** 3, **x₀** = 0:

```
[Costante · Variabile: 0] valore ──▶ x₀ [Polinomio di Taylor: e^x] polinomio ──▶ valore [Print (console.log)]
```

Scrive `x^3/6 + x^2/2 + x + 1`. **coefficienti** è `[1,1,0.5,0.166666666666667]`.

### 2. Seno e coseno in 0

`cos(x)`, **Ordine** 4: `x^4/24 - x^2/2 + 1` (coefficienti `[1,0,-0.5,0,0.0416666666666667]`). `sin(x)`, **Ordine** 5: `0.00833333333333x^5 - x^3/6 + x`.

### 3. Un centro diverso

`ln(x)`, **Ordine** 3, **x₀** = 1: `x - (x - 1)^2/2 + (x - 1)^3/3 - 1`, **coefficienti** `[0,1,-0.5,0.333333333333333]`. `sqrt(x)`, **Ordine** 2, **x₀** = 4: coefficienti `[2,0.25,-0.015625]`.

### 4. Una serie geometrica

`1/(1-x)`, **Ordine** 4, **x₀** = 0: `x^4 + x^3 + x^2 + x + 1`.

### 5. Quando non va

`ln(x)` in 0: «La derivata di ordine 0 non ha un valore finito in x = 0». `abs(x)` in 0: «La derivata non esiste in x = 0: è un punto angoloso». **Ordine** 13: «Ordine: da 1 a 12».

## Errori

| Messaggio | Quando |
|---|---|
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il blocco si è fermato e «…» dice perché (vedi la pagina [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| f deve essere un'espressione di testo, come «x^2 + 1» | Su **f** arriva qualcosa che non è un testo né un numero (una lista, un oggetto). |
| Nome di variabile non valido: «…» | Il nome in **Variabile** non va bene (deve cominciare con una lettera o `_`). |
| «…» è una costante, non può essere la variabile | **Variabile** è `pi` o `e`. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | La funzione contiene un nome che non è la variabile e non ha un valore. Con più nomi il messaggio dice «Parametri senza valore», e con più variabili finisce con «le variabili sono x, y». |
| Ordine: da 1 a 12 | L'impostazione **Ordine** non è un intero tra 1 e 12. |
| La derivata di ordine N non ha un valore finito in … = … | La funzione (N = 0) o una sua derivata è infinita o non è un numero in x₀. |
| Derivata simbolica non disponibile per …() | La funzione usa `min` o `max` (o un'altra funzione senza derivata simbolica). |
| La derivata non esiste in x = …: è un punto angoloso | Una derivata ha pendenze diverse a sinistra e a destra di x₀ (per esempio `abs(x)` in 0). Il messaggio usa il nome della **Variabile**. |
| x₀: serve un numero | **x₀** non è un numero. |

## Vedi anche

- [Derivata (simbolica)](fn.derivative) che questo blocco ripete
- [Retta tangente](fn.tangent), il polinomio di Taylor di ordine 1
- [Calcola f(x)](fn.eval) per confrontare il polinomio con la funzione
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
