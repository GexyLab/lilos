# Polinomio: valore e radici

`fn.poly` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Un polinomio dato dai suoi coefficienti: ne calcola il valore in uno o più punti e ne trova **tutte le radici**, anche complesse.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **coefficienti** (`coefficients`) | lista | I coefficienti, in una lista di numeri, nell'ordine scelto in **Coefficienti**. Al massimo 101 (grado 100). |
| **x (numero o lista)** (`x`) | qualsiasi | Il punto, o una lista di punti, in cui calcolare il polinomio. Facoltativo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **p(x)** (`value`) | qualsiasi | Il valore p(x): un numero, o una lista se **x** è una lista. |
| **radici {re, im}** (`roots`) | lista | Tutte le radici, una per ogni grado (quelle doppie due volte), come lista di `{re, im}`, in ordine di parte reale. |
| **radici reali** (`real`) | lista | Le radici reali, senza ripetizioni, in ordine crescente. |
| **grado** (`degree`) | numero | Il grado del polinomio. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **espressione** (`expression`) | testo | Il polinomio scritto come testo, per esempio `x^3 - 6x^2 + 11x - 6`. Si può collegare a **f** dei blocchi di funzioni. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **coefficienti della derivata** (`derivative`) | lista | I coefficienti della derivata, nello stesso ordine di quelli in ingresso. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Coefficienti** (`order`) | `high` Dal grado più alto ([1, -3, 2] = x² − 3x + 2); `low` Dal termine noto ([2, -3, 1] = 2 − 3x + x²) | `high` | In che ordine vengono i coefficienti della lista. |

## Come funziona

I coefficienti arrivano in una lista di numeri. Con l'ordine **Dal grado più alto** la lista `[1, -3, 2]` è `x² − 3x + 2`; con **Dal termine noto** la lista `[2, -3, 1]` è lo stesso polinomio. I coefficienti più alti uguali a 0 (`[0, 1, 2]` dal grado più alto) vengono tolti.

- **Il valore** si calcola con il metodo di Horner e si arrotonda a 15 cifre significative.
- **Le radici**: per il grado 1 e 2 si usa la formula chiusa; dal grado 3 il metodo di **Aberth–Ehrlich**, che trova tutte le radici insieme, anche complesse, partendo da punti sparsi su una circonferenza. Parti reali o immaginarie molto piccole (sotto 10⁻¹³, 10⁻¹⁰ in proporzione) diventano 0. Le radici multiple si trovano ma con meno precisione.
- Un polinomio costante (`[5]`) non ha radici: **radici** e **radici reali** sono liste vuote. Il polinomio nullo (`[0]`) ha infinite radici: errore.
- Se arriva solo un nuovo **x**, il blocco ricalcola solo **p(x)**; se arrivano i coefficienti, ricalcola tutto.
- Il blocco non parte da solo all'avvio.

## Esempi

### 1. Un polinomio di grado 3

`x³ − 6x² + 11x − 6`, lista `[1, -6, 11, -6]` (dal grado più alto), **x** = 2:

```
[Costante · Variabile (lista): 1, -6, 11, -6] valore ──▶ coefficienti [Polinomio: valore e radici] radici reali ──▶ valore [Print (console.log)]
```

Scrive `[1,2,3]`. Sulle altre uscite: **p(x)** = 0, **grado** = 3, **espressione** = `x^3 - 6x^2 + 11x - 6`, **coefficienti della derivata** = `[3,-12,11]`.

### 2. Una lista di punti

Stesso polinomio, **x** = `[0, 1, 4]`: **p(x)** è `[-6,0,6]`.

### 3. Radici complesse

`x² + 1`, lista `[1, 0, 1]`: **radici {re, im}** è `[{"re":0,"im":-1},{"re":0,"im":1}]` e **radici reali** è `[]`.

### 4. Dal termine noto

Ordine **Dal termine noto**, lista `[2, -3, 1]`: **espressione** è `x^2 - 3x + 2`, **radici reali** è `[1,2]`, **coefficienti della derivata** è `[-3,2]`.

### 5. Grado 4

`x⁴ − 1`, lista `[1, 0, 0, 0, -1]`: **radici reali** è `[-1,1]` e le quattro radici sono −1, −i, i, 1.

## Errori

| Messaggio | Quando |
|---|---|
| La lista dei coefficienti deve essere una lista | Su **coefficienti** arriva un valore che non è una lista. |
| La lista dei coefficienti ha più di 10000 elementi | La lista è troppo lunga (e comunque il limite è il grado 100). |
| La lista dei coefficienti è vuota | La lista non ha elementi. |
| Al massimo il grado 100 | La lista ha più di 101 coefficienti. |
| coefficienti, elemento N: serve un numero | L'elemento numero N della lista non è un numero. |
| Il polinomio nullo ha infinite radici | Tutti i coefficienti sono 0. |
| x: serve un numero | **x** (o un suo elemento) non è un numero. |
| La lista delle x ha più di 10000 elementi | La lista di punti è troppo lunga. |

## Vedi anche

- [Operazioni tra polinomi](fn.polyOps) per somma, prodotto, divisione, MCD, derivata e integrale
- [Equazione di 2° grado](fn.quadratic) per il grado 2
- [Risolvi f(x) = 0](fn.solve) per qualsiasi funzione
- [Lista [ ]](core.list) per scrivere la lista dei coefficienti
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
