# Calcola f(x)

`fn.eval` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Calcola il valore di una funzione in un punto, o in una lista di punti: da `x^2 + 1` e x = 3 ottiene 10.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo (`x^2 + 1`). Se non è collegato vale l'impostazione **Funzione**. |
| **x (numero o lista)** (`x`) | qualsiasi | Il punto: un numero (anche come testo, `"2,5"`) oppure una lista di numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **f(x)** (`y`) | qualsiasi | Il valore f(x), arrotondato a 15 cifre significative. Con una lista di punti è la lista dei valori, nello stesso ordine. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Porte aggiuntive

Per le funzioni con più variabili (`a x + b`) aggiungi un ingresso per ogni variabile in più, fino a 8, di tipo numero, nelle **Proprietà**, sezione **Porte**. Nascono con il nome **altra variabile 1**… (in un IDE in inglese **other variable 1**…): **rinominali** con il nome che la variabile ha nella funzione (**a**, **b**). Il blocco aspetta finché tutti hanno un valore. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo (fino a 2000 caratteri) | `x^2` | La funzione, quando **f** non è collegato. |
| **Variabile** (`variable`) | un testo | `x` | Il nome della variabile, quella che prende il valore di **x**. |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni».

La variabile è **x**, oppure il nome scelto in **Variabile** (lettere, cifre e `_`, con eventuali apostrofi alla fine; non può essere `pi` né `e`).

Quando arriva un valore su **x** (o un nuovo **f**) il blocco calcola la funzione. Le funzioni trigonometriche vogliono gli angoli **in radianti**: per un angolo in gradi passa prima dal blocco [Angolo](unit.angle) del pacchetto [Grandezze e unità](logicstudio-units).

- **Un numero**: se il risultato non è un numero finito (`1/x` in 0, `sqrt(x)` in −4, `ln(x)` in 0) il blocco dà errore.
- **Una lista** (fino a 10000 elementi): ogni elemento è calcolato; dove la funzione non ha un valore finito nella lista c'è `null` e il blocco **non** dà errore.
- Gli altri nomi della funzione sono variabili: ognuna ha un ingresso aggiunto con lo stesso nome. Un nome senza ingresso è un parametro senza valore (errore). Per dare un valore a un parametro si può anche usare [Funzione f(x)](fn.define) prima di questo blocco.
- Il blocco non parte da solo all'avvio: serve un valore su **x**.

## Esempi

### 1. Un valore

```
[Costante · Variabile: 3] valore ──▶ x [Calcola f(x): x^2 + 1] f(x) ──▶ valore [Print (console.log)]
```

Scrive `10`.

### 2. Una lista di punti

Stessa funzione, con la lista `[0, 1, 2, 3]` su **x**: esce `[1,2,5,10]`.

### 3. Dove la funzione non esiste

Funzione `1/x`. Con **x** = 0 il blocco dà errore («La funzione non ha un valore finito in x = 0»); con la lista `[0, 2, 4]` esce `[null,0.5,0.25]`.

### 4. Due variabili

Funzione `a x + b`, ingressi aggiunti **a** = 3 e **b** = 4, **x** = 2: scrive `10`.

### 5. Radianti

Funzione `sin(pi x)` con **x** = 1: scrive `1.22464679914735e-16`, cioè zero con il piccolo errore del computer: il seno di π radianti è 0.

## Errori

| Messaggio | Quando |
|---|---|
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il blocco si è fermato e «…» dice perché (vedi la pagina [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| f deve essere un'espressione di testo, come «x^2 + 1» | Su **f** arriva qualcosa che non è un testo né un numero (una lista, un oggetto). |
| Nome di variabile non valido: «…» | Il nome in **Variabile** non va bene (deve cominciare con una lettera o `_`). |
| «…» è una costante, non può essere la variabile | **Variabile** è `pi` o `e`. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | La funzione contiene un nome che non è la variabile e non ha un valore. Con più nomi il messaggio dice «Parametri senza valore», e con più variabili finisce con «le variabili sono x, y». |
| La funzione non ha un valore finito in … = … | La funzione dà un valore infinito o non numerico (divisione per zero, radice di un numero negativo, logaritmo di zero…). |
| … : serve un numero | Il valore di **x** (o di un elemento della lista, o di un'altra variabile) non è un numero. Il messaggio comincia con il nome della variabile. |
| La lista delle x ha più di 10000 elementi | La lista in ingresso è troppo lunga. |

## Vedi anche

- [Tabella valori](fn.table) per calcolare la funzione su tanti punti vicini
- [Funzione f(x)](fn.define) per dare un valore ai parametri
- [Derivata in un punto f'(x)](fn.derivativeAt) per la derivata nello stesso punto
- [Costante · Variabile](core.value) per dare un valore a **x**
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
