# Risolvi f(x) = 0

`fn.solve` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Trova una radice di una funzione, cioè un valore di x per cui f(x) = 0, con il metodo di Brent (in un intervallo) o di Newton (da un punto di partenza).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo. Se non è collegato vale l'impostazione **Funzione**. |
| **intervallo da** (`a`) | numero | L'inizio dell'intervallo (metodo Brent). Un numero o un testo come `pi/2`. Se non è collegato vale l'impostazione. |
| **intervallo a** (`b`) | numero | La fine dell'intervallo (metodo Brent). Come **intervallo da**. |
| **punto di partenza (Newton)** (`x0`) | numero | Il punto di partenza (metodo Newton). Se non è collegato vale l'impostazione. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **radice** (`root`) | numero | La radice trovata, arrotondata a 15 cifre significative. |
| **f(radice)** (`value`) | numero | Il valore della funzione nella radice: dovrebbe essere vicinissimo a 0 (per `x^2 - 2` è circa −2,6·10⁻¹⁴). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **iterazioni** (`iterations`) | numero | Quanti passi ha fatto il metodo. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `x^2 - 2` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile. |
| **Metodo** (`method`) | `brent` Brent, nell'intervallo [a, b]; `newton` Newton, dal punto x0 | `brent` | Quale metodo usare. |
| **Intervallo da (se a non è collegato)** (`a`) | un numero o un'espressione di numeri (`pi/2`) | `0` | L'inizio dell'intervallo, quando **intervallo da** non è collegato. Anche `pi/2`. |
| **Intervallo a (se b non è collegato)** (`b`) | un numero o un'espressione di numeri | `2` | La fine dell'intervallo, quando **intervallo a** non è collegato. |
| **Punto di partenza (se x0 non è collegato)** (`x0`) | un numero o un'espressione di numeri | `1` | Il punto di partenza di Newton, quando **punto di partenza** non è collegato. |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

La variabile è **x**, oppure il nome scelto in **Variabile** (lettere, cifre e `_`, con eventuali apostrofi alla fine; non può essere `pi` né `e`).

Gli estremi **a** e **b** e il punto **x0** sono numeri o testi che valgono come numeri (`"2,5"`, `pi/2`). L'infinito non è ammesso.

**Brent** (il metodo di serie) cerca la radice nell'intervallo [a, b]. Ha bisogno che f(a) e f(b) abbiano **segni opposti**: allora una radice c'è per forza, e il metodo la trova sempre, mescolando bisezione e interpolazione. Si ferma quando l'intervallo è più piccolo di circa 10⁻¹³ (al massimo 200 passi). Se uno dei due estremi è già una radice, esce subito con 0 passi. Se nell'intervallo ci sono più radici ne trova una sola, e non si sa quale: scegli un intervallo con una radice sola (per tutte le radici in un intervallo c'è [Studio di funzione](fn.study)). Se la funzione cambia segno ma nel punto trovato **non si annulla** (un salto o un polo, come `1/x` tra −1 e 1) il blocco dà un errore invece di una falsa radice.

**Newton** parte da **x0** e ripete x ← x − f(x) / f'(x). La derivata f' è quella **simbolica**; se la funzione non ne ha (`min`, `max`) usa quella numerica. Si ferma quando due passi consecutivi sono più vicini di circa 10⁻¹³ (al massimo 100 passi). È più veloce di Brent ma può non arrivare: dipende dal punto di partenza, e dove la derivata è 0 si ferma.

- Se il blocco gira per **f** e un ingresso collegato non ha ancora un valore, aspetta.
- Se niente è collegato, gira **una volta all'avvio dello schema** con le impostazioni (di serie `x^2 - 2` in [0, 2]).

## Esempi

### 1. La radice quadrata di 2

Niente collegato, valori di serie (`x^2 - 2` in [0, 2], Brent):

```
[Risolvi f(x) = 0] radice ──▶ valore [Print (console.log)]
```

All'avvio scrive `1.41421356237309` (**f(radice)** è −2,62·10⁻¹⁴, **iterazioni** 8).

### 2. cos(x) = x

Funzione `cos(x) - x`, intervallo [0, 1]: radice `0.739085133215156` in 7 passi.

### 3. Newton

Metodo Newton, funzione `x^2 - 2`, **x0** = 1: radice `1.41421356237309` in 6 passi.

### 4. Quando non va

- `x^2 + 1` in [0, 2]: errore «f(a) e f(b) hanno lo stesso segno: nessuna radice garantita nell'intervallo».
- `1/x` in [−1, 1]: errore «f cambia segno in x ≈ -5.68434188608051e-14 senza annullarsi: è un salto o un polo, non una radice».
- Newton su `x^2 + 1` da **x0** = 1: dopo un passo arriva in 0, dove la derivata è 0: errore «Derivata nulla in x = 0: Newton non può continuare».

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
| … : serve un numero (o un'espressione come pi/2), non «…» | Un estremo o un punto scritto come testo non è un numero né un'espressione di numeri (per esempio `abc`). |
| … : l'infinito non è ammesso qui | Un estremo o un punto di partenza è `inf` o `∞`. |
| … : serve un numero | Un estremo o il punto di partenza è vuoto o non è un numero. Il messaggio comincia con `a`, `b` o `x0`. |
| f(a) e f(b) hanno lo stesso segno: nessuna radice garantita nell'intervallo | Brent: la funzione ha lo stesso segno ai due estremi. |
| La funzione non ha un valore finito agli estremi dell'intervallo | Brent: f(a) o f(b) è infinito o non è un numero. |
| La radice non converge in 200 iterazioni | Brent non si è fermato in 200 passi (caso raro). |
| f cambia segno in x ≈ … senza annullarsi: è un salto o un polo, non una radice | Brent: la funzione cambia segno nell'intervallo ma nel punto trovato non vale 0, come `1/x` tra −1 e 1. |
| La funzione non ha un valore finito in x = … | La funzione dà un valore infinito o non numerico (divisione per zero, radice di un numero negativo, logaritmo di zero…). |
| Derivata nulla in x = …: Newton non può continuare | Newton è arrivato in un punto dove f' vale 0. |
| Newton non converge in 100 iterazioni: prova un altro punto di partenza o un intervallo | Newton non si è fermato in 100 passi. |

## Vedi anche

- [Polinomio: valore e radici](fn.poly) per le radici di un polinomio, anche complesse
- [Equazione di 2° grado](fn.quadratic) per la formula chiusa
- [Studio di funzione](fn.study) per trovare tutti gli zeri in un intervallo
- [Derivata (simbolica)](fn.derivative) per la derivata usata da Newton
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
