# Massimi · Minimi · Flessi

`num.extrema` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Trova in un intervallo i **massimi**, i **minimi** e i **flessi** di una funzione, e il suo punto più alto e più basso.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo (per esempio `x^2 + sin(x)`). Se non è collegato vale l'impostazione **Funzione**. |
| **da** (`a`) | numero | L'inizio dell'intervallo. Se non è collegato vale l'impostazione **Da**. |
| **a** (`b`) | numero | La fine dell'intervallo. Se non è collegato vale l'impostazione **A**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **massimi relativi {x, y}** (`maxima`) | lista | I massimi relativi, una lista di punti `{x, y}`. |
| **minimi relativi {x, y}** (`minima`) | lista | I minimi relativi, una lista di punti `{x, y}`. |
| **flessi {x, y}** (`inflections`) | lista | I flessi, una lista di punti `{x, y}`. |
| **punto più alto {x, y}** (`maximum`) | oggetto | Il punto più alto dell'intervallo, **estremi compresi** (può essere un estremo): `{x, y}`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **punto più basso {x, y}** (`minimum`) | oggetto | Il punto più basso dell'intervallo, estremi compresi: `{x, y}`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo | `x^3 - 3x` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile (lettere, cifre e `_`; non può essere `pi` né `e`). |
| **Da (se a non è collegato)** (`a`) | un testo | `-3` | L'inizio dell'intervallo, quando **a** non è collegato: un numero o un'espressione come `-pi`. |
| **A (se b non è collegato)** (`b`) | un testo | `3` | La fine dell'intervallo, quando **b** non è collegato. |
| **Sottointervalli da esaminare** (`n`) | numero (da 10 a 100000) | `600` | In quanti sottointervalli dividere l'intervallo per cercare i cambi di segno delle derivate (da 10 a 100000). |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni». Gli angoli sono in radianti. La variabile è **x**, oppure il nome scelto in **Variabile**; un altro nome nella funzione è un parametro e ha bisogno di un valore (si dà con il blocco [Funzione f(x)](fn.define)).

Se **nessun** ingresso è collegato, il blocco calcola **una volta all'avvio dello schema** con le impostazioni. Se uno o più ingressi sono collegati, aspetta che abbiano tutti un valore e poi calcola a ogni nuovo valore.

- Si cercano gli zeri della derivata prima: dove passa da positiva a negativa c'è un **massimo**, da negativa a positiva un **minimo**. Dove la derivata seconda cambia segno c'è un **flesso**. Le derivate sono simboliche; se la funzione non si sa derivare (`abs`, `min`…) sono numeriche.
- Un punto dove la derivata tocca 0 senza cambiare segno (`x^3` in 0) non è né un massimo né un minimo, ma è un flesso.
- Gli estremi dell'intervallo non sono mai massimi o minimi relativi; possono essere il **punto più alto** o **più basso**.
- Massimi molto vicini (meno di un sottointervallo) possono sfuggire: aumenta i sottointervalli.
- Per lo studio completo, con gli zeri e dove la funzione cresce, c'è [Studio di funzione](fn.study).

## Esempi

### 1. Un polinomio

Funzione `x^3 - 3x`, da −3 a 3 (i valori di serie):

```
[Massimi · Minimi · Flessi: x^3 - 3x, -3 → 3] massimi ──▶ valore [Print (console.log)]
```

Scrive `[{"x":-1,"y":2}]`; i minimi sono `[{"x":1,"y":-2}]` e il flesso `{"x":0,"y":0}`. Il punto più alto è l'estremo `{"x":3,"y":18}`.

### 2. Una campana

Il picco di `exp(-x^2)` tra −4 e 4:

```
[Massimi · Minimi · Flessi: exp(-x^2), -4 → 4] massimi ──▶ valore [Print (console.log)]
```

Scrive `[{"x":0,"y":1}]`.

### 3. Un seno

Funzione `sin(x)`, da `0` a `2pi`:

```
[Massimi · Minimi · Flessi: sin(x), 0 → 2pi] massimi ──▶ valore [Print (console.log)]
```

Il massimo è in x = 1.570796327 (π/2) e il minimo in x = 4.71238898 (3π/2).

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
| da: serve un numero | Il valore **da** è vuoto o non è un numero. |
| da: serve un numero (o un'espressione come pi/2), non «…» | Il valore **da** è un testo che non è un numero né un'espressione di numeri (per esempio `abc`). |
| da: l'infinito non è ammesso qui | Il valore **da** è `inf` o `∞`. |
| L'intervallo deve avere «da» minore di «a» | L'estremo di partenza non è minore di quello di arrivo. |
| Sottointervalli: da 10 a 100000 | L'impostazione **Sottointervalli da esaminare** non è un intero tra 10 e 100000. |
| Calcolo troppo lungo (più di 8 secondi): riduci i punti o l'intervallo | Il calcolo supera gli 8 secondi: il blocco si ferma per non occupare il programma. |

## Vedi anche

- [Studio di funzione](fn.study) per lo studio completo: zeri, massimi, minimi, flessi e dove cresce
- [Risolvi f(x) = 0](fn.solve) per trovare uno zero
- [Derivata (simbolica)](fn.derivative) per la derivata come formula
- [Campiona f](num.sample) per disegnare la funzione con i suoi punti
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
