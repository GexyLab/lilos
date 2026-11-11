# Funzioni e derivate

`logicstudio-functions` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per le **funzioni** e il **calcolo differenziale**: calcolare una funzione scritta come formula (`3x^2 + 2sin(x) - ln(x)`), farne la tabella, trovarne le radici, risolvere equazioni e polinomi, potenze, esponenziali e logaritmi, e poi le **derivate** (simboliche e numeriche), la retta tangente, i limiti, il polinomio di Taylor e lo studio di funzione.

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-functions` («Logic Studio: i blocchi per le funzioni algebriche, esponenziali e logaritmiche e il calcolo differenziale…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Funzioni**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

### Funzioni

| Blocco | Cosa fa |
|---|---|
| [Funzione f(x)](fn.define) | Dà un valore ai parametri di una funzione (`a x^2 + b`) e la manda, semplificata, agli altri blocchi. |
| [Calcola f(x)](fn.eval) | Il valore della funzione in un punto o in una lista di punti. |
| [Tabella valori](fn.table) | La funzione su tanti punti tra due estremi, pronta per un grafico. |
| [Risolvi f(x) = 0](fn.solve) | Una radice della funzione, con il metodo di Brent o di Newton. |

### Algebriche

| Blocco | Cosa fa |
|---|---|
| [Equazione di 2° grado ax² + bx + c = 0](fn.quadratic) | Le due soluzioni, anche complesse, il discriminante e il vertice. |
| [Polinomio: valore e radici](fn.poly) | Il valore di un polinomio e tutte le sue radici, anche complesse. |
| [Operazioni tra polinomi](fn.polyOps) | Somma, prodotto, divisione con resto, MCD, derivata e integrale. |
| [Potenze e radici (Math.pow, Math.sqrt)](fn.power) | xⁿ, radice n-esima, quadrato, cubo, √, ∛, 1/x. |

### Esponenziali e logaritmi

| Blocco | Cosa fa |
|---|---|
| [Esponenziali (Math.exp)](fn.exp) | eˣ, 2ˣ, 10ˣ, aˣ, eˣ − 1. |
| [Logaritmi (Math.log)](fn.log) | ln, log₁₀, log₂, log in una base a scelta, ln(1 + x). |
| [Crescita e decadimento esponenziale](fn.growth) | N(t) = N₀·e^(k·t) dal tasso o dal tempo di dimezzamento o di raddoppio. |

### Calcolo differenziale

| Blocco | Cosa fa |
|---|---|
| [Derivata (simbolica)](fn.derivative) | La derivata come funzione, fino al 10° ordine. |
| [Derivata in un punto f'(x)](fn.derivativeAt) | Il valore della derivata in un punto, esatto o numerico, fino al 4° ordine. |
| [Retta tangente](fn.tangent) | Pendenza, intercetta e equazioni della tangente e della normale. |
| [Limite (numerico)](fn.limit) | Il limite in un punto o all'infinito, con i due lati. |
| [Polinomio di Taylor](fn.taylor) | L'approssimazione con un polinomio, fino al 12° ordine. |
| [Studio di funzione](fn.study) | Zeri, massimi, minimi, flessi, crescenza in un intervallo. |
| [Derivata di un segnale (d/dt)](fn.signalDerivative) | La velocità di variazione di una misura nel tempo. |

I blocchi che partono da soli all'avvio dello schema, quando niente è collegato ai loro ingressi, sono **Funzione f(x)**, **Tabella valori**, **Risolvi f(x) = 0**, **Derivata (simbolica)** e **Studio di funzione**: usano le impostazioni.

## Le espressioni

Una funzione viaggia come **testo**: un'espressione come `3x^2 + 2sin(x) - ln(x)`. Ogni blocco che ha un ingresso **f** la prende da lì oppure, se **f** non è collegato, dall'impostazione **Funzione** del blocco. Il pacchetto ha un suo lettore di espressioni: niente `eval`, niente librerie.

### Numeri e operatori

- I numeri si scrivono **con il punto**: `2.5`, `.5`, `1e-3`. La virgola non vale (`1,5` è un errore).
- Le operazioni: `+`, `-` (anche `−`), `*` (anche `·` e `×`), `/` (anche `÷`), `^` (anche `**`) e le potenze `²` e `³` (`x²` è `x^2`). Le parentesi sono tonde.
- `^` si legge da destra: `x^2^3` è `x^(2^3)`, cioè `x^8`. Il meno davanti si applica dopo la potenza: `-x^2` è `-(x^2)`. Dopo `^` può esserci un segno: `2^-1`.
- Le costanti sono `pi` (anche `π`) ed `e`. Non possono essere la variabile.
- Gli **angoli sono sempre in radianti**: `sin(pi/2)` è 1. Per i gradi usa [Angolo](unit.angle) del pacchetto [Grandezze e unità](logicstudio-units).

### Il prodotto implicito

Il segno `*` si può omettere tra un numero, un nome o una parentesi e quello che segue: `3x`, `2(x+1)`, `(x+1)(x-1)`, `x sin(x)`, `2 pi x`, `x y`. Attenzione a due cose:

- Un **numero dopo un nome o una parentesi** non è un prodotto: `x 3` e `(x)3` sono errori (scrivi `3x`).
- Un nome **seguito da una parentesi** è letto come una funzione: `x(2)` dà «`x` non è una funzione conosciuta». Scrivi `x*(2)` oppure `(2)x`.

### Nomi

Un nome è fatto di lettere, cifre e `_`, comincia con una lettera o `_` e può finire con degli apostrofi (`y'` e `y''` sono nomi). Maiuscole e minuscole sono diverse. Un nome che non è una funzione né una costante è una **variabile** o un **parametro** (vedi sotto).

