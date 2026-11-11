# Area tra due curve

`int.area` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Calcola l'area della parte di piano tra due curve f e g (o tra f e l'asse x), in un intervallo. L'area è sempre positiva, anche dove le curve si scambiano di posto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La prima curva, come `x^2`. Se non è collegato vale l'impostazione **Funzione**. |
| **g (seconda curva)** (`g`) | testo | La seconda curva. Se non è collegato vale l'impostazione **Seconda curva g**. |
| **a (da)** (`a`) | qualsiasi | L'estremo di sinistra: un numero o un'espressione come `-pi`. Se non è collegato vale l'impostazione **Da a**. |
| **b (a)** (`b`) | qualsiasi | L'estremo di destra. Se non è collegato vale l'impostazione **A b**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **area** (`area`) | numero | L'area tra le due curve, sempre positiva o zero. |
| **∫ (f − g)** (`signed`) | numero | L'integrale con il segno: dove f è sopra g conta in più, dove è sotto conta in meno. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **punti d'incontro x** (`crossings`) | lista | Le x, dentro l'intervallo, in cui f e g si incrociano, in ordine. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Un errore del calcolo (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`expr`) | testo | `x` | La prima curva f, se **f** non è collegato. |
| **Seconda curva g** (`g`) | testo | `0` | La seconda curva, se **g** non è collegato. `0` vuol dire l'asse x. |
| **Variabile** (`variable`) | testo | `x` | Il nome della variabile nelle due funzioni. |
| **Da a** (`a`) | numero o espressione | `-1` | L'estremo a, se l'ingresso non è collegato. |
| **A b** (`b`) | numero o espressione | `1` | L'estremo b, se l'ingresso non è collegato. |
| **Metodo** (`method`) | Gauss-Kronrod adattivo / Simpson adattivo / Romberg / Trapezi / Rettangoli al punto medio | Gauss-Kronrod adattivo | Come si calcola l'integrale (vedi [Integrale definito](int.definite)). |
| **Tolleranza** (`tolerance`) | da 1e-15 a 0,1 | 1e-10 | L'errore che i metodi adattivi cercano di non superare. |
| **Intervalli** (`n`) | da 1 a 99999 | 1000 | Quanti intervalli, per Trapezi e Rettangoli. |

## Come funziona

L'area è ∫ |f(x) − g(x)| dx tra a e b. Per togliere il valore assoluto il blocco:

1. guarda f − g in 1000 punti dell'intervallo e trova dove cambia segno;
2. raffina ogni punto con il metodo di Brent (sono i **punti d'incontro**);
3. integra f − g in ogni pezzo, prende il valore assoluto di ogni pezzo e li somma.

Con **g** = `0` è l'area tra la curva e l'asse x, con le parti sotto l'asse contate come positive.

- Se **a** è più grande di **b** i due estremi vengono scambiati: l'area è la stessa, e **∫ (f − g)** cambia segno.
- Le curve devono incrociarsi in punti dove cambiano segno: se si toccano soltanto (come `x^2` con `0` in 0) il punto non appare tra i punti d'incontro, ma l'area è giusta.
- Gli estremi devono essere **finiti**.
- Ogni pezzo si ferma dopo **100000 valutazioni** della funzione.
- Senza ingressi collegati calcola una volta all'avvio dello schema.

## Esempi

### 1. L'area tra una parabola e una retta

```
[Area tra due curve: f = x^2, g = x, da 0 a 1] area ──▶ valore [Print (console.log)]
```

Nessun ingresso collegato: calcola all'avvio. Scrive `0.16666666666667` (1/6). **∫ (f − g)** è `-0.16666666666667`, perché qui x² sta sotto x.

### 2. Una funzione che attraversa l'asse

`sin(x)` con g = `0`, da 0 a 2π (scrivi `2*pi` in **A b**):

- **area**: `4` (due gobbe da 2)
- **∫ (f − g)**: `0` (le due gobbe si annullano)
- **punti d'incontro x**: `[3.14159265358979]`

### 3. Una curva dispari

`x^3` contro `x` da -1 a 1: **area** `0.5`, **∫ (f − g)** `0`, **punti d'incontro** `[0]`.

Con le impostazioni di serie (f = `x`, g = `0`, da -1 a 1) l'area è `1`.

## Errori

| Messaggio | Quando |
|---|---|
| a: serve un numero (o un'espressione come pi/2), non «…» | Un estremo non è un numero né un'espressione senza variabili. |
| a: l'infinito non è ammesso qui | Un estremo è `inf` o `-inf`. |
| La funzione non ha un valore finito in x = … | f o g danno un infinito o «non è un numero» in un punto. |
| Troppe valutazioni della funzione (più di 100000) | Un pezzo richiede più di 100000 valutazioni. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | In f o in g c'è un nome che non è la variabile. |
| Espressione vuota | f o g sono vuote. |
| Espressione non valida al carattere …: … | f o g sono scritte male. |
| f deve essere un'espressione di testo, come «x^2 + 1» | A un ingresso **f** o **g** arriva qualcosa che non è un testo. |
| Nome di variabile non valido: «…» | La **Variabile** non è un nome valido. |

## Vedi anche

- [Integrale definito](int.definite) per l'area con il segno
- [Solido di rotazione](int.revolution) per il volume che nasce ruotando la stessa regione
- [Lunghezza d'arco](int.arcLength) per la lunghezza di una curva
- [Funzione f(x)](fn.define) per dare un nome alle funzioni
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
