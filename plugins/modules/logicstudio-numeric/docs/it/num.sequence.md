# Successione aₙ

`num.sequence` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Calcola i termini di una **successione** aₙ da n iniziale a n finale: in forma esplicita (`aₙ = f(n)`, come `1/n^2`) o ricorsiva (`aₙ = f(n, a, b)` con `a = aₙ₋₁` e `b = aₙ₋₂`, come Fibonacci).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo (per esempio `x^2 + sin(x)`). Se non è collegato vale l'impostazione **Funzione**. |
| **da n** (`from`) | numero | Il primo n. Se non è collegato vale l'impostazione **Da n**. |
| **a n** (`to`) | numero | L'ultimo n. Se non è collegato vale l'impostazione **A n**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **termini** (`terms`) | lista | I termini, in una lista (`null` dove la formula non dà un numero finito). |
| **lista delle n** (`n`) | lista | I valori di n, in una lista. |
| **punti {x, y}** (`points`) | lista | I punti `{x, y}` con x = n e y = aₙ, per un grafico. |
| **ultimo termine** (`last`) | numero | L'ultimo termine. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo | `1/n^2` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `n` | Il nome dell'indice (di serie `n`). |
| **Tipo** (`mode`) | Esplicita: aₙ = f(n) / Ricorsiva: aₙ = f(n, a, b), a = aₙ₋₁, b = aₙ₋₂ | Esplicita: aₙ = f(n) | **Esplicita** calcola `f(n)` per ogni n. **Ricorsiva** parte dal primo termine e calcola ogni termine dai due precedenti. |
| **Primo termine (ricorsiva)** (`first`) | un testo (un numero) | `1` | Il primo termine (solo ricorsiva): un numero. |
| **Secondo termine (ricorsiva, facoltativo)** (`second`) | un testo (un numero, o vuoto) | vuoto | Il secondo termine (solo ricorsiva). Se è vuoto, il secondo si calcola con la formula, con `b = 0`. |
| **Da n (se non è collegato)** (`from`) | numero | `1` | Il primo n, quando **da n** non è collegato. |
| **A n (se non è collegato)** (`to`) | numero | `10` | L'ultimo n, quando **a n** non è collegato. |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni». Gli angoli sono in radianti. La variabile è **x**, oppure il nome scelto in **Variabile**; un altro nome nella funzione è un parametro e ha bisogno di un valore (si dà con il blocco [Funzione f(x)](fn.define)). Qui la variabile di serie è **n**.

Se **nessun** ingresso è collegato, il blocco calcola **una volta all'avvio dello schema** con le impostazioni. Se uno o più ingressi sono collegati, aspetta che abbiano tutti un valore e poi calcola a ogni nuovo valore.

- **Esplicita**: ogni termine è `f(n)`, per n da **Da n** a **A n** (numeri interi: i decimali sono arrotondati).
- **Ricorsiva**: la formula usa `n`, `a` (il termine precedente) e `b` (quello ancora prima). Il primo termine è **Primo termine**; il secondo è **Secondo termine** se c'è, altrimenti è calcolato con `b = 0`.
- Al massimo 100000 termini.

## Esempi

### 1. I reciproci dei quadrati

Funzione `1/n^2`, da 1 a 4:

```
[Successione aₙ: 1/n^2, 1 → 4] termini ──▶ valore [Print (console.log)]
```

Scrive `[1,0.25,0.111111111111111,0.0625]`.

### 2. Fibonacci

Ricorsiva, funzione `a + b`, primo e secondo termine 1, da 1 a 10:

```
[Successione aₙ: a + b, ricorsiva, 1, 1, 1 → 10] termini ──▶ valore [Print (console.log)]
```

Scrive `[1,1,2,3,5,8,13,21,34,55]`.

### 3. Le potenze di 2

Ricorsiva, funzione `2a`, primo termine 1, da 0 a 5:

```
[Successione aₙ: 2a, ricorsiva, 1, 0 → 5] termini ──▶ valore [Print (console.log)]
```

Scrive `[1,2,4,8,16,32]`.

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
| n finale: serve un numero | Il valore **n finale** è vuoto o non è un numero. |
| n finale è minore di n iniziale | La fine è prima dell'inizio. |
| Troppi termini (più di 100000) | La successione ha più di 100000 termini. |
| La variabile non può chiamarsi a né b: sono i due termini precedenti | Nella forma ricorsiva la variabile ha il nome di uno dei due termini. |
| Primo termine: serve un numero | Il valore **Primo termine** è vuoto o non è un numero. |
| Secondo termine: serve un numero | Il valore **Secondo termine** è vuoto o non è un numero. |
| Calcolo troppo lungo (più di 8 secondi): riduci i punti o l'intervallo | Il calcolo supera gli 8 secondi: il blocco si ferma per non occupare il programma. |

## Vedi anche

- [Serie Σ · Produttoria Π](num.series) per sommare i termini
- [Campiona f](num.sample) per una funzione di una variabile reale
- [Tabella valori](fn.table) per una tabella di valori di una funzione
- [Dispersione](charts.scatter) per disegnare i termini
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