### Le funzioni

Una funzione si scrive con le parentesi (`sin(x)`, `max(1, x)`). Per le funzioni con **un argomento** le parentesi si possono togliere: il nome si applica al **fattore** che segue, cioè a un numero, un nome, una parentesi o una potenza.

| Si scrive | Si legge | Perché |
|---|---|---|
| `sin x^2` | `sin(x^2)` | la potenza è un fattore solo |
| `sin x cos x` | `sin(x) * cos(x)` | ogni funzione prende il suo fattore |
| `sqrt x + 1` | `sqrt(x) + 1` | la somma non è un fattore |
| `sin -x` | `sin(-x)` | un meno davanti è ammesso |
| `sin 2x` | `sin(2) * x` | `2` è il fattore, poi `x` moltiplica: scrivi `sin(2x)` |

Le funzioni, con il numero di argomenti:

| Gruppo | Funzioni |
|---|---|
| Trigonometriche | `sin`, `cos`, `tan`, `cot`, `sec`, `csc` (1 argomento) |
| Trigonometriche inverse | `asin`, `acos`, `atan`, `acot`, `asec`, `acsc` (1); `atan2(y, x)` (2) |
| Iperboliche | `sinh`, `cosh`, `tanh`, `coth`, `sech`, `csch` (1) |
| Iperboliche inverse | `asinh`, `acosh`, `atanh` (1) |
| Esponenziali e logaritmi | `exp` (1), `ln` (1), `log` (1 o 2), `log2` (1), `log10` (1) |
| Potenze e radici | `sqrt` (1), `cbrt` (1), `root(n, x)` (2), `pow(a, b)` (2) |
| Valore | `abs`, `sign`, `floor`, `ceil`, `round` (1) |
| Più argomenti | `min`, `max`, `hypot` (da 1 a 16) |

- `ln` è il logaritmo **naturale**, `log` quello **in base 10**, `log(b, x)` quello **in base b** (`log(2, 8)` è 3), `log2` e `log10` quelli in base 2 e 10.
- `exp(x)` è `e^x`; `root(n, x)` è la radice n-esima (`root(3, 27)` è 3, e `root(3, -27)` è −3); `pow(a, b)` è `a^b`.
- `round` arrotonda al numero intero più vicino (la metà verso l'alto).
- Una funzione con troppi o troppo pochi argomenti dà un errore (vedi sotto).

I limiti: al massimo **2000 caratteri** e 200 parentesi una dentro l'altra.

### La variabile

Quasi tutti i blocchi hanno l'impostazione **Variabile**, di serie `x`: è il nome che prende il valore (per esempio quello dell'ingresso **x** di [Calcola f(x)](fn.eval)). Può essere lettere, cifre e `_` con apostrofi alla fine, ma non `pi` né `e`. [Retta tangente](fn.tangent) usa sempre `x`.

### I parametri

Gli altri nomi dell'espressione sono **parametri**: hanno bisogno di un valore. Si dà con il blocco [Funzione f(x)](fn.define): metti la funzione `a x^2 + b` nella sua impostazione **Funzione**, aggiungi gli ingressi **a** e **b** e collega **f** agli altri blocchi. [Calcola f(x)](fn.eval) può anche avere ingressi aggiunti per più variabili. Un nome senza valore ferma il blocco con «Parametro senza valore».

[Derivata (simbolica)](fn.derivative) è l'eccezione: i nomi diversi dalla variabile sono costanti, e restano nel risultato (`a x^3` dà `3a*x^2`).

### Come si scrivono i risultati

Le funzioni che escono dai blocchi ([Funzione f(x)](fn.define), [Derivata (simbolica)](fn.derivative), [Polinomio di Taylor](fn.taylor)…) sono **semplificate** e scritte in modo che si possano rimettere in un altro blocco:

