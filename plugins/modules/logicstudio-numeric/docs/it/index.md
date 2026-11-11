# Analisi numerica

`logicstudio-numeric` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per i **calcoli numerici** che gli altri pacchetti di matematica non hanno: campionare una funzione, comporla, semplificarla, il gradiente, massimi e minimi; le successioni, le serie e la simulazione nel tempo di un'equazione differenziale; la derivata, l'interpolazione e la regressione di dati misurati; i numeri complessi.

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-numeric` («Logic Studio: i blocchi per l'analisi numerica…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Analisi numerica**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

### Una funzione scritta come formula

| Blocco | Cosa fa |
|---|---|
| [Campiona f](num.sample) | Calcola la funzione su tanti punti tra due estremi: le liste x e y e i punti per un grafico. |
| [Componi f∘g](num.compose) | Mette una funzione dentro un'altra: `f(g(x))`. |
| [Semplifica](num.simplify) | Scrive la funzione in modo più semplice, o la sviluppa come polinomio. |
| [Gradiente ∇f](num.gradient) | Il gradiente di una funzione di più variabili in un punto. |
| [Massimi · Minimi · Flessi](num.extrema) | Massimi, minimi e flessi in un intervallo, e il punto più alto e più basso. |

### Successioni, serie ed equazioni differenziali

| Blocco | Cosa fa |
|---|---|
| [Successione aₙ](num.sequence) | I termini di una successione, esplicita o per ricorrenza (Fibonacci). |
| [Serie Σ · Produttoria Π](num.series) | Somma Σ o produttoria Π, anche infinita, con il giudizio sulla convergenza. |
| [Simula nel tempo](num.simulate) | Un'equazione differenziale (o un sistema) che scorre nel tempo, mentre lo schema gira. |

### Dati misurati e numeri complessi

| Blocco | Cosa fa |
|---|---|
| [Derivata di dati](num.dataDerivative) | La pendenza `dy/dx` di una lista di dati, anche con le x irregolari. |
| [Interpolazione](num.interpolate) | La curva che passa per i punti (lineare, Lagrange, spline) e il suo valore in mezzo. |
| [Regressione (fit)](num.fit) | La curva che meglio approssima i dati (retta, polinomio, esponenziale, logaritmo, potenza), con R². |
| [Numeri complessi](num.complex) | I conti con i numeri complessi, anche in forma polare. |

I blocchi che partono da soli all'avvio dello schema, quando niente è collegato ai loro ingressi, sono quelli che calcolano con le impostazioni: **Campiona f**, **Componi f∘g**, **Semplifica**, **Gradiente ∇f**, **Massimi · Minimi · Flessi**, **Successione aₙ**, **Serie Σ · Produttoria Π** e **Numeri complessi**. **Derivata di dati**, **Interpolazione** e **Regressione** aspettano i dati; **Simula nel tempo** parte con l'impulso **avvia** (o da sola, se lo si sceglie).

## Le formule

Una funzione viaggia come **testo**, con la stessa sintassi dei blocchi di [Funzioni e derivate](logicstudio-functions): un'espressione come `3x^2 + 2sin(x) - ln(x)`, con il prodotto implicito (`3x`), le costanti `pi` ed `e`, gli angoli in **radianti** e le funzioni `sin`, `cos`, `exp`, `ln`, `log`, `sqrt`… La sintassi completa, le funzioni e gli errori sono spiegati nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni»: vale tale e quale qui.

Ogni blocco con una funzione la prende dall'ingresso **f** o, se **f** non è collegato, dall'impostazione **Funzione**; la variabile è `x` (o il nome scelto in **Variabile**). Un altro nome nella funzione è un **parametro** e ha bisogno di un valore, che si dà con il blocco [Funzione f(x)](fn.define). Fanno eccezione [Componi f∘g](num.compose) e [Semplifica](num.simplify), che lavorano sul testo e lasciano i parametri dove sono, e [Gradiente ∇f](num.gradient), che ha più variabili (impostazione **Variabili**).

Tutti i cicli di calcolo sono limitati (punti, termini, passi e al massimo 8 secondi): un blocco non occupa mai a lungo il programma. Gli errori escono dalla porta **Exception** del blocco.

## Dove sono gli altri blocchi

Questo pacchetto ha solo quello che gli altri non hanno. Il resto della matematica con le formule è in:

| Cosa | Dove |
|---|---|
| Valore di una funzione, tabella di valori, risolvere `f(x) = 0`, polinomi | [Funzione f(x)](fn.define), [Calcola f(x)](fn.eval), [Tabella valori](fn.table), [Risolvi f(x) = 0](fn.solve), [Polinomio](fn.poly), [Operazioni tra polinomi](fn.polyOps) |
| Derivata (simbolica e in un punto), retta tangente, limite, polinomio di Taylor, studio di funzione, derivata di un segnale | [Derivata (simbolica)](fn.derivative), [Derivata in un punto](fn.derivativeAt), [Retta tangente](fn.tangent), [Limite](fn.limit), [Polinomio di Taylor](fn.taylor), [Studio di funzione](fn.study), [Derivata di un segnale](fn.signalDerivative) |
| Integrale definito e indefinito, integrale di dati e di un segnale, equazione differenziale risolta in un colpo solo | [Integrale definito](int.definite), [Primitiva](int.primitive), [Integrale di dati](int.data), [Integrale di un segnale](int.signal), [Equazione differenziale](int.ode) |
| Trasformata di Fourier e tutto il resto dei segnali | [FFT](sig.fft) e gli altri blocchi di [Segnali](logicstudio-signals) |

## Vedi anche

- [Funzioni e derivate](logicstudio-functions)
- [Integrali](logicstudio-integrals)
- [Segnali](logicstudio-signals)
- [Come funziona un blocco](ide/blocks)
