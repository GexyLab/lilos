# Numeri complessi

`num.complex` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Fa i conti con i **numeri complessi**: somma, prodotto, divisione, potenza, radice, coniugato, esponenziale, logaritmo, seno, coseno, e converte da e verso la forma polare. Dà parte reale e immaginaria, modulo e argomento.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** (`a`) | qualsiasi | Il primo numero: `3+4i`, `-2j`, `i`, un numero, un oggetto `{re, im}` o una lista `[re, im]`. Se non è collegato vale l'impostazione **a**. |
| **b** (`b`) | qualsiasi | Il secondo numero (per le operazioni a due numeri; con **da polare**, l'angolo). Se non è collegato vale l'impostazione **b**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato {re, im}** (`result`) | oggetto | Il risultato come oggetto `{re, im}`. |
| **come testo** (`text`) | testo | Il risultato come testo (`4+2i`). |
| **re** (`re`) | numero | La parte reale. |
| **im** (`im`) | numero | La parte immaginaria. |
| **modulo** (`modulus`) | numero | Il modulo (la distanza dall'origine). |
| **argomento (rad)** (`argument`) | numero | L'argomento, cioè l'angolo, in radianti tra −π e π. |
| **polare {r, theta}** (`polar`) | oggetto | La forma polare `{r, theta}`. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | a + b / a − b / a × b / a ÷ b / a ^ b / radice b-esima di a / coniugato di a / −a / 1 ÷ a / √a / e^a / ln a / sin a / cos a / a com'è (modulo, argomento…) / da polare: modulo a, angolo b | a + b | L'operazione: `a + b`, `a − b`, `a × b`, `a ÷ b`, `a ^ b`, la radice b-esima, il coniugato, `−a`, `1 ÷ a`, `√a`, `e^a`, `ln a`, `sin a`, `cos a`, **a com'è** (per avere solo modulo e argomento) o **da polare** (modulo a e angolo b in radianti). |
| **a (se l'ingresso non è collegato)** (`a`) | un testo (un numero complesso) | `3+4i` | Il primo numero, quando l'ingresso **a** non è collegato. |
| **b (se l'ingresso non è collegato)** (`b`) | un testo (un numero complesso) | `1-2i` | Il secondo numero, quando l'ingresso **b** non è collegato. |

## Come funziona

Se **nessun** ingresso è collegato, il blocco calcola **una volta all'avvio dello schema** con le impostazioni. Se uno o più ingressi sono collegati, aspetta che abbiano tutti un valore e poi calcola a ogni nuovo valore.

- I numeri complessi si scrivono con `i` o `j` (`3+4i`, `-2j`, `i`, `1.5-2i`), con un numero solo (parte reale) o con un oggetto o una lista; le virgole decimali valgono come punti.
- Le operazioni a un solo numero (coniugato, radice quadrata, esponenziale…) usano solo **a**.
- I valori più piccoli di un milionesimo di miliardesimo del più grande sono messi a 0, così `i^2` dà proprio `-1`.
- **radice b-esima** dà la radice principale (quella con l'angolo più piccolo).

## Esempi

### 1. Un prodotto

`(3+4i) × (1−2i)`:

```
[Numeri complessi: a × b, 3+4i, 1-2i] testo ──▶ valore [Print (console.log)]
```

Scrive `11-2i`.

### 2. Modulo e argomento

**a com'è** con `3+4i`:

```
[Numeri complessi: a com'è, 3+4i] modulo ──▶ valore [Print (console.log)]
```

Scrive `5`; l'argomento è 0.9272952180016122.

### 3. L'identità di Eulero

`e^(iπ)` con **a** = `[0, 3.141592653589793]` (la lista `[re, im]`):

```
[Numeri complessi: e^a] testo ──▶ valore [Print (console.log)]
```

Scrive `-1`.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un numero complesso: «…» | Un valore non si legge come numero complesso (si scrive `3+4i`, `-2j`, `i`, un numero, `{re, im}` o `[re, im]`). |
| Numero complesso non valido | Un testo è più lungo di 80 caratteri. |
| Un numero complesso deve avere parti finite | Un numero è infinito. |
| Divisione per zero | Si divide per 0 (`a ÷ 0`, `1 ÷ 0`, la radice 0-esima). |
| Il logaritmo di 0 non esiste | Con **ln a**, a è 0. |
| Il risultato non è un numero finito | Il risultato supera i numeri rappresentabili (per esempio `e^1000`). |
| Modulo: serve un numero | Il valore **Modulo** è vuoto o non è un numero. |
| Angolo: serve un numero | Il valore **Angolo** è vuoto o non è un numero. |

## Vedi anche

- [Equazione di 2° grado ax² + bx + c = 0](fn.quadratic) che dà le soluzioni complesse di un'equazione di 2° grado
- [Polinomio: valore e radici](fn.poly) che dà le radici complesse di un polinomio
- [FFT (np.fft.fft)](sig.fft) che dà lo spettro di un segnale (modulo e fase)
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
