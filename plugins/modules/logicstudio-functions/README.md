# logicstudio-functions

I blocchi di Logic Studio per le **funzioni** e il **calcolo differenziale**.

Una funzione viaggia come testo: un'espressione come `3x^2 + 2sin(x) - ln(x)`, con la moltiplicazione implicita (`3x`, `2(x+1)`), le funzioni sin, cos, tan…, ln, log, sqrt, abs… e le costanti `pi` ed `e`. Ogni blocco la prende dall'ingresso **f** o, se non è collegato, dall'impostazione **Funzione**.

- **Funzioni**: Funzione f(x) (con i parametri come porte aggiunte), Calcola f(x), Tabella valori, Risolvi f(x) = 0 (Brent o Newton).
- **Algebriche**: Equazione di 2° grado, Polinomio (valore e radici, anche complesse), Operazioni tra polinomi (somma, prodotto, divisione con resto, MCD, derivata, integrale), Potenze e radici.
- **Esponenziali e logaritmi**: Esponenziali, Logaritmi (in qualsiasi base), Crescita e decadimento esponenziale.
- **Calcolo differenziale**: Derivata (simbolica, fino al 10° ordine), Derivata in un punto, Retta tangente, Limite (numerico), Polinomio di Taylor, Studio di funzione (zeri, massimi, minimi, flessi, crescenza), Derivata di un segnale (velocità di variazione nel tempo).

Il codice delle espressioni (un parser nostro, senza `eval` e senza librerie) è in `lib/shared/mathexpr.js`, copia di `modules/_shared/mathexpr.js`.

Gli errori (un'espressione scritta male, un parametro senza valore, il logaritmo di un numero negativo…) escono dalla porta «Exception» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine`.
