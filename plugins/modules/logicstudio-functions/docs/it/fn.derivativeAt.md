# Derivata in un punto f'(x)

`fn.derivativeAt` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Il valore della derivata di una funzione in un punto, o in una lista di punti, fino al 4° ordine: esatto (simbolico) quando si può, altrimenti numerico.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo. Se non è collegato vale l'impostazione **Funzione**. |
| **x (numero o lista)** (`x`) | qualsiasi | Il punto: un numero o una lista di numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **f'(x)** (`value`) | qualsiasi | Il valore della derivata, arrotondato a 15 cifre significative: un numero, o una lista se **x** è una lista. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `x^2` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile. |
| **Metodo** (`method`) | `auto` Esatto (simbolico), altrimenti numerico; `numeric` Numerico (differenze centrali) | `auto` | Come calcolare la derivata. |
| **Ordine** (`order`) | numero (da 1 a 4) | 1 | Quante volte derivare (da 1 a 4). |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

La variabile è **x**, oppure il nome scelto in **Variabile** (lettere, cifre e `_`, con eventuali apostrofi alla fine; non può essere `pi` né `e`).

Gli altri nomi della funzione sono parametri e devono avere un valore (vedi [Funzione f(x)](fn.define)).

- **Esatto, altrimenti numerico** (di serie): il blocco deriva la funzione in modo simbolico (come [Derivata (simbolica)](fn.derivative)) per **Ordine** volte e calcola il risultato nel punto. Se la funzione non ha la derivata simbolica (`min`, `max`) passa al calcolo numerico.
- **Numerico**: differenze centrali con l'estrapolazione di Richardson: due approssimazioni con passi diversi (il passo è proporzionale a |x|, ma almeno 1) vengono combinate per togliere l'errore principale. Per le funzioni lisce dà circa 10-12 cifre corrette per l'ordine 1, meno per gli ordini più alti. Non usarlo vicino a un punto dove la funzione non è definita.
- In un **punto angoloso** (le pendenze a sinistra e a destra sono diverse, come `abs(x)` in 0 o `max(x, 1)` in 1) la derivata non esiste: errore.
- Se la derivata non ha un valore finito nel punto (`sqrt(x)` in 0, `1/x` in 0) c'è un errore, anche in una lista.
- Il blocco non parte da solo all'avvio: serve un valore su **x**.

## Esempi

### 1. Un punto

`x^3` in 2:

```
[Costante · Variabile: 2] valore ──▶ x [Derivata in un punto: x^3] f'(x) ──▶ valore [Print (console.log)]
```

Scrive `12`. Con **Ordine** 2 scrive ancora `12` (la derivata seconda è 6x). `sin(x)` in 0 dà `1`.

### 2. Una lista

`x^2` con **x** = `[0, 1, 2, 3]`: `[0,2,4,6]`.

### 3. Esatto e numerico

`x^3` in 2 con il metodo **Numerico**: `11.9999999999979` (invece di 12). `sin(x)` in 1 con **Numerico**: `0.540302305868175`. `max(x, 1)` in 3 con il metodo di serie passa da solo al numerico: `1.00000000000004`.

### 4. Quando non va

`sqrt(x)` in 0: «La derivata non ha un valore finito in x = 0». `abs(x)` in 0: «La derivata non esiste in x = 0: è un punto angoloso». **Ordine** 5: «Ordine: da 1 a 4».

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
| Ordine: da 1 a 4 | L'impostazione **Ordine** non è un intero tra 1 e 4. |
| La derivata non esiste in x = …: è un punto angoloso | Le pendenze a sinistra e a destra del punto sono diverse (per esempio `abs(x)` in 0). Il messaggio usa il nome della **Variabile**. |
| La derivata non ha un valore finito in … = … | La derivata è infinita o non è un numero nel punto. |
| … : serve un numero | **x** (o un suo elemento) non è un numero. |
| La lista delle x ha più di 10000 elementi | La lista in ingresso è troppo lunga. |

## Vedi anche

- [Derivata (simbolica)](fn.derivative) per la derivata come funzione
- [Retta tangente](fn.tangent) per la pendenza e l'equazione
- [Derivata di un segnale](fn.signalDerivative) per la derivata di una misura nel tempo
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
