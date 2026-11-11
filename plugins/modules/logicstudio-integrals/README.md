# logicstudio-integrals

I blocchi di Logic Studio per gli **integrali**.

Le funzioni sono espressioni di testo come in `logicstudio-functions` (`x e^x`, `1/(1+x^2)`…); gli estremi possono essere numeri, espressioni come `pi/2`, o `inf` e `-inf` dove il blocco lo ammette.

- **Integrale definito**: Gauss-Kronrod adattivo, Simpson adattivo, Romberg, trapezi, rettangoli; anche con estremi infiniti (integrali impropri).
- **Primitiva**: simbolica, per una tabella di forme (polinomi, potenze, esponenziali, funzioni trigonometriche e iperboliche, logaritmi, arcotangente e arcoseno, per parti e per sostituzione); ogni risultato viene controllato derivandolo. Se la forma non c'è, esce un'Exception invece di un risultato sbagliato.
- **Funzione integrale**, **Valore medio**, **Area tra due curve**, **Solido di rotazione** (volume e superficie, attorno all'asse x o y), **Lunghezza d'arco**, **Integrale doppio e triplo** (anche con estremi che dipendono dalle variabili esterne).
- **Dati e segnali**: Integrale di dati campionati (trapezi o Simpson, con l'integrale progressivo), Integratore di segnale (nel tempo, con limiti anti-windup).
- **Equazione differenziale**: y′ = f(x, y) e y″ = f(x, y, y′), con Runge-Kutta 4(5) adattivo, Runge-Kutta 4 o Eulero.

Ogni integrale numerico si ferma dopo 100000 valutazioni della funzione (2000000 per i doppi e tripli, 1000000 per le equazioni differenziali), così uno schema non blocca il motore.

Il codice delle espressioni è in `lib/shared/mathexpr.js`, copia di `modules/_shared/mathexpr.js`.

Gli errori escono dalla porta «Exception» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine`.
