# Derivata (simbolica)

`fn.derivative` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Calcola la derivata di una funzione **in modo simbolico**: il risultato è un'altra funzione, scritta come testo. Per `x^3 + sin(x)` dà `3x^2 + cos(x)`. Si può derivare fino a 10 volte.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo. Se non è collegato vale l'impostazione **Funzione**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **f'** (`derivative`) | testo | La derivata, semplificata, come testo. Si collega a **f** degli altri blocchi (per esempio [Calcola f(x)](fn.eval)). |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `x^3 + sin(x)` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile. |
| **Ordine** (`order`) | numero (da 1 a 10) | 1 | Quante volte derivare (da 1 a 10). |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

La variabile è **x**, oppure il nome scelto in **Variabile** (lettere, cifre e `_`, con eventuali apostrofi alla fine; non può essere `pi` né `e`).

Il blocco applica le regole della derivazione (somma, prodotto, quoziente, funzione composta, potenza, esponenziale) e le derivate delle funzioni conosciute, poi semplifica il risultato. Per `x^x` usa la derivazione logaritmica: `x^x*(ln(x) + 1)`.

- **Gli altri nomi sono costanti**: nella derivata di `a x^3` il nome `a` resta com'è (`3a*x^2`) e `y` in `x^2 + y` vale come una costante (la derivata è `2x`). Qui non serve dare un valore ai parametri.
- `abs(x)` dà `sign(x)`; `floor`, `ceil`, `round` e `sign` danno 0. Per `min` e `max` non c'è la derivata simbolica (errore): per un valore usa [Derivata in un punto](fn.derivativeAt), che passa al calcolo numerico.
- Con **Ordine** 2 o più la derivata è ripetuta: la derivata seconda di `x^3` è `6x`. Il risultato non può superare 20000 caratteri.
- Se niente è collegato a **f**, il blocco gira **una volta all'avvio dello schema** con le impostazioni.

## Esempi

### 1. Una somma

Niente collegato, funzione di serie `x^3 + sin(x)`:

```
[Derivata (simbolica): x^3 + sin(x)] f' ──▶ valore [Print (console.log)]
```

All'avvio scrive `3x^2 + cos(x)`. Con `3x^2 + 2sin(x) - ln(x)` scrive `6x + 2cos(x) - 1/x`.

### 2. Prodotto, esponenziale, quoziente

`x sin(x)` → `x*cos(x) + sin(x)`; `e^(2x)` → `2e^(2x)`; `1/x` → `-1/x^2`; `(x+1)/(x-1)` → `1/(x - 1) - (x + 1)/(x - 1)^2`; `sqrt(x)` → `1/(2sqrt(x))`.

### 3. Derivate successive

`x^3` con **Ordine** 2 → `6x`. `x^5` con **Ordine** 4 → `120x`. `sin(x)` con **Ordine** 10 → `-sin(x)`.

### 4. Un'altra variabile

Funzione `t^2 + t`, **Variabile** `t` → `2t + 1`.

### 5. Quando non va

`max(x, 1)` → «Derivata simbolica non disponibile per max()». **Ordine** 11 → «Ordine: da 1 a 10».

## Errori

| Messaggio | Quando |
|---|---|
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il blocco si è fermato e «…» dice perché (vedi la pagina [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| Nome di variabile non valido: «…» | Il nome in **Variabile** non va bene (deve cominciare con una lettera o `_`). |
| «…» è una costante, non può essere la variabile | **Variabile** è `pi` o `e`. |
| Ordine: da 1 a 10 | L'impostazione **Ordine** non è un intero tra 1 e 10. |
| Derivata simbolica non disponibile per …() | La funzione usa `min` o `max` (o un'altra funzione senza derivata simbolica). |
| La derivata è troppo lunga (più di 20000 caratteri) | Con tante derivate successive il testo cresce troppo. |

## Vedi anche

- [Derivata in un punto f'(x)](fn.derivativeAt) per il valore della derivata
- [Retta tangente](fn.tangent) e [Polinomio di Taylor](fn.taylor) che usano le derivate
- [Primitiva (integrale indefinito)](int.primitive) per l'operazione inversa
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
