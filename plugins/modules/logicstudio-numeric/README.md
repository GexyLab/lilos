# logicstudio-numeric

I blocchi di Logic Studio per l'**analisi numerica** (categoria «Analisi numerica», tipi `num.*`). Hanno solo quello che gli altri pacchetti di matematica non hanno:

- **Una funzione scritta come formula**: Campiona f (liste x, y e punti per i grafici), Componi f∘g, Semplifica (anche come polinomio sviluppato), Gradiente ∇f, Massimi · Minimi · Flessi.
- **Successioni, serie ed equazioni differenziali**: Successione aₙ (anche per ricorrenza), Serie Σ · Produttoria Π (anche infinita, con il giudizio sulla convergenza), Simula nel tempo (un'equazione differenziale o un sistema che scorre in tempo reale con Eulero o RK4).
- **Dati misurati e numeri complessi**: Derivata di dati, Interpolazione (lineare, Lagrange, spline cubica naturale), Regressione (retta, polinomio, esponenziale, logaritmo, potenza, con R²), Numeri complessi.

Le formule sono testi con la **stessa sintassi dei blocchi `fn.*`** di `logicstudio-functions`: le legge il lettore di espressioni nostro (`lib/shared/mathexpr.js`, copia di `modules/_shared/mathexpr.js` con `lib/shared/mathblocks.js`; niente `eval`, nessuna libreria, gli angoli in radianti). Ogni blocco prende la funzione dall'ingresso **f** o, se **f** non è collegato, dall'impostazione **Funzione**; la variabile è `x` (o quella scelta in **Variabile**) e un altro nome è un parametro, a cui si dà un valore con il blocco `fn.define`. Ogni ciclo numerico è limitato (punti, termini, passi, 8 secondi). I punti dei blocchi sono liste `[x, y, …]` oppure oggetti `{x, y, …}`, come nei blocchi `fn.*` e `solid.*`. Il pacchetto non ha dipendenze npm.

Il resto della matematica è altrove:

- **Funzioni e derivate** (`logicstudio-functions`, `fn.*`): valore, tabella, zeri, polinomi, derivata (simbolica e in un punto), retta tangente, limite, Taylor, studio di funzione, derivata di un segnale.
- **Integrali** (`logicstudio-integrals`, `int.*`): integrale definito e indefinito, di dati e di un segnale, equazione differenziale risolta in un colpo solo.
- **Segnali** (`logicstudio-signals`, `sig.*`): FFT e tutto il resto dei segnali.


Gli errori (funzione non valida, punto non definito, calcolo troppo lungo…) escono dalla porta «Exception» del blocco, o vanno nella console principale se non è collegata.

Documentazione (italiano e inglese) in `docs/`, mostrata nell'IDE. Richiede il motore `logicstudio-engine`.
