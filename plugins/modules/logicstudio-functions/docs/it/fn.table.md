# Tabella valori

`fn.table` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Calcola una funzione su tanti punti ugualmente distanziati tra due estremi e manda la tabella: una lista di punti `{x, y}` pronta per un grafico.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo. Se non è collegato vale l'impostazione **Funzione**. |
| **da** (`from`) | numero | Il primo valore di x. Se non è collegato vale l'impostazione **Da**. |
| **a** (`to`) | numero | L'ultimo valore di x. Se non è collegato vale l'impostazione **A**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punti {x, y}** (`points`) | lista | I punti, nella forma `[{"x":0,"y":0},{"x":1,"y":1}]`. Si collega al grafico [Linee](charts.line) o [Dispersione](charts.scatter). |
| **lista delle x** (`xs`) | lista | Solo le x, in una lista. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **lista delle y** (`ys`) | lista | Solo le y, in una lista (`null` dove la funzione non ha un valore finito). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `x^2` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile. |
| **Da** (`from`) | un numero | -10 | Il primo valore di x, quando **da** non è collegato. |
| **A** (`to`) | un numero | 10 | L'ultimo valore di x, quando **a** non è collegato. |
| **Punti** (`count`) | numero (da 2 a 10000) | 101 | Quanti punti calcolare, estremi compresi. |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

La variabile è **x**, oppure il nome scelto in **Variabile** (lettere, cifre e `_`, con eventuali apostrofi alla fine; non può essere `pi` né `e`).

Il blocco calcola `n` punti (l'impostazione **Punti**, da 2 a 10000): la x del punto numero i (da 0 a n−1) è `da + (a − da) · i / (n − 1)`, quindi il primo punto è proprio **da** e l'ultimo proprio **a**. Le x e le y sono arrotondate a 15 cifre significative.

- Dove la funzione non ha un valore finito (`1/x` in 0, `sqrt(x)` sotto zero) la y è `null` e il blocco **non** dà errore. I grafici saltano i punti senza y.
- **da** può essere maggiore di **a**: la tabella va all'indietro. Se sono uguali, tutti i punti sono lo stesso.
- Gli estremi sono numeri, testi con un numero (`"2,5"`) o espressioni di numeri come `pi/2`. L'infinito non è ammesso.
- Se niente è collegato a **f**, **da** e **a**, il blocco gira **una volta all'avvio dello schema** con le impostazioni.
- Una tabella molto fitta fa un grafico lento: per una curva liscia bastano 100-500 punti.

## Esempi

### 1. Una parabola

Funzione `x^2`, da 0 a 4, 5 punti, niente collegato:

```
[Tabella valori: x^2, 0 → 4, 5 punti] punti ──▶ valore [Print (console.log)]
```

All'avvio scrive `[{"x":0,"y":0},{"x":1,"y":1},{"x":2,"y":4},{"x":3,"y":9},{"x":4,"y":16}]`.

### 2. Un punto dove la funzione non esiste

Funzione `1/x`, da −1 a 1, 3 punti: **lista delle y** è `[-1,null,1]`.

### 3. Gli estremi dagli ingressi

Funzione `2x`, 3 punti, **da** = 0 e **a** = 1 collegati: `[{"x":0,"y":0},{"x":0.5,"y":1},{"x":1,"y":2}]`.

### 4. Un'espressione come estremo

Funzione `sin(x)`, **da** `0`, **a** `pi`, 5 punti: la x dell'ultimo punto è `3.14159265358979` e la sua y `1.22464679914735e-16`.

### 5. Un grafico

```
[Tabella valori: sin(x), 0 → 6.28] punti ──▶ dati [Linee]
```

Con 101 punti (il valore di serie) il grafico disegna un'onda.

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
| Punti: da 2 a 10000 | L'impostazione **Punti** non è un intero tra 2 e 10000. |
| da: serve un numero (o un'espressione come pi/2), non «…» | Un estremo è un testo che non è un numero né un'espressione di numeri (per esempio `abc`). Per **a** il messaggio comincia con `a`. |
| da: l'infinito non è ammesso qui | Un estremo è `inf` o `∞` (per **a**: «a: …»). |
| da: serve un numero | Un estremo è vuoto o non è un numero (per **a**: «a: …»). |

## Vedi anche

- [Calcola f(x)](fn.eval) per un punto solo
- [Linee](charts.line) e [Dispersione](charts.scatter) per disegnare la tabella
- [Studio di funzione](fn.study) per zeri, massimi, minimi e flessi
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
