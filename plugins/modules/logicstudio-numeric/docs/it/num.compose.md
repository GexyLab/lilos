# Componi f∘g

`num.compose` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Mette una funzione dentro un'altra: da `f(x)` e `g(x)` fa `f(g(x))` (oppure `g(f(x))`). Il risultato è una funzione, scritta come testo, che si può collegare agli altri blocchi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo (per esempio `x^2 + sin(x)`). Se non è collegato vale l'impostazione **Funzione**. |
| **g (funzione)** (`g`) | testo | La funzione interna (o esterna, con l'ordine `g(f(x))`), come testo. Se non è collegato vale l'impostazione **Funzione g**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **f∘g (funzione)** (`f`) | testo | La funzione composta, come testo e semplificata (per esempio `sin(x^2)`). |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo | `sin(x)` | La funzione, quando **f** non è collegato. |
| **Funzione g (se g non è collegato)** (`inner`) | un testo | `x^2` | La funzione g, quando **g** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile (lettere, cifre e `_`; non può essere `pi` né `e`). |
| **Ordine** (`order`) | f(g(x)) / g(f(x)) | f(g(x)) | `f(g(x))` mette g dentro f; `g(f(x))` mette f dentro g. |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni». Gli angoli sono in radianti. La variabile è **x**, oppure il nome scelto in **Variabile**; un altro nome nella funzione è un parametro e ha bisogno di un valore (si dà con il blocco [Funzione f(x)](fn.define)).

Se **nessun** ingresso è collegato, il blocco calcola **una volta all'avvio dello schema** con le impostazioni. Se uno o più ingressi sono collegati, aspetta che abbiano tutti un valore e poi calcola a ogni nuovo valore.

Ogni **x** della funzione esterna è sostituita da tutta la funzione interna, poi il risultato è semplificato. Gli altri nomi (i parametri) restano nel risultato: la composizione è simbolica, non serve dare loro un valore qui.

- Con `f = sin(x)` e `g = x^2` si ottiene `sin(x^2)`; con l'ordine `g(f(x))` si ottiene `sin(x)^2`.
- Il risultato non può superare i 2000 caratteri.

## Esempi

### 1. Il seno di un quadrato

Niente collegato, **Funzione** `sin(x)`, **Funzione g** `x^2`:

```
[Componi f∘g: sin(x), x^2] f ──▶ valore [Print (console.log)]
```

Scrive `sin(x^2)`.

### 2. Il contrario

Stesse funzioni con l'ordine `g(f(x))`:

```
[Componi f∘g: sin(x), x^2, g(f(x))] f ──▶ valore [Print (console.log)]
```

Scrive `sin(x)^2`.

### 3. Da altri blocchi

```
[Funzione f(x): a x + 1] f ──▶ f [Componi f∘g] f ──▶ f [Campiona f]
[Funzione f(x): x^2]   f ──▶ g
```

Il grafico mostra la funzione composta.

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
| La composizione è troppo lunga (più di 2000 caratteri) | Mettendo una funzione dentro l'altra il risultato supera i 2000 caratteri. |

## Vedi anche

- [Semplifica](num.simplify) per scrivere il risultato in modo più semplice
- [Derivata (simbolica)](fn.derivative) per derivare la funzione composta
- [Funzione f(x)](fn.define) per dare un valore ai parametri
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
