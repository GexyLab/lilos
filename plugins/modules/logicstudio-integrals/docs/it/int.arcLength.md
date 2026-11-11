# Lunghezza d'arco

`int.arcLength` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Calcola la lunghezza della curva y = f(x) tra due estremi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La curva, come `x^2`. Se non è collegato vale l'impostazione **Funzione**. |
| **a (da)** (`a`) | qualsiasi | L'estremo di sinistra: un numero o un'espressione come `pi/2`. Se non è collegato vale l'impostazione **Da a**. |
| **b (a)** (`b`) | qualsiasi | L'estremo di destra. Se non è collegato vale l'impostazione **A b**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **lunghezza** (`length`) | numero | La lunghezza dell'arco, sempre positiva. |
| **Exception** (`error`) | oggetto | Un errore del calcolo (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`expr`) | testo | `x^2` | La curva, se **f** non è collegato. |
| **Variabile** (`variable`) | testo | `x` | Il nome della variabile nella funzione. |
| **Da a** (`a`) | numero o espressione | `0` | L'estremo a, se l'ingresso non è collegato. |
| **A b** (`b`) | numero o espressione | `1` | L'estremo b, se l'ingresso non è collegato. |
| **Metodo** (`method`) | Gauss-Kronrod adattivo / Simpson adattivo / Romberg / Trapezi / Rettangoli al punto medio | Gauss-Kronrod adattivo | Come si calcola l'integrale (vedi [Integrale definito](int.definite)). |
| **Tolleranza** (`tolerance`) | da 1e-15 a 0,1 | 1e-10 | L'errore che i metodi adattivi cercano di non superare. |
| **Intervalli** (`n`) | da 1 a 99999 | 1000 | Quanti intervalli, per Trapezi e Rettangoli. |

## Come funziona

La lunghezza è

L = ∫ √(1 + f′(x)²) dx

La derivata f′ è calcolata in modo simbolico quando si può, altrimenti in modo numerico. Il risultato è il valore assoluto dell'integrale, quindi scambiare a e b non cambia la lunghezza.

- Gli estremi devono essere **finiti**.
- Dove la curva è verticale (come `sqrt(1-x^2)` in x = 1) la derivata non è finita: il risultato è un po' meno preciso, ma il blocco funziona.
- Si ferma dopo **100000 valutazioni** della funzione.
- Senza ingressi collegati calcola una volta all'avvio dello schema.

## Esempi

### 1. Un arco di parabola

```
[Lunghezza d'arco: x^2, da 0 a 1] lunghezza ──▶ valore [Print (console.log)]
```

Con le impostazioni di serie calcola all'avvio e scrive `1.4789428575446`.

### 2. Una retta

`f = x`, da 0 a 1: scrive `1.4142135623731` (√2, la diagonale del quadrato).

### 3. La catenaria

`f = cosh(x)`, da 0 a 1: scrive `1.1752011936438` (sinh 1).

### 4. Un quarto di cerchio

`f = sqrt(1-x^2)`, da 0 a 1: scrive `1.5707963110674` (vicino a π/2 = 1,5707963267949).

## Errori

| Messaggio | Quando |
|---|---|
| a: serve un numero (o un'espressione come pi/2), non «…» | Un estremo non è un numero né un'espressione senza variabili. |
| a: l'infinito non è ammesso qui | Un estremo è `inf` o `-inf`. |
| La funzione non ha un valore finito in x = … | La derivata (o f) dà un infinito o «non è un numero» in un punto. |
| Troppe valutazioni della funzione (più di 100000) | Servono più di 100000 valutazioni. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | Nella funzione c'è un nome che non è la variabile. |
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere …: … | La funzione è scritta male. |
| Nome di variabile non valido: «…» | La **Variabile** non è un nome valido. |

## Vedi anche

- [Derivata (simbolica)](fn.derivative) per la derivata f′ come formula
- [Solido di rotazione](int.revolution) per la superficie che nasce ruotando la curva
- [Integrale definito](int.definite) per gli altri integrali
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
