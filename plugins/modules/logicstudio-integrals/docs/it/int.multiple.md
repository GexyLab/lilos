# Integrale doppio e triplo

`int.multiple` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Calcola un integrale doppio ∬ f(x, y) dy dx o triplo ∭ f(x, y, z) dz dy dx. Gli estremi interni possono dipendere dalle variabili esterne, così si integra su regioni curve.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come `x*y` o `x*y*z`. Se non è collegato vale l'impostazione **Funzione**. |
| **x da** (`x1`) | qualsiasi | L'estremo di sinistra di x: un numero o un'espressione come `pi/2`. Se non è collegato vale l'impostazione **x da**. |
| **x a** (`x2`) | qualsiasi | L'estremo di destra di x. |
| **y da (numero o in x)** (`y1`) | qualsiasi | L'estremo inferiore di y: un numero, o un'espressione che usa solo `x` (per esempio `-sqrt(1-x^2)`). |
| **y a (numero o in x)** (`y2`) | qualsiasi | L'estremo superiore di y. |
| **z da (in x, y)** (`z1`) | qualsiasi | L'estremo inferiore di z (solo nel triplo): un numero, o un'espressione in `x` e `y`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **z a (in x, y)** (`z2`) | qualsiasi | L'estremo superiore di z (solo nel triplo). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

Per ogni estremo non collegato vale l'impostazione con lo stesso nome.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **integrale** (`value`) | numero | Il valore dell'integrale. |
| **valutazioni** (`evaluations`) | numero | Quante volte è stata calcolata la funzione. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Un errore del calcolo (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione f(x, y) o f(x, y, z)** (`expr`) | testo | `x*y` | La funzione, se **f** non è collegato. Le variabili sono sempre `x`, `y` (e `z`). |
| **Integrale** (`dims`) | Doppio ∬ dy dx / Triplo ∭ dz dy dx | Doppio | Quante variabili. |
| **x da** (`x1`) | numero o espressione | `0` | L'estremo inferiore di x. |
| **x a** (`x2`) | numero o espressione | `1` | L'estremo superiore di x. |
| **y da** (`y1`) | numero o espressione in x | `0` | L'estremo inferiore di y. |
| **y a** (`y2`) | numero o espressione in x | `1` | L'estremo superiore di y. |
| **z da** (`z1`) | numero o espressione in x, y | `0` | L'estremo inferiore di z. Conta solo nel triplo. |
| **z a** (`z2`) | numero o espressione in x, y | `1` | L'estremo superiore di z. Conta solo nel triplo. |
| **Tolleranza** (`tolerance`) | da 1e-12 a 0,1 | 1e-8 | L'errore che il calcolo cerca di non superare. |

## Come funziona

Il blocco fa gli integrali uno dentro l'altro, dall'interno: per ogni x calcola l'integrale in y (nel triplo, per ogni x e y prima l'integrale in z), poi l'integrale in x del risultato. Ogni integrale è un Gauss-Kronrod adattivo; la tolleranza è più stretta per quelli interni.

- Gli estremi di **x** sono numeri o espressioni senza variabili (`pi`, `2*pi`).
- Gli estremi di **y** sono numeri o espressioni che usano solo `x`: `0`, `x`, `1-x`, `sqrt(1-x^2)`.
- Gli estremi di **z** sono numeri o espressioni in `x` e `y`.
- Gli estremi devono avere un valore finito: `inf` non è ammesso.
- Il numero di valutazioni cresce in fretta (un doppio integrale ne fa centinaia o migliaia). Il blocco si ferma dopo **2000000 valutazioni** della funzione.
- La precisione è molto buona per funzioni lisce; con estremi che hanno una radice (come un cerchio) è più bassa (circa 8-9 cifre).
- Senza ingressi collegati calcola una volta all'avvio dello schema.

## Esempi

### 1. Il rettangolo di serie

```
[Integrale doppio e triplo: x*y, x da 0 a 1, y da 0 a 1] integrale ──▶ valore [Print (console.log)]
```

Nessun ingresso collegato: calcola all'avvio. Scrive `0.25`; con **valutazioni** collegata, `225`.

### 2. Un triangolo

`f = x+y`, x da 0 a 1, **y da** = `0`, **y a** = `x`: scrive `0.5`.

### 3. L'area di un cerchio

`f = 1`, x da -1 a 1, **y da** = `-sqrt(1-x^2)`, **y a** = `sqrt(1-x^2)`: scrive `3.1415926551622` (π, con circa 9 cifre giuste).

### 4. Un integrale triplo

**Integrale** = triplo, `f = x*y*z`, tutti gli estremi da 0 a 1: scrive `0.125`.

Il volume di un tetraedro: `f = 1`, x da 0 a 1, y da 0 a `1-x`, z da 0 a `1-x-y`: scrive `0.16666666666667` (1/6).

## Errori

| Messaggio | Quando |
|---|---|
| y da: può usare solo x, non … | Un estremo di y usa una variabile diversa da x (per z: diversa da x e y). Il nome dell'estremo (`y da`, `y a`, `z da`, `z a`) apre il messaggio. |
| y da: serve un numero o un'espressione | Un estremo di y o z è vuoto. |
| y da non ha un valore finito | L'espressione di un estremo non ha un valore finito per qualche x (per esempio `sqrt(1-x^2)` fuori da [-1, 1] dà `NaN`). |
| y da: serve un numero finito | Un estremo di y o z arriva come numero ed è infinito o `NaN`. |
| x da: serve un numero (o un'espressione come pi/2), non «…» | Un estremo di x non è un numero né un'espressione senza variabili. |
| x a: l'infinito non è ammesso qui | Un estremo (di x, y o z) è `inf` o `-inf`: al posto di `x a` c'è il nome dell'estremo. |
| La funzione non ha un valore finito in x = … | La funzione dà un infinito o «non è un numero» in un punto. |
| Troppe valutazioni della funzione (più di 2000000) | Servono più di 2000000 valutazioni. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); le variabili sono x, y) | Nella funzione c'è un nome che non è x, y (o z). |
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere …: … | La funzione o un estremo è scritta male. |

## Vedi anche

- [Integrale definito](int.definite) per l'integrale in una variabile
- [Area tra due curve](int.area) per l'area tra due curve di y = f(x)
- [Funzione f(x)](fn.define) per dare un nome alle funzioni
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
