# Semplifica

`num.simplify` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Scrive una funzione in modo più semplice: somma i termini uguali (`2x + 3x` diventa `5x`), toglie `*1` e `+0`. In alternativa la **sviluppa** come polinomio (`(x+1)(x-1)` diventa `x^2 - 1`).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo (per esempio `x^2 + sin(x)`). Se non è collegato vale l'impostazione **Funzione**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (semplificata)** (`f`) | testo | La funzione scritta in modo semplice, come testo, pronta per gli altri blocchi. |
| **cambiata** (`changed`) | sì/no | `true` se il testo è diverso da quello di partenza (scritto in forma ordinata), `false` se non c'era niente da semplificare. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo | `2x + 3x + sin(x)^2 + cos(x)^2` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile (lettere, cifre e `_`; non può essere `pi` né `e`). |
| **Metodo** (`mode`) | Semplifica / Polinomio sviluppato (a + bx + cx²…) | Semplifica | **Semplifica** applica le regole di semplificazione; **Polinomio sviluppato** sviluppa i prodotti e le potenze e ordina i termini dal grado più alto, ma solo se la funzione è un polinomio nella variabile. |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni». Gli angoli sono in radianti. La variabile è **x**, oppure il nome scelto in **Variabile**; un altro nome nella funzione è un parametro e ha bisogno di un valore (si dà con il blocco [Funzione f(x)](fn.define)).

Se **nessun** ingresso è collegato, il blocco calcola **una volta all'avvio dello schema** con le impostazioni. Se uno o più ingressi sono collegati, aspetta che abbiano tutti un valore e poi calcola a ogni nuovo valore.

- La semplificazione non riduce le frazioni di polinomi: `(x^2 - 1)/(x - 1)` resta così.
- I numeri decimali semplici diventano frazioni (`0.5x` esce `x/2`) e i numeri hanno al massimo 12 cifre significative.
- **Polinomio sviluppato** accetta solo numeri, la variabile, somme, prodotti e potenze intere da 0 a 20; il risultato ha i coefficienti sommati (`(x+2)^3` dà `x^3 + 6x^2 + 12x + 8`).
- Gli altri nomi (i parametri) restano nel risultato con **Semplifica**; con **Polinomio sviluppato** non sono ammessi.

## Esempi

### 1. Sommare i termini

Funzione `2x + 3x + sin(x)^2 + cos(x)^2`:

```
[Semplifica: 2x + 3x + sin(x)^2 + cos(x)^2] f ──▶ valore [Print (console.log)]
```

Scrive `5x + sin(x)^2 + cos(x)^2` (i due quadrati restano scritti): **cambiata** vale `true`.

### 2. Sviluppare un prodotto

Funzione `(x+1)(x-1)`, metodo **Polinomio sviluppato**:

```
[Semplifica: (x+1)(x-1), polinomio] f ──▶ valore [Print (console.log)]
```

Scrive `x^2 - 1`.

### 3. Un cubo

Funzione `(x+2)^3`, metodo **Polinomio sviluppato**:

```
[Semplifica: (x+2)^3, polinomio] f ──▶ valore [Print (console.log)]
```

Scrive `x^3 + 6x^2 + 12x + 8`.

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
| f non è un polinomio in … con coefficienti numerici (di grado al massimo 20) | Con il metodo **Polinomio sviluppato**, la funzione contiene altro che somme, prodotti e potenze intere della variabile, ha altri nomi o ha grado maggiore di 20. |

## Vedi anche

- [Componi f∘g](num.compose) per mettere una funzione dentro un'altra
- [Funzione f(x)](fn.define) che manda la funzione già semplificata
- [Derivata (simbolica)](fn.derivative) per la derivata, già semplificata
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
