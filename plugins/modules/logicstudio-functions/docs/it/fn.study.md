# Studio di funzione

`fn.study` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Studia una funzione in un intervallo: zeri, massimi e minimi relativi, flessi, dove cresce e dove decresce, massimo e minimo assoluti.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo. Se non è collegato vale l'impostazione **Funzione**. |
| **da** (`a`) | numero | L'inizio dell'intervallo. Un numero o un testo come `pi/2`. Se non è collegato vale l'impostazione **Da**. |
| **a** (`b`) | numero | La fine dell'intervallo. Come **da**; deve essere maggiore. Se non è collegato vale l'impostazione **A**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **zeri** (`zeros`) | lista | Le x in cui f vale 0, in ordine crescente. |
| **massimi relativi {x, y}** (`maxima`) | lista | I massimi relativi: lista di `{x, y}`. |
| **minimi relativi {x, y}** (`minima`) | lista | I minimi relativi: lista di `{x, y}`. |
| **flessi {x, y}** (`inflections`) | lista | I punti di flesso: lista di `{x, y}`. |
| **crescente in [da, a]** (`increasing`) | lista | Gli intervalli in cui f cresce: lista di coppie [da, a]. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **decrescente in [da, a]** (`decreasing`) | lista | Gli intervalli in cui f decresce: lista di coppie [da, a]. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **massimo assoluto {x, y}** (`max`) | oggetto | Il punto più alto trovato: oggetto `{x, y}`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **minimo assoluto {x, y}** (`min`) | oggetto | Il punto più basso trovato: oggetto `{x, y}`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `x^3 - 3x` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile. |
| **Da (se l'ingresso non è collegato)** (`a`) | un numero o un'espressione di numeri | `-3` | L'inizio dell'intervallo, quando **da** non è collegato. Anche `-pi`. |
| **A (se l'ingresso non è collegato)** (`b`) | un numero o un'espressione di numeri | `3` | La fine dell'intervallo, quando **a** non è collegato. |
| **Campioni** (`samples`) | numero (da 10 a 10000) | 1000 | Quanti intervallini usare per cercare i cambi di segno (si provano campioni + 1 punti). |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

La variabile è **x**, oppure il nome scelto in **Variabile** (lettere, cifre e `_`, con eventuali apostrofi alla fine; non può essere `pi` né `e`). Gli altri nomi sono parametri e devono avere un valore (vedi [Funzione f(x)](fn.define)).

Il blocco divide l'intervallo [da, a] in **Campioni** parti uguali e calcola, in tutti i punti, f, la sua derivata prima f' e la derivata seconda f'' (simboliche; numeriche per le funzioni che non ne hanno). Poi cerca:

- **gli zeri**: dove f cambia segno tra due campioni (o vale esattamente 0 in un campione). Ogni cambio di segno è raffinato con il metodo di Brent. I **poli** (come `1/x` in 0, dove f salta da −∞ a +∞) sono scartati: se nel punto trovato f non è piccola, non è uno zero.
- **i punti critici**: dove f' cambia segno. Se f' va da + a − è un **massimo relativo**; da − a + un **minimo relativo**.
- **i flessi**: dove f'' cambia segno.
- **crescente e decrescente**: l'intervallo è spezzato nei punti critici, e in ogni pezzo il segno di f' al centro decide; i pezzi vicini dello stesso tipo sono uniti.
- **massimo e minimo assoluti**: tra i campioni, i punti critici e gli estremi dell'intervallo.

I risultati sono arrotondati a 15 cifre significative. Se niente è collegato a **f**, **da** e **a**, il blocco gira **una volta all'avvio dello schema** con le impostazioni (di serie `x^3 - 3x` in [−3, 3]).

**I limiti.** Un cambio di segno più stretto di un passo (due zeri vicinissimi) può sfuggire: aumenta i **Campioni** (fino a 10000). Uno zero in cui la funzione tocca l'asse senza attraversarlo (come `x^2` in 0) si trova solo se cade proprio su un campione. Uno zero proprio all'estremo dell'intervallo si trova anche se l'arrotondamento lo lascia a 10⁻¹⁶ (per `sin(x)` in [0, 2pi] gli zeri sono 0, π e 2π); un flesso proprio all'estremo no. Vicino a un polo il **massimo** e il **minimo assoluti** possono essere valori enormi presi nei campioni più vicini al polo (per `1/x` in [−2, 2] dà 250 e −250). In un punto angoloso come `abs(x)` in 0 il minimo c'è, ma non c'è nessun flesso né nessuna tangente: leggi i risultati con attenzione.

## Esempi

### 1. Una cubica

Niente collegato, valori di serie (`x^3 - 3x` in [−3, 3]), 1000 campioni:

```
[Studio di funzione] zeri ──▶ valore [Print (console.log)]
```

All'avvio scrive `[-1.73205080756888,0,1.73205080756888]`. Le altre uscite: **massimi relativi** `[{"x":-1,"y":2}]`, **minimi relativi** `[{"x":1,"y":-2}]`, **flessi** `[{"x":0,"y":0}]`, **crescente** `[[-3,-1],[1,3]]`, **decrescente** `[[-1,1]]`, **massimo assoluto** `{"x":3,"y":18}`, **minimo assoluto** `{"x":-3,"y":-18}`.

### 2. Una parabola, con gli estremi collegati

Funzione `x^2 - 4`, **da** = −5 e **a** = 5: **zeri** `[-2,2]`, **minimi relativi** `[{"x":0,"y":-4}]`, **decrescente** `[[-5,0]]`, **crescente** `[[0,5]]`, nessun massimo relativo e nessun flesso.

### 3. Una campana

`e^(-x^2)` in [−3, 3]: nessuno zero, **massimi relativi** `[{"x":0,"y":1}]`, **flessi** nei due punti `{"x":-0.707106781186548,"y":0.606530659712633}` e `{"x":0.707106781186548,"y":0.606530659712633}`, **crescente** `[[-3,0]]`, **decrescente** `[[0,3]]`.

### 4. Uno zero all'estremo

`sin(x)` in [0, 2pi]: **zeri** `[0,3.14159265358979,6.28318530717959]`, massimo relativo (π/2 ; 1), minimo relativo (3π/2 ; −1).

### 5. Quando non va

**da** = 2 e **a** = 1: «L'intervallo deve avere «da» minore di «a»». **Campioni** = 5: «Campioni: da 10 a 10000».

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
| … : serve un numero | Un estremo è vuoto o non è un numero. Il messaggio comincia con `da` o `a`. |
| L'intervallo deve avere «da» minore di «a» | L'inizio non è minore della fine. |
| Campioni: da 10 a 10000 | L'impostazione **Campioni** non è un intero tra 10 e 10000. |

## Vedi anche

- [Risolvi f(x) = 0](fn.solve) per una radice in un intervallo preciso
- [Tabella valori](fn.table) per disegnare la funzione
- [Derivata (simbolica)](fn.derivative) per f' e f''
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
