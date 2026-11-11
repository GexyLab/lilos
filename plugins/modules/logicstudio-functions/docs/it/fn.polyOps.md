# Operazioni tra polinomi

`fn.polyOps` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Le operazioni tra polinomi dati dai loro coefficienti: somma, differenza, prodotto, divisione con resto, MCD, derivata e integrale.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **p (coefficienti)** (`p`) | lista | Il primo polinomio: la lista dei coefficienti, nell'ordine scelto in **Coefficienti**. |
| **q (coefficienti)** (`q`) | lista | Il secondo polinomio, come **p**. Per **derivata** e **integrale** non serve e il blocco non lo aspetta. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | I coefficienti del risultato, nello stesso ordine di quelli in ingresso. Per la divisione è il **quoziente**. |
| **resto** (`remainder`) | lista | Il resto della divisione (solo con **p ÷ q**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **espressione** (`expression`) | testo | Il risultato scritto come testo, per esempio `x^2 - 1`. Si può collegare a **f** dei blocchi di funzioni. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | `add` p + q; `sub` p − q; `mul` p · q; `div` p ÷ q (quoziente e resto); `gcd` MCD di p e q; `derivative` derivata di p; `integral` integrale di p (costante 0) | `mul` | L'operazione da fare. |
| **Coefficienti** (`order`) | `high` Dal grado più alto ([1, -3, 2] = x² − 3x + 2); `low` Dal termine noto ([2, -3, 1] = 2 − 3x + x²) | `high` | In che ordine vengono i coefficienti, in ingresso e in uscita. |

## Come funziona

I polinomi arrivano come liste di coefficienti: con **Dal grado più alto** `[1, -3, 2]` è `x² − 3x + 2`, con **Dal termine noto** è `[2, -3, 1]`. Il risultato esce nello stesso ordine. Il blocco gira quando arriva **p** (e **q**, se l'operazione lo vuole) e aspetta finché i polinomi che servono sono arrivati. Ogni polinomio può arrivare al grado 100.

- **Somma e differenza**: coefficiente per coefficiente. Se tutto si annulla il risultato è `[0]`.
- **Prodotto**: il grado è la somma dei gradi.
- **Divisione**: divisione con resto tra polinomi; il quoziente va su **risultato** e il resto su **resto**, tali che p = quoziente · q + resto. Coefficienti piccolissimi nel resto (meno di 10⁻¹² del più grande di p) diventano 0. Dividere per il polinomio nullo è un errore.
- **MCD**: l'algoritmo di Euclide; il risultato è **monico** (il coefficiente più alto è 1). Se non hanno fattori in comune l'MCD è `[1]`.
- **Derivata**: la derivata di p (di una costante: `[0]`).
- **Integrale**: una primitiva di p con costante 0: i coefficienti sono divisi per 1, 2, 3…
- I coefficienti più alti uguali (quasi) a 0 sono tolti dal risultato.
- Il blocco non parte da solo all'avvio.

## Esempi

### 1. Un prodotto

Operazione **p · q**, **p** = `[1, 1]` (x + 1), **q** = `[1, -1]` (x − 1): **risultato** è `[1,0,-1]`, **espressione** è `x^2 - 1`.

### 2. Una divisione

Operazione **p ÷ q**, **p** = `[1, 2, 3]` (x² + 2x + 3), **q** = `[1, 1]` (x + 1): **risultato** (quoziente) è `[1,1]` e **resto** è `[2]`: x² + 2x + 3 = (x + 1)(x + 1) + 2. Con **p** = `[1, 0, -1]` e lo stesso **q** il resto è `[0]` e il quoziente `[1,-1]`.

### 3. Il massimo comun divisore

Operazione **MCD**, **p** = `[1, -3, 2]` (x² − 3x + 2) e **q** = `[1, -1]` (x − 1): **risultato** è `[1,-1]`, cioè x − 1.

### 4. Derivata e integrale

Operazione **derivata**, **p** = `[1, 0, -3, 5]`: **risultato** `[3,0,-3]`, **espressione** `3x^2 - 3`. Operazione **integrale**, **p** = `[3, 2, 1]`: **risultato** `[1,1,1,0]`, **espressione** `x^3 + x^2 + x`.

### 5. Una somma

Operazione **p + q**, **p** = `[1, 2, 3]`, **q** = `[1, 1]`: **risultato** `[1,3,4]`, **espressione** `x^2 + 3x + 4`. Con **p − p** il risultato è `[0]`.

## Errori

| Messaggio | Quando |
|---|---|
| La lista dei coefficienti di p deve essere una lista | Su **p** (o su **q**: il messaggio dice «di q») arriva un valore che non è una lista. |
| La lista dei coefficienti di p ha più di 10000 elementi | La lista è troppo lunga. |
| La lista dei coefficienti di p è vuota | La lista non ha elementi. |
| Al massimo il grado 100 | Una lista ha più di 101 coefficienti. |
| coefficienti di p, elemento N: serve un numero | L'elemento numero N della lista non è un numero. |
| Divisione per il polinomio nullo | Operazione **p ÷ q** con **q** = `[0]`. |

## Vedi anche

- [Polinomio: valore e radici](fn.poly) per il valore e le radici
- [Derivata (simbolica)](fn.derivative) per derivare una funzione scritta come espressione
- [Primitiva (integrale indefinito)](int.primitive) per la primitiva di una funzione scritta come espressione
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
