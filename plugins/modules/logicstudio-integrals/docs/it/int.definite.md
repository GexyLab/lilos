# Integrale definito ∫ₐᵇ f(x) dx

`int.definite` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Calcola l'integrale di una funzione tra due estremi, con un metodo numerico a scelta. Gli estremi possono essere infiniti (integrali impropri).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come `sin(x)` o `1/(1+x^2)`. Se non è collegato vale l'impostazione **Funzione**. |
| **a (da)** (`a`) | qualsiasi | L'estremo di sinistra: un numero, un'espressione come `pi/2`, o `-inf`. Se non è collegato vale l'impostazione **Da a**. |
| **b (a)** (`b`) | qualsiasi | L'estremo di destra: un numero, un'espressione, o `inf`. Se non è collegato vale l'impostazione **A b**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **integrale** (`value`) | numero | Il valore dell'integrale. |
| **stima dell'errore** (`estimate`) | numero | Quanto può essere sbagliato il risultato, secondo il metodo. Con trapezi e rettangoli non esce (non c'è una stima). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **valutazioni** (`evaluations`) | numero | Quante volte è stata calcolata la funzione. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Un errore del calcolo (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`expr`) | testo | `sin(x)` | La funzione, se **f** non è collegato. |
| **Variabile** (`variable`) | testo | `x` | Il nome della variabile nella funzione. |
| **Da a** (`a`) | numero o espressione | `0` | L'estremo a, se l'ingresso non è collegato. |
| **A b** (`b`) | numero o espressione | `pi` | L'estremo b, se l'ingresso non è collegato. |
| **Metodo** (`method`) | Gauss-Kronrod adattivo / Simpson adattivo / Romberg / Trapezi / Rettangoli al punto medio | Gauss-Kronrod adattivo | Come si calcola l'integrale (vedi sotto). |
| **Tolleranza** (`tolerance`) | da 1e-15 a 0,1 | 1e-10 | L'errore che i metodi adattivi cercano di non superare. |
| **Intervalli** (`n`) | da 1 a 99999 | 1000 | Quanti intervalli, per Trapezi e Rettangoli. |

## Come funziona

Il blocco calcola ∫ f(x) dx da **a** a **b** con il **metodo** scelto:

| Metodo | Cosa fa |
|---|---|
| **Gauss-Kronrod adattivo** (`gk`) | Gauss-Kronrod a 7 e 15 punti: divide l'intervallo dove l'errore è più grande finché è sotto la **Tolleranza**. È il più preciso e il solo che accetta estremi infiniti. |
| **Simpson adattivo** (`simpson`) | La regola di Simpson, con l'intervallo diviso dove serve. |
| **Romberg** (`romberg`) | Trapezi con estrapolazione: molto preciso per le funzioni lisce. |
| **Trapezi** (`trapezoid`) | **n** trapezi di uguale larghezza. Niente stima dell'errore. |
| **Rettangoli** (`midpoint`) | **n** rettangoli, con l'altezza presa a metà. Niente stima dell'errore. |

- **Estremi infiniti** (`inf`, `-inf`): con un cambio di variabile l'intervallo infinito diventa finito; vale solo il metodo Gauss-Kronrod.
- Se **a** è più grande di **b**, il risultato cambia segno. Se sono uguali, vale 0.
- La funzione deve avere un valore finito in tutti i punti in cui viene calcolata: `1/x` tra -1 e 1 dà errore, perché in 0 non ha valore. Se il valore manca proprio in un estremo (per esempio `1/sqrt(1-x^2)` in 1), il blocco lo calcola un soffio più dentro.
- Si ferma dopo **100000 valutazioni** della funzione.
- Il risultato ha 14 cifre significative.
- Senza ingressi collegati calcola una volta all'avvio dello schema; con un ingresso collegato calcola a ogni valore che arriva, quando ci sono tutti i valori collegati.

## Esempi

### 1. L'area di una gobba di seno

```
[Costante · Variabile: pi] valore ──▶ b [Integrale definito: sin(x), a = 0] integrale ──▶ valore [Print (console.log)]
```

Scrive `2`.

### 2. Un integrale improprio: la curva a campana

```
[Integrale definito: e^(-x^2), a = -inf, b = inf] integrale ──▶ valore [Print (console.log)]
```

Nessun ingresso collegato: il blocco calcola una volta all'avvio. Scrive `1.7724538509055`, cioè √π.

Con **valutazioni** collegata, scrive `465`.

### 3. Confronto tra i metodi

`x^2` da 0 a 1 vale 1/3. Con 10 intervalli:

- **Trapezi**: `0.335`
- **Rettangoli**: `0.3325`
- **Gauss-Kronrod**: `0.33333333333333` (con **stima dell'errore** `1.17e-15`)

## Errori

| Messaggio | Quando |
|---|---|
| a: serve un numero (o un'espressione come pi/2), non «…» | L'estremo a non è un numero né un'espressione senza variabili. Per b il messaggio comincia con `b:`. |
| a: serve un numero | L'estremo a è vuoto. |
| Con estremi infiniti usa il metodo Gauss-Kronrod | Un estremo è `inf` o `-inf` e il metodo è un altro. |
| La funzione non ha un valore finito in x = … | La funzione dà un infinito o «non è un numero» in un punto (per esempio `1/x` in 0, o `ln(x)` con x negativo). |
| Troppe valutazioni della funzione (più di 100000) | Servono più di 100000 valutazioni. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | Nella funzione c'è un nome che non è la variabile (per esempio `k` in `k*x`). |
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere …: … | La funzione è scritta male (una parentesi che manca, un carattere non ammesso, un numero scritto male). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti. |
| f deve essere un'espressione di testo, come «x^2 + 1» | All'ingresso **f** arriva qualcosa che non è un testo. |
| Nome di variabile non valido: «…» | La **Variabile** non è un nome valido. |
| «…» è una costante, non può essere la variabile | La **Variabile** è `pi` o `e`. |

## Vedi anche

- [Primitiva (integrale indefinito)](int.primitive) per la formula dell'integrale, invece del numero
- [Funzione integrale](int.function) per F(x) con l'estremo superiore che varia
- [Valore medio in [a, b]](int.mean), [Area tra due curve](int.area)
- [Funzione f(x)](fn.define) per dare un nome alla funzione e ai suoi parametri
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
