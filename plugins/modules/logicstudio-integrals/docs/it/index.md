# Integrali

`logicstudio-integrals` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per gli **integrali**: l'integrale definito (anche con estremi infiniti), la primitiva simbolica, la funzione integrale, il valore medio, l'area tra due curve, i solidi di rotazione, la lunghezza d'arco, gli integrali doppi e tripli, l'integrale di dati e di segnali, e le equazioni differenziali.

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-integrals`. Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Integrali**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

### Integrali di funzioni

| Blocco | Cosa fa |
|---|---|
| [Integrale definito](int.definite) | Calcola ∫ f(x) dx tra due estremi, con il metodo che scegli; gli estremi possono essere infiniti. |
| [Primitiva (integrale indefinito)](int.primitive) | Trova la primitiva F(x) come testo, e controlla il risultato derivandolo. |
| [Funzione integrale](int.function) | Calcola F(x) = ∫ₐˣ f(t) dt per un numero o per una lista di valori di x. |
| [Valore medio in [a, b]](int.mean) | Il valore medio di f su un intervallo, e un punto c dove f vale proprio la media. |

### Applicazioni geometriche

| Blocco | Cosa fa |
|---|---|
| [Area tra due curve](int.area) | L'area tra f e g (o tra f e l'asse x), e i punti dove le curve si incontrano. |
| [Solido di rotazione](int.revolution) | Volume e superficie laterale di un solido che nasce ruotando una curva attorno all'asse x o y. |
| [Lunghezza d'arco](int.arcLength) | La lunghezza di una curva tra due estremi. |
| [Integrale doppio e triplo](int.multiple) | ∬ e ∭, anche con estremi che dipendono dalle variabili esterne. |

### Dati e segnali

| Blocco | Cosa fa |
|---|---|
| [Integrale di dati campionati](int.data) | L'integrale di una lista di numeri o di punti `{x, y}`, con trapezi o Simpson, e l'integrale progressivo. |
| [Integratore di segnale](int.signal) | Somma nel tempo un valore che arriva da un sensore, con azzeramento e limiti anti-windup. |

### Equazioni differenziali

| Blocco | Cosa fa |
|---|---|
| [Equazione differenziale](int.ode) | Risolve y′ = f(x, y) o y″ = f(x, y, y′) con Runge-Kutta o Eulero. |

## Le espressioni

Le funzioni viaggiano come **testo**, con la stessa sintassi del pacchetto [Funzioni e derivate](logicstudio-functions) (lì c'è la descrizione completa, e il blocco [Funzione f(x)](fn.define) per dare un nome a una funzione e ai suoi parametri):

- i numeri si scrivono con il **punto** (`2.5`, `1e-3`);
- gli operatori sono `+ - * / ^`; la potenza si scrive anche `**`, `²`, `³`;
- il prodotto può restare **implicito**: `3x`, `2(x+1)`, `x sin(x)`, `(x+1)(x-1)`;
- le funzioni: `sin cos tan cot sec csc`, `asin acos atan`, `sinh cosh tanh`, `asinh acosh atanh`, `exp`, `ln` (naturale), `log` (base 10, o `log(b, x)`), `log2`, `log10`, `sqrt`, `cbrt`, `root(n, x)`, `abs`, `sign`, `floor`, `ceil`, `round`, `min`, `max`, `atan2`, `pow`, `hypot`;
- le costanti sono `pi` (anche `π`) ed `e`;
- gli angoli sono sempre in **radianti**.

Ogni blocco prende la funzione dall'ingresso **f** o, se non è collegato, dall'impostazione **Funzione**. La variabile si chiama `x`; nelle Proprietà puoi darle un altro nome (**Variabile**), per esempio `t`. Un altro nome nell'espressione (per esempio `k` in `k*x`) è un **parametro senza valore**: dagli un valore con [Funzione f(x)](fn.define), oppure scrivi un numero.

## Gli estremi dell'intervallo

Gli estremi (**a**, **b**) possono arrivare da un ingresso o essere scritti nelle Proprietà. Si scrivono come:

- un **numero**: `2`, `-1.5`, anche con la virgola (`2,5`);
- un'**espressione senza variabili**: `pi/2`, `2*pi`, `sqrt(2)`, `e^2`;
- **`inf`** e **`-inf`** (anche `∞` e `-∞`), solo dove il blocco lo ammette: [Integrale definito](int.definite) e [Funzione integrale](int.function). Con gli estremi infiniti vale solo il metodo Gauss-Kronrod.

Nell'[Integrale definito](int.definite), se a è più grande di b l'integrale cambia segno. Se a e b sono uguali, l'integrale vale 0.

## Quando i blocchi calcolano

I blocchi che hanno tutti gli ingressi anche come impostazioni ([Integrale definito](int.definite), [Primitiva](int.primitive), [Valore medio](int.mean), [Area](int.area), [Solido di rotazione](int.revolution), [Lunghezza d'arco](int.arcLength), [Integrale doppio e triplo](int.multiple), [Equazione differenziale](int.ode)) **calcolano una volta all'avvio dello schema** quando nessun ingresso è collegato: basta scrivere la funzione e gli estremi nelle Proprietà. Con un ingresso collegato calcolano a ogni valore che arriva, quando hanno ricevuto tutti i valori collegati.

## I limiti

Per non bloccare il motore con uno schema troppo pesante:

| Calcolo | Limite |
|---|---|
| Ogni integrale numerico | 100000 valutazioni della funzione |
| Integrale doppio e triplo | 2000000 valutazioni |
| Equazione differenziale | 1000000 valutazioni |
| Funzione integrale con una lista | 1000 valori di x |
| Lista di dati | 10000 elementi |
| Espressione | 2000 caratteri |

Oltre il limite il blocco manda un errore (per esempio «Troppe valutazioni della funzione (più di 100000)»). Vedi anche [Limiti e quote](logicstudio-engine/limits).

## Errori

Gli errori (un'espressione scritta male, un parametro senza valore, una funzione che non ha un valore finito, una primitiva che non si trova…) escono dalla porta **Exception** del blocco, o vanno nella console principale se non è collegata. Ogni pagina elenca i messaggi esatti.

## Vedi anche

- [Funzioni e derivate](logicstudio-functions) per la sintassi completa, le derivate e la tabella dei valori ([Derivata](fn.derivative), [Tabella valori](fn.table))
- [Geometria solida](logicstudio-solid) per volumi e superfici dei solidi più comuni (per esempio [Sfera](solid.sphere))
- [Costante · Variabile](core.value) e [Print (console.log)](core.consoleWrite) per dare un valore a un blocco e vederne il risultato
- [Come funziona un blocco](ide/blocks)
