# Solido di rotazione

`int.revolution` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Calcola il volume e la superficie laterale del solido che nasce ruotando la regione sotto una curva attorno all'asse x o all'asse y. Con una seconda curva interna il solido ha un foro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La curva esterna, come `sqrt(x)`. Se non è collegato vale l'impostazione **Funzione**. |
| **a (da)** (`a`) | qualsiasi | L'estremo di sinistra: un numero o un'espressione. Se non è collegato vale l'impostazione **Da a**. |
| **b (a)** (`b`) | qualsiasi | L'estremo di destra. Se non è collegato vale l'impostazione **A b**. |
| **g (curva interna)** (`g`) | testo | La curva interna, che fa il foro. Se non è collegato vale l'impostazione **Curva interna g**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume del solido. |
| **superficie laterale** (`surface`) | numero | La superficie laterale della curva esterna f ruotata. |
| **Exception** (`error`) | oggetto | Un errore del calcolo (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`expr`) | testo | `sqrt(x)` | La curva esterna, se **f** non è collegato. |
| **Curva interna g** (`g`) | testo | `0` | La curva interna (un foro), se **g** non è collegato. `0` vuol dire nessun foro. |
| **Variabile** (`variable`) | testo | `x` | Il nome della variabile nelle due funzioni. |
| **Da a** (`a`) | numero o espressione | `0` | L'estremo a, se l'ingresso non è collegato. |
| **A b** (`b`) | numero o espressione | `4` | L'estremo b, se l'ingresso non è collegato. |
| **Asse** (`axis`) | Asse x (dischi) / Asse y (gusci, 0 ≤ a < b) | Asse x | Attorno a quale asse ruota la regione. |
| **Metodo** (`method`) | Gauss-Kronrod adattivo / Simpson adattivo / Romberg / Trapezi / Rettangoli al punto medio | Gauss-Kronrod adattivo | Come si calcolano gli integrali (vedi [Integrale definito](int.definite)). |
| **Tolleranza** (`tolerance`) | da 1e-15 a 0,1 | 1e-10 | L'errore che i metodi adattivi cercano di non superare. |
| **Intervalli** (`n`) | da 1 a 99999 | 1000 | Quanti intervalli, per Trapezi e Rettangoli. |

## Come funziona

**Asse x (dischi e rondelle).** Ogni sezione è un disco con il buco: il volume è

V = π ∫ |f(x)² − g(x)²| dx

con l'integrale spezzato dove f² − g² cambia segno. La superficie laterale è

S = 2π ∫ |f(x)| · √(1 + f′(x)²) dx

**Asse y (gusci).** Ogni striscia verticale ruota e forma un guscio cilindrico: il volume è

V = 2π ∫ x · |f(x) − g(x)| dx

(spezzato dove f − g cambia segno), e la superficie è S = 2π ∫ x · √(1 + f′(x)²) dx. Qui serve 0 ≤ a < b.

- La **superficie** riguarda solo la curva esterna **f**: la superficie del foro non è contata.
- La derivata f′ è simbolica quando si può, altrimenti numerica.
- Serve **a** minore di **b**; gli estremi devono essere finiti.
- Ogni integrale si ferma dopo **100000 valutazioni** della funzione.
- Senza ingressi collegati calcola una volta all'avvio dello schema.

## Esempi

### 1. Un paraboloide

```
[Solido di rotazione: sqrt(x), da 0 a 4, asse x] volume ──▶ valore [Print (console.log)]
```

Con le impostazioni di serie calcola all'avvio e scrive `25.1327412287183` (8π). La **superficie laterale** è `36.1769031974113`.

### 2. Un cono

`f = x`, da 0 a 1, asse x: **volume** `1.04719755119659` (π/3), **superficie** `4.44288293815838` (π√2).

### 3. Una sfera

`f = sqrt(1-x^2)`, da -1 a 1: **volume** `4.18879020478629` (4π/3), **superficie** `12.5663706143592` (4π).

### 4. Un solido con il foro

`f = x`, **Curva interna g** = `x^2`, da 0 a 1, asse x: **volume** `0.418879020478629` (2π/15).

### 5. I gusci attorno all'asse y

`f = x`, da 0 a 1, **Asse** = y: **volume** `2.09439510239317` (2π/3).

## Errori

| Messaggio | Quando |
|---|---|
| Serve a minore di b | a è uguale o più grande di b. |
| Per la rotazione attorno all'asse y serve 0 ≤ a < b | Con l'asse y, a è negativo. |
| a: serve un numero (o un'espressione come pi/2), non «…» | Un estremo non è un numero né un'espressione senza variabili. |
| a: l'infinito non è ammesso qui | Un estremo è `inf` o `-inf`. |
| La funzione non ha un valore finito in x = … | f o g danno un infinito o «non è un numero» in un punto. |
| Troppe valutazioni della funzione (più di 100000) | Un integrale richiede più di 100000 valutazioni. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | In f o in g c'è un nome che non è la variabile. |
| Espressione vuota | f o g sono vuote. |
| Espressione non valida al carattere …: … | f o g sono scritte male. |
| Nome di variabile non valido: «…» | La **Variabile** non è un nome valido. |

## Vedi anche

- [Area tra due curve](int.area) per l'area della regione che ruota
- [Lunghezza d'arco](int.arcLength) per la lunghezza della curva
- [Sfera](solid.sphere) per le formule dirette della sfera
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
