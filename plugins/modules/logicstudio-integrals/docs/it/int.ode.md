# Equazione differenziale y' = f(x, y)

`int.ode` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Risolve un'equazione differenziale con una condizione iniziale: del 1° ordine y′ = f(x, y) o del 2° ordine y″ = f(x, y, y′). Dà il valore alla fine e tutti i punti della soluzione, pronti per un grafico.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione f, come `-2x*y`. Usa `x` (o il nome scelto in **Variabile**), `y` e, nel 2° ordine, `y'`. Se non è collegato vale l'impostazione **f**. |
| **x₀** (`x0`) | qualsiasi | Il punto di partenza: un numero o un'espressione. Se non è collegato vale l'impostazione **x₀**. |
| **y(x₀)** (`y0`) | numero | Il valore di y in x₀. Se non è collegato vale l'impostazione **y(x₀)**. |
| **y'(x₀) (2° ordine)** (`dy0`) | numero | La pendenza in x₀, solo nel 2° ordine. Se non è collegato vale l'impostazione **y'(x₀)**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **x finale** (`x1`) | qualsiasi | Il punto di arrivo: un numero o un'espressione. Può essere più piccolo di x₀ (si va indietro). Se non è collegato vale l'impostazione **x finale**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **y(x finale)** (`y`) | numero | Il valore di y nel punto finale. |
| **y'(x finale)** (`dy`) | numero | La pendenza nel punto finale (solo nel 2° ordine). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **punti {x, y}** (`points`) | lista | Tutti i punti calcolati, `{x, y}`, dal primo (x₀) all'ultimo (x finale). Al massimo 10000. |
| **Exception** (`error`) | oggetto | Un errore del calcolo (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Ordine** (`order`) | 1°: y′ = f(x, y) / 2°: y″ = f(x, y, y′) | 1° | Che equazione si risolve. |
| **f** (`expr`) | testo | `-2x*y` | La funzione, se l'ingresso non è collegato. |
| **Variabile** (`variable`) | testo | `x` | Il nome della variabile indipendente (per esempio `t`). |
| **x₀** (`x0`) | numero o espressione | `0` | Il punto di partenza. |
| **y(x₀)** (`y0`) | numero | 1 | Il valore iniziale. |
| **y'(x₀)** (`dy0`) | numero | 0 | La pendenza iniziale. Si vede solo con l'**Ordine** 2°. |
| **x finale** (`x1`) | numero o espressione | `2` | Il punto di arrivo. |
| **Metodo** (`method`) | Runge-Kutta 4(5) adattivo (Dormand-Prince) / Runge-Kutta 4 a passi fissi / Eulero a passi fissi | Runge-Kutta 4(5) | Come si risolve (vedi sotto). |
| **Passi (RK4, Eulero)** (`steps`) | da 1 a 1000000 | 1000 | Quanti passi, per i metodi a passi fissi. |
| **Tolleranza (RK45)** (`tolerance`) | da 1e-14 a 0,1 | 1e-8 | L'errore che Runge-Kutta 4(5) cerca di non superare. |

## Come funziona

| Metodo | Cosa fa |
|---|---|
| **Runge-Kutta 4(5) adattivo** (`rk45`) | Dormand-Prince: sceglie da solo la lunghezza di ogni passo, piccola dove la soluzione cambia in fretta e grande dove è calma. È il più comodo e preciso. |
| **Runge-Kutta 4** (`rk4`) | Passi tutti uguali, molto più precisi di Eulero. |
| **Eulero** (`euler`) | Passi tutti uguali, il più semplice e il meno preciso: serve per vedere l'errore. |

Il **2° ordine** si risolve come due equazioni del 1° ordine insieme (y e y′). Per esempio un oscillatore y″ = −y, o la caduta libera y″ = −9.81.

- Se **x finale** è uguale a **x₀**, la soluzione ha solo il punto di partenza.
- **punti** ha, con RK45, un punto per ogni passo accettato; con RK4 ed Eulero un punto per ogni passo (se sono più di 10000, uno ogni tanti).
- Se la soluzione cresce senza fine (come y′ = y²), il blocco si ferma con un errore.
- Il blocco si ferma dopo **1000000 valutazioni** della funzione.
- Senza ingressi collegati calcola una volta all'avvio dello schema.

## Esempi

### 1. Il decadimento di serie

```
[Equazione differenziale: y' = -2x*y, y(0) = 1, fino a 2] y(x finale) ──▶ valore [Print (console.log)]
```

Nessun ingresso collegato: calcola all'avvio. Scrive `0.0183156414589237` (la soluzione vera è e⁻⁴ = 0,0183156388887). Il blocco manda anche 31 punti, il primo `{"x":0,"y":1}`.

### 2. I tre metodi a confronto

y′ = y, y(0) = 1, fino a x = 1 (la soluzione vera è e = 2,718281828…), con 10 passi fissi:

- **Runge-Kutta 4(5)**: `2.71828183620885` (11 punti nella lista, con la tolleranza di serie)
- **Runge-Kutta 4**: `2.71827974413517`
- **Eulero**: `2.5937424601`

### 3. Una molla e una caduta (2° ordine)

**Ordine** = 2°, `-y`, y(0) = 0, y′(0) = 1, **x finale** = `pi/2`: **y** = `0.999999995102742` (sin(π/2) = 1) e **y′** = `-8.84496666880841e-10` (cos(π/2) = 0).

Caduta libera: `-9.81`, y(0) = 100, y′(0) = 0, **x finale** = 2: **y** = `80.38`, **y′** = `-19.62`.

### 4. Una crescita che si ferma

`y*(1-y)` (logistica), y(0) = 0.1, **x finale** = 5: **y** = `0.942825618123814`.

## Errori

| Messaggio | Quando |
|---|---|
| Passo troppo piccolo in x = …: l'equazione è rigida o la soluzione esplode | RK45 deve fare passi minuscoli (la soluzione va all'infinito, come in `y^2`, oppure l'equazione è rigida). |
| La soluzione non è più finita in x = … | La soluzione diventa infinita o «non è un numero». |
| Troppi passi: allarga la tolleranza | RK45 ha fatto più di 200000 tentativi. |
| Troppe valutazioni della funzione (più di 1000000) | Servono più di 1000000 valutazioni. |
| x₀: serve un numero (o un'espressione come pi/2), non «…» | **x₀** non è un numero né un'espressione senza variabili. Per il punto finale il nome è `x finale`. |
| x₀: l'infinito non è ammesso qui | **x₀** o **x finale** è `inf`. |
| y(x₀): serve un numero | **y(x₀)** non è un numero. |
| y'(x₀): serve un numero | **y'(x₀)** non è un numero (2° ordine). |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); le variabili sono x, y) | Nella funzione c'è un nome che non è `x`, `y` (o `y'`). |
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere …: … | La funzione è scritta male. |
| Nome di variabile non valido: «…» | La **Variabile** non è un nome valido. |

## Vedi anche

- [Integrale definito](int.definite) quando f dipende solo da x
- [Integratore di segnale](int.signal) per integrare nel tempo un valore dal vivo
- [Tabella valori](fn.table) per avere i valori di una formula
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
