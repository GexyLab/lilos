# Campiona f

`num.sample` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Calcola la funzione su **n punti equidistanti** tra **a** e **b** e manda le liste delle x e delle y e i punti `{x, y}`. Serve per **disegnare una funzione** o per passarla a un blocco che lavora su liste (derivata di dati, interpolazione, regressione).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo (per esempio `x^2 + sin(x)`). Se non è collegato vale l'impostazione **Funzione**. |
| **da a** (`a`) | numero | L'inizio dell'intervallo. Se non è collegato vale l'impostazione **Da a**. |
| **a b** (`b`) | numero | La fine dell'intervallo. Se non è collegato vale l'impostazione **A b**. |
| **punti** (`n`) | numero | Quanti punti, estremi compresi. Se non è collegato vale l'impostazione **Punti**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista delle x** (`x`) | lista | Le x, in una lista. |
| **lista delle y** (`y`) | lista | Le y, in una lista (`null` dove la funzione non ha un valore finito). |
| **punti {x, y}** (`points`) | lista | I punti, nella forma `[{"x":0,"y":0},{"x":1,"y":1}]`. Si collega a un grafico del pacchetto [Grafici](logicstudio-charts). |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo | `sin(x)` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile (lettere, cifre e `_`; non può essere `pi` né `e`). |
| **Da a (se a non è collegato)** (`a`) | un testo | `0` | L'inizio dell'intervallo, quando **a** non è collegato: un numero o un'espressione come `pi/2`. |
| **A b (se b non è collegato)** (`b`) | un testo | `2 pi` | La fine dell'intervallo, quando **b** non è collegato (di serie `2 pi`). |
| **Punti** (`n`) | numero (da 2 a 200000) | `100` | Quanti punti calcolare (da 2 a 200000). |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni». Gli angoli sono in radianti. La variabile è **x**, oppure il nome scelto in **Variabile**; un altro nome nella funzione è un parametro e ha bisogno di un valore (si dà con il blocco [Funzione f(x)](fn.define)).

Se **nessun** ingresso è collegato, il blocco calcola **una volta all'avvio dello schema** con le impostazioni. Se uno o più ingressi sono collegati, aspetta che abbiano tutti un valore e poi calcola a ogni nuovo valore.

La x del punto numero i (da 0 a n−1) è `a + (b − a)·i/(n − 1)`: il primo punto è proprio **a** e l'ultimo proprio **b**. I numeri sono arrotondati a 15 cifre significative.

- Dove la funzione non ha un valore finito (`1/x` in 0, `sqrt(x)` sotto zero) la y è `null` e il blocco **non** dà errore: un grafico salta quel punto.
- **a** può essere maggiore di **b**: i punti vanno all'indietro.
- Gli estremi sono numeri, testi con un numero (`"2,5"`) o espressioni di numeri come `pi/2`; l'infinito non è ammesso.
- Quasi la stessa cosa fa [Tabella valori](fn.table), che ha però i punti solo come lista di `{x, y}` e (se serve) due liste nascoste: qui le liste x e y sono uscite normali.

## Esempi

### 1. Un'onda per un grafico

Funzione `sin(x)`, da 0 a `2 pi`, 100 punti (i valori di serie):

```
[Campiona f: sin(x)] punti ──▶ dati [Linee]
```

All'avvio il grafico disegna un periodo del seno.

### 2. Cinque punti

Funzione `x^2`, da 0 a 4, 5 punti:

```
[Campiona f: x^2, 0 → 4, 5 punti] y ──▶ valore [Print (console.log)]
```

Scrive `[0,1,4,9,16]`.

### 3. Un punto dove non esiste

Funzione `1/x`, da −1 a 1, 3 punti:

```
[Campiona f: 1/x, -1 → 1, 3 punti] y ──▶ valore [Print (console.log)]
```

Scrive `[-1,null,1]`.

## Errori

| Messaggio | Quando |
|---|---|
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il lettore si è fermato e «…» dice perché (vedi [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| f deve essere un'espressione di testo, come «x^2 + 1» | Su **f** arriva qualcosa che non è un testo né un numero (una lista, un oggetto). |
| Nome di variabile non valido: «…» | Il nome in **Variabile** non va bene (deve cominciare con una lettera o `_`; non può essere il nome di una funzione). |
| «…» è una costante, non può essere la variabile | **Variabile** è `pi` o `e`. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | La funzione contiene un nome che non è la variabile e non ha un valore. Con più nomi il messaggio dice «Parametri senza valore». |
| Punti: da 2 a 200000 | Il numero di punti non è un intero tra 2 e 200000. |
| a: serve un numero | Il valore **a** è vuoto o non è un numero. |
| a: serve un numero (o un'espressione come pi/2), non «…» | Il valore **a** è un testo che non è un numero né un'espressione di numeri (per esempio `abc`). |
| a: l'infinito non è ammesso qui | Il valore **a** è `inf` o `∞`. |
| Calcolo troppo lungo (più di 8 secondi): riduci i punti o l'intervallo | Il calcolo supera gli 8 secondi: il blocco si ferma per non occupare il programma. |

## Vedi anche

- [Tabella valori](fn.table) per una tabella di punti da disegnare, con la x di partenza e di arrivo
- [Calcola f(x)](fn.eval) per il valore in un punto solo
- [Integrale di dati campionati](int.data) per integrare i punti ottenuti
- [Linee](charts.line) e [Dispersione](charts.scatter) per disegnare i punti
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