- i conti con i numeri sono fatti e i termini messi in ordine (`x^2 + x^3` esce `x^3 + x^2`);
- il numero davanti si attacca al nome (`3x`, `2e^(2x)`), tra due fattori che non sono numeri c'è `*` (`x*sin(x)`);
- le frazioni semplici sono frazioni: `x^3/3`, `-1/x^2`, `x/2`, `-cos(3x)/3` (il denominatore arriva fino a 64; oltre i numeri restano decimali);
- gli altri numeri hanno al massimo 12 cifre significative (`2.71828182846x`);
- la semplificazione non riduce le frazioni di polinomi: `(x^2 - 1)/(x - 1)` resta così.

I numeri che escono dai blocchi sono arrotondati a **15 cifre significative**, così il resto dei numeri con la virgola del computer non si vede (`0.30000000000000004` esce `0.3`).

## Gli errori delle espressioni

Se una funzione è scritta male, il blocco manda un errore dalla porta **Exception** (o nella console principale se non è collegata), con uno di questi messaggi (la `N` è il numero del carattere dove il lettore si è fermato, da 1):

| Messaggio | Quando | Esempio |
|---|---|---|
| Espressione vuota | La funzione è vuota o fatta di spazi. | |
| Espressione troppo lunga (al massimo 2000 caratteri) | Più di 2000 caratteri. | |
| Espressione non valida al carattere N: numero scritto male | Un numero non si legge. | |
| Espressione non valida al carattere N: «c» non è ammesso | Un carattere che non fa parte delle espressioni. | `x$` (carattere 2) |
| Espressione non valida al carattere N: l'espressione finisce troppo presto | Manca qualcosa alla fine. | `2x +` (carattere 5) |
| Espressione non valida al carattere N: manca una parentesi chiusa | Una parentesi non è chiusa. | `(x+1` (carattere 5) |
| Espressione non valida al carattere N: parentesi chiusa in più | Una `)` senza la sua `(`. | `x+1)` (carattere 4) |
| Espressione non valida al carattere N: troppe parentesi annidate | Più di 200 parentesi una dentro l'altra. | |
| Espressione non valida al carattere N: «…» fuori posto | Un pezzo che non può stare lì. | `3 4` (carattere 3), `1,5` (carattere 2), `*x` (carattere 1) |
| Espressione non valida al carattere N: manca un operatore prima del numero | Un numero dopo un nome o una parentesi. | `x 3` (carattere 3) |
| Espressione non valida al carattere N: sin vuole un argomento | Una funzione senza argomento. | `sin` (carattere 4) |
| Espressione non valida al carattere N: «foo» non è una funzione conosciuta | Un nome seguito da una parentesi che non è una funzione. | `foo(x)`, `x(2)` |
| Espressione non valida: sin vuole 1 argomenti, ne ha 2 | Troppi o troppo pochi argomenti (`da 1 a 2` per `log`, `da 1 a 16` per `min`…). | `sin(1, 2)`, `pow(2)` |
| Parametro senza valore: … | Un nome che non è la variabile non ha un valore. Il messaggio continua con «(dagli un valore con il blocco Funzione f(x); la variabile è x)»; con più nomi è «Parametri senza valore» e «le variabili sono x, y». | `a x` senza **a** |
| Nome di variabile non valido: «…» | L'impostazione **Variabile** non è un nome. | `1x` |
| «…» è una costante, non può essere la variabile | **Variabile** è `pi` o `e`. | `pi` |
| f deve essere un'espressione di testo, come «x^2 + 1» | Su **f** arriva qualcosa che non è un testo né un numero. | una lista |

Gli errori di calcolo (un logaritmo di zero, una divisione per zero…) hanno i loro messaggi, elencati nella pagina di ogni blocco.

## Errori dei blocchi

Gli errori escono dalla porta **Exception** del blocco, che è nascosta di serie, oppure vanno nella console principale se non è collegata. Ogni pagina elenca i messaggi esatti. I messaggi sono in italiano.

## Numeri e liste

I blocchi che prendono un numero accettano anche un testo con un numero (`"2,5"` e `"2.5"` vanno bene). I blocchi con liste ne accettano fino a **10000 elementi**; i polinomi arrivano al **grado 100**. Dove un blocco lavora su una lista di punti, un punto senza valore finito diventa `null` e non dà errore.

## Vedi anche

- [Integrali](logicstudio-integrals) per integrare le stesse funzioni, ad esempio [Integrale definito ∫ₐᵇ f(x) dx](int.definite) e [Primitiva (integrale indefinito)](int.primitive)
- [Blocchi di base](logicstudio-core), per esempio [Costante · Variabile](core.value) e [Print (console.log)](core.consoleWrite)
- [Grafici](logicstudio-charts) per disegnare una [Tabella valori](fn.table)
- [Grandezze e unità](logicstudio-units) per i gradi e i radianti
- [Come funziona un blocco](ide/blocks)
