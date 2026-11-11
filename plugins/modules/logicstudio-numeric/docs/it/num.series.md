# Serie Σ · Produttoria Π

`num.series` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Calcola una **somma** Σ o una **produttoria** Π dei termini `f(n)`, per n da un inizio a una fine, anche **infinita**: dice se la serie converge e, se sì, a quanto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo (per esempio `x^2 + sin(x)`). Se non è collegato vale l'impostazione **Funzione**. |
| **da n** (`from`) | numero | Il primo n. Se non è collegato vale l'impostazione **Da n**. |
| **a n** (`to`) | numero | L'ultimo n. Se non è collegato vale l'impostazione **A n**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore della somma o del prodotto. Non esce se la serie non converge. |
| **converge** (`converges`) | sì/no | `true` se la serie converge (o se è finita), `false` se diverge; per una serie che si ferma al limite dei termini può non esserci (vuoto). |
| **somme parziali** (`partial`) | lista | Le somme (o i prodotti) parziali, al massimo quante dice **Somme parziali tenute**, per vedere come ci si avvicina al valore. |
| **termini usati** (`terms`) | numero | Quanti termini sono stati usati. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo | `1/n^2` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `n` | Il nome dell'indice (di serie `n`). |
| **Operazione** (`kind`) | Somma Σ / Produttoria Π | Somma Σ | **Somma Σ** somma i termini; **Produttoria Π** li moltiplica. |
| **Da n (se non è collegato)** (`from`) | un testo (numero o espressione) | `1` | Il primo n, quando **da n** non è collegato (numero o espressione). |
| **A n, anche inf (se non è collegato)** (`to`) | un testo (numero, espressione o `inf`) | `inf` | L'ultimo n, quando **a n** non è collegato: un numero oppure `inf` per una serie infinita. |
| **Termini al massimo** (`maxTerms`) | numero (da 10 a 2000000) | `100000` | Quanti termini al massimo calcolare per una serie infinita (da 10 a 2000000). |
| **Somme parziali tenute** (`keep`) | numero (da 2 a 5000) | `200` | Quante somme parziali tenere in **somme parziali** (da 2 a 5000). |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni». Gli angoli sono in radianti. La variabile è **x**, oppure il nome scelto in **Variabile**; un altro nome nella funzione è un parametro e ha bisogno di un valore (si dà con il blocco [Funzione f(x)](fn.define)). Qui la variabile di serie è **n**.

Se **nessun** ingresso è collegato, il blocco calcola **una volta all'avvio dello schema** con le impostazioni. Se uno o più ingressi sono collegati, aspetta che abbiano tutti un valore e poi calcola a ogni nuovo valore.

- Se **A n** è un numero, la somma (o il prodotto) è finita e il valore è esatto; **converge** è `true`.
- Se **A n** è `inf`, il blocco somma termini finché diventano trascurabili, o fino a **Termini al massimo**. Poi giudica: se i termini non tendono a zero la serie **diverge**; se sono alternati e decrescenti **converge** e al valore si toglie metà dell'ultimo termine; se decrescono come `C/n^p` con p maggiore di 1 **converge** e si aggiunge una stima della coda, altrimenti (la serie armonica `1/n`) **diverge**.
- È un calcolo numerico: la somma di `1/n^2` dà 1.64493406689824 invece di π²/6 = 1.6449340668482264 (errore sotto uno su un miliardo).
- Per la **produttoria** si giudica la serie di `f(n) − 1`.

## Esempi

### 1. Il problema di Basilea

Funzione `1/n^2`, da 1 a `inf` (i valori di serie):

```
[Serie Σ · Produttoria Π: 1/n^2, 1 → inf] valore ──▶ valore [Print (console.log)]
```

Scrive 1.64493406689824, cioè π²/6; **converge** è `true`.

### 2. La serie armonica

Funzione `1/n`, da 1 a `inf`:

```
[Serie Σ · Produttoria Π: 1/n, 1 → inf] converge ──▶ valore [Print (console.log)]
```

Scrive `false`: la serie diverge e **valore** non esce.

### 3. Una somma finita e un fattoriale

`n` da 1 a 100 fa 5050; con **Produttoria Π**, `n` da 1 a 5 fa 120:

```
[Serie Σ · Produttoria Π: n, 1 → 100] valore ──▶ valore [Print (console.log)]
```

Scrive `5050`.

## Errori

| Messaggio | Quando |
|---|---|
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il lettore si è fermato e «…» dice perché (vedi [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| f deve essere un'espressione di testo, come «x^2 + 1» | Su **f** arriva qualcosa che non è un testo né un numero (una lista, un oggetto). |
| Nome di variabile non valido: «…» | Il nome in **Variabile** non va bene (deve cominciare con una lettera o `_`; non può essere il nome di una funzione). |
| «…» è una costante, non può essere la variabile | **Variabile** è `pi` o `e`. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | La funzione contiene un nome che non è la variabile e non ha un valore. Con più nomi il messaggio dice «Parametri senza valore». |
| n iniziale: serve un numero | Il valore **n iniziale** è vuoto o non è un numero. |
| n iniziale: serve un numero (o un'espressione come pi/2), non «…» | Il valore **n iniziale** è un testo che non è un numero né un'espressione di numeri (per esempio `abc`). |
| n finale: serve un numero | Il valore **n finale** è vuoto o non è un numero. |
| n finale: serve un numero (o un'espressione come pi/2), non «…» | Il valore **n finale** è un testo che non è un numero né un'espressione di numeri (per esempio `abc`). |
| n finale è minore di n iniziale | La fine è prima dell'inizio. |
| Il termine non è un numero finito per n = … | In una somma o produttoria finita un termine non è un numero (per esempio `log(n-5)` per n = 1). |
| Termini al massimo: da 10 a 2000000 | L'impostazione **Termini al massimo** è fuori dai limiti. |
| Somme parziali tenute: da 2 a 5000 | L'impostazione **Somme parziali tenute** è fuori dai limiti. |
| Calcolo troppo lungo (più di 8 secondi): riduci i punti o l'intervallo | Il calcolo supera gli 8 secondi: il blocco si ferma per non occupare il programma. |

## Vedi anche

- [Successione aₙ](num.sequence) per vedere i termini
- [Integrale definito ∫ₐᵇ f(x) dx](int.definite) per l'integrale invece della somma
- [Polinomio di Taylor](fn.taylor) per approssimare una funzione con un polinomio
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
