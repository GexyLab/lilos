# Funzione integrale F(x) = ∫ₐˣ f(t) dt

`int.function` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Calcola l'integrale di una funzione da un estremo fisso **a** fino a un estremo **x** che arriva dal programma. Va bene anche per una lista di valori di x: così si può disegnare la curva di F(x).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come `e^(-t^2)`. Se non è collegato vale l'impostazione **Funzione**. |
| **a (da)** (`a`) | qualsiasi | L'estremo fisso di sinistra: un numero, un'espressione come `pi/2`, o `-inf`. Se non è collegato vale l'impostazione **Da a**. |
| **x (numero o lista)** (`x`) | qualsiasi | L'estremo variabile: un numero, un'espressione, `inf`, oppure una **lista** di valori. Ogni valore che arriva qui fa calcolare il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **F(x)** (`value`) | qualsiasi | Il valore dell'integrale: un numero, o una lista di numeri (uno per ogni x della lista, nello stesso ordine). |
| **Exception** (`error`) | oggetto | Un errore del calcolo (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`expr`) | testo | `e^(-t^2)` | La funzione, se **f** non è collegato. |
| **Variabile** (`variable`) | testo | `t` | Il nome della variabile nella funzione. |
| **Da a** (`a`) | numero o espressione | `0` | L'estremo a, se l'ingresso non è collegato. |
| **Metodo** (`method`) | Gauss-Kronrod adattivo / Simpson adattivo / Romberg / Trapezi / Rettangoli al punto medio | Gauss-Kronrod adattivo | Come si calcola l'integrale (vedi [Integrale definito](int.definite)). |
| **Tolleranza** (`tolerance`) | da 1e-15 a 0,1 | 1e-10 | L'errore che i metodi adattivi cercano di non superare. |
| **Intervalli** (`n`) | da 1 a 99999 | 1000 | Quanti intervalli, per Trapezi e Rettangoli. |

## Come funziona

A ogni **x** che arriva il blocco calcola ∫ f(t) dt da **a** a **x** con il metodo scelto, e manda il risultato su **F(x)**. Se f o a sono collegati e non è ancora arrivato niente, il blocco aspetta.

- Se **x** è una **lista**, calcola un integrale per ogni elemento e manda una lista di risultati. Al massimo **1000 valori** di x per volta.
- Se **x** è più piccolo di **a**, il risultato è negativo; se è uguale, vale 0.
- **a** e **x** possono essere `inf` e `-inf` (con il metodo Gauss-Kronrod).
- Ogni integrale si ferma dopo **100000 valutazioni** della funzione (il limite vale per ogni x).
- La variabile è `t` di serie, così non si confonde con la x dell'estremo.

## Esempi

### 1. La curva di F(x)

```
[Costante · Variabile: [0, 0.5, 1, 2]] valore ──▶ x [Funzione integrale: e^(-t^2), a = 0] F(x) ──▶ valore [Print (console.log)]
```

Scrive `[0,0.46128100641279,0.74682413281242,0.88208139076242]`. Il blocco funziona come la funzione degli errori (non normalizzata): per x molto grande si avvicina a √π/2.

### 2. Un numero solo

Con x = 1 e le impostazioni di serie scrive `0.74682413281242`.

Con x = `inf` scrive `0.88622692545276` (√π/2).

### 3. Un logaritmo come integrale

Funzione `1/t`, **Da a** = 1, x = 2: scrive `0.69314718055994`, cioè ln 2.

## Errori

| Messaggio | Quando |
|---|---|
| x: serve un numero (o un'espressione come pi/2), non «…» | Una x non è un numero né un'espressione senza variabili. |
| x: serve un numero | Una x è vuota. |
| Al massimo 1000 valori di x | La lista delle x ha più di 1000 elementi. |
| La lista delle x ha più di 10000 elementi | La lista è enorme (oltre 10000 elementi). |
| a: serve un numero (o un'espressione come pi/2), non «…» | L'estremo a non è valido. |
| Con estremi infiniti usa il metodo Gauss-Kronrod | Un estremo è infinito e il metodo è un altro. |
| La funzione non ha un valore finito in x = … | La funzione dà un infinito o «non è un numero» in un punto. |
| Troppe valutazioni della funzione (più di 100000) | Un integrale richiede più di 100000 valutazioni. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è t) | Nella funzione c'è un nome che non è la variabile. |
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere …: … | La funzione è scritta male. |
| Nome di variabile non valido: «…» | La **Variabile** non è un nome valido. |

## Vedi anche

- [Integrale definito](int.definite) per un integrale tra due estremi fissi
- [Primitiva (integrale indefinito)](int.primitive) per la formula di F
- [Tabella valori](fn.table) per avere una lista di x da mandare qui
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
