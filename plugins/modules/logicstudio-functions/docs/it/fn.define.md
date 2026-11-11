# Funzione f(x)

`fn.define` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Prepara una funzione per gli altri blocchi: dà un valore ai suoi **parametri** e manda la funzione semplificata, come testo, su **f**. Per esempio `a x^2 + b` con a = 3 e b = 1 diventa `3x^2 + 1`.

## Ingressi

Il blocco nasce **senza ingressi**: i parametri sono gli ingressi aggiunti (vedi **Porte aggiuntive**).

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, con i parametri sostituiti e semplificata, scritta come testo (per esempio `3x^2 + 1`). Si collega all'ingresso **f** degli altri blocchi di questo pacchetto. |
| **nomi rimasti** (`names`) | lista | La lista (in ordine alfabetico) dei nomi che restano nella funzione: la variabile e i parametri senza valore. Per `e^(-k t)` con **k** = 0,5 è `["t"]`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** aggiungi un ingresso per ogni parametro, fino a 16, di tipo numero. Nascono con il nome **parametro 1**, **parametro 2**… (in un IDE in inglese **parameter 1**…): **rinominali** con il nome che il parametro ha nella funzione, per esempio `a` e `b`. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`expr`) | un testo (fino a 2000 caratteri) | `x^2` | La funzione, con i parametri scritti per nome: `a x^2 + b`. |

## Come funziona

Ogni volta che arriva un valore su un parametro, il blocco:

1. legge la funzione dall'impostazione **Funzione**;
2. sostituisce ogni nome che ha un ingresso aggiunto con il valore dell'ingresso;
3. **semplifica** il risultato e lo scrive come testo su **f**.

La semplificazione fa i conti che si possono fare, mette in ordine i termini e scrive le frazioni come frazioni: `x^2/2 + x/3` resta così, `2(x+1)` diventa `2x + 2`.

- Un parametro **collegato ma senza valore** (non è ancora arrivato niente) fa **aspettare** il blocco.
- Un ingresso aggiunto **non collegato e senza valore iniziale** non viene sostituito: il suo nome resta nella funzione (e in **nomi rimasti**). Un blocco a valle che riceve `2x^2 + b` si ferma con «Parametro senza valore: b» finché **b** non ha un valore.
- Puoi dare un valore anche alla variabile: con un ingresso aggiunto chiamato `x` uguale a 2, `x^2 + 1` diventa `5`.
- Il valore può essere un numero o un testo con un numero (`"2,5"` o `"2.5"`).
- Se **nessun ingresso è collegato**, il blocco gira **una volta all'avvio dello schema** e manda la funzione scritta in **Funzione** (semplificata).
- Il blocco serve solo per i parametri: una funzione senza parametri si può scrivere direttamente nell'impostazione **Funzione** degli altri blocchi.

## Esempi

### 1. Una parabola con due parametri

Funzione `a x^2 + b`, ingressi aggiunti **a** e **b**:

```
[Costante · Variabile: 3] valore ──▶ a [Funzione f(x): a x^2 + b] f ──▶ valore [Print (console.log)]
[Costante · Variabile: 1] valore ──▶ b
```

Scrive `3x^2 + 1`.

### 2. Una funzione per volta

Collega **f** al blocco [Calcola f(x)](fn.eval) e dagli **x** = 2:

```
[Funzione f(x): a x^2 + b] f ──▶ f [Calcola f(x)] f(x) ──▶ valore [Print (console.log)]
```

Con **a** = 3 e **b** = 1 scrive `13`.

### 3. Un parametro che resta

Funzione `e^(-k t)`, ingresso aggiunto **k** = 0,5: su **f** esce `e^(-t/2)` e **nomi rimasti** è `["t"]`.

Funzione `a x^2 + b` con solo **a** = 2: esce `2x^2 + b` e **nomi rimasti** è `["b","x"]`. Il blocco [Calcola f(x)](fn.eval) a valle direbbe «Parametro senza valore: b».

### 4. Senza ingressi collegati

Funzione `3x^2 + 2sin(x) - ln(x)`, niente collegato: all'avvio scrive `3x^2 + 2sin(x) - ln(x)`.

## Errori

| Messaggio | Quando |
|---|---|
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il blocco si è fermato e «…» dice perché (vedi la pagina [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| … : serve un numero | Il valore di un parametro non è un numero (per esempio il testo `"abc"`). Il messaggio comincia con il nome del parametro. |

## Vedi anche

- [Calcola f(x)](fn.eval) per valutare la funzione in un punto
- [Derivata (simbolica)](fn.derivative) per derivare la funzione
- [Integrale definito ∫ₐᵇ f(x) dx](int.definite) per integrarla
- [Costante · Variabile](core.value) per dare un valore ai parametri
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
