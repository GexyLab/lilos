# Limite (numerico)

`fn.limit` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Il limite di una funzione quando x tende a un punto o all'infinito, calcolato **in modo numerico**, con i due limiti laterali.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo. Se non è collegato vale l'impostazione **Funzione**. |
| **x₀ (numero, inf, -inf)** (`x0`) | qualsiasi | Il punto a cui tende x: un numero, un testo come `pi/2`, oppure `inf`, `-inf` (anche `∞`, `-∞`). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **limite** (`value`) | numero | Il limite. Un numero se il limite è finito; il numero infinito (+∞ o −∞) se la funzione cresce senza limite (con **esiste** falso); niente se il limite non c'è o non si riesce a stabilire. |
| **esiste** (`exists`) | sì/no | `true` solo se il limite è un **numero finito**. Per un limite infinito è `false` (il valore +∞ o −∞ esce comunque su **limite**). |
| **da sinistra** (`left`) | numero | Il limite da sinistra (x → x₀⁻): un numero, ±∞, o niente. Solo per un x₀ finito. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **da destra** (`right`) | numero | Il limite da destra (x → x₀⁺), come **da sinistra**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `sin(x)/x` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile. |
| **Lato** (`side`) | `both` Entrambi i lati; `left` Da sinistra (x → x₀⁻); `right` Da destra (x → x₀⁺) | `both` | Da quale lato avvicinarsi (solo per un x₀ finito). Con un lato solo, l'altro non è calcolato. |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

La variabile è **x**, oppure il nome scelto in **Variabile** (lettere, cifre e `_`, con eventuali apostrofi alla fine; non può essere `pi` né `e`). Gli altri nomi sono parametri e devono avere un valore (vedi [Funzione f(x)](fn.define)).

**Il metodo.** Il blocco non fa calcoli simbolici: calcola la funzione su punti sempre più vicini a x₀, da un lato (x₀ ± h con h = 10⁻¹, 10⁻² … 10⁻⁹, in proporzione a |x₀| se è grande), oppure sempre più lontani (x = 10, 10² … 10⁹) se x₀ è infinito, e guarda come vanno i valori.

- Da coppie di campioni vicini ricava dei valori **estrapolati** (estrapolazione di Richardson, che toglie l'errore che cresce con h): per ogni coppia due stime, una per un errore proporzionale a h e una per un errore proporzionale a h². La coppia in cui le due stime **si accordano meglio** vince, e il lato ha il limite finito che ne esce.
- Se il risultato coincide con f(x₀) entro la precisione raggiunta, esce **esattamente** f(x₀); un risultato vicino a 0 diventa 0; altrimenti è scritto con 10 cifre significative.
- Se gli ultimi valori sono tutti enormi (oltre 10⁵), dello stesso segno e **sempre più grandi**, il limite è +∞ o −∞.
- Altrimenti (valori che oscillano come `sin(1/x)`, che crescono lentamente come `ln(x)` in 0, che non esistono su quel lato come `sqrt(x)` a sinistra di 0) il lato **non si stabilisce** e il limite non c'è. Una divergenza lenta come `ln(x)` in 0 è quindi riportata come limite che non esiste, non come −∞.
- Con **Entrambi i lati** i due lati devono dare lo stesso risultato (uguali, o finiti con differenza relativa sotto 10⁻⁶); altrimenti **limite** resta vuoto (per `1/x` in 0 i lati sono −∞ e +∞, per `abs(x)/x` sono −1 e 1, per `x ln(x)` in 0 il lato sinistro è fuori dal dominio). Con un lato solo vale quel lato.
- Con x₀ infinito il lato è quello dell'infinito scelto e **da sinistra** e **da destra** restano vuoti.
- Le valutazioni dove la funzione dà un errore o non è un numero valgono «non stabilito».

È sempre una stima numerica: per una funzione continua il limite è il valore, e con [Calcola f(x)](fn.eval) lo ottieni subito. Le funzioni che oscillano o hanno salti dentro l'intervallo dei campioni possono non stabilirsi: il blocco dice allora che il limite non c'è.

- Il blocco non parte da solo all'avvio: serve **x₀**.

## Esempi

### 1. Il limite notevole

`sin(x)/x` in 0:

```
[Costante · Variabile: 0] valore ──▶ x₀ [Limite (numerico): sin(x)/x] limite ──▶ valore [Print (console.log)]
```

Scrive `1`. **esiste** è `true`; **da sinistra** e **da destra** sono `1`.

### 2. Un limite che non c'è

- `1/x` in 0: **limite** vuoto, **esiste** `false`, **da sinistra** −∞, **da destra** +∞. Con il lato **Da destra**: **limite** +∞, **esiste** `false`.
- `abs(x)/x` in 0: **da sinistra** −1, **da destra** 1, **limite** vuoto, **esiste** `false`.
- `ln(x)` in 0 da destra: **esiste** `false` e **limite** vuoto (divergenza lenta).
- `tan(x)` con **x₀** `pi/2`: da sinistra +∞, da destra −∞: nessun limite.

### 3. Un limite infinito

`1/x^2` in 0: **limite** +∞, **esiste** `false`. `x^2` con **x₀** `inf`: +∞. `x^3` con `-inf`: −∞.

### 4. Funzioni continue e punti da «riempire»

`x^2` in 3: `9`. `2x` in 0: `0`. `(x^2-1)/(x-1)` in 1: `2` (la funzione non è definita in 1, ma il limite c'è). `(e^x-1)/x` in 0: `1`. `(1-cos(x))/x^2` in 0: `0.5`, **esiste** `true`.

### 5. Un lato solo

`x ln(x)` in 0: il lato sinistro è fuori dal dominio, quindi con **Entrambi i lati** **limite** è vuoto e **esiste** `false`; con il lato **Da destra** **limite** è `0` e **esiste** `true`.

### 6. All'infinito

`(1+1/x)^x` con **x₀** `inf`: **limite** `2.718281828`, **esiste** `true` (il numero e). `1/x` con `inf`: `0`. `x/(x+1)` con `inf`: `1`. `atan(x)` con `inf`: `1.570796327`. `e^x` con `-inf`: `0`.

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
| … : serve un numero (o un'espressione come pi/2), non «…» | Un estremo o un punto scritto come testo non è un numero né un'espressione di numeri (per esempio `abc`). |
| x₀: serve un numero | **x₀** è vuoto o non è un numero. |

## Vedi anche

- [Calcola f(x)](fn.eval) per il valore di una funzione continua
- [Derivata in un punto f'(x)](fn.derivativeAt), che è un limite del rapporto incrementale
- [Studio di funzione](fn.study) per zeri, massimi, minimi e flessi
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
