# Primitiva (integrale indefinito)

`int.primitive` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Trova la primitiva di una funzione, cioè la formula F(x) la cui derivata è f(x), e la scrive come testo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come `x e^x`. Se non è collegato vale l'impostazione **Funzione**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **F (primitiva)** (`primitive`) | testo | La primitiva, con la costante **C** aggiunta se è diversa da 0. Si può collegare a un altro blocco che vuole una funzione (per esempio [Integrale definito](int.definite)). |
| **∫ f dx = F + C** (`text`) | testo | La formula intera, da mostrare: `∫ x*e^x dx = x*e^x - e^x + C`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Un errore (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`expr`) | testo | `x e^x` | La funzione, se **f** non è collegato. |
| **Variabile** (`variable`) | testo | `x` | Il nome della variabile di integrazione. |
| **Costante C aggiunta a F** (`C`) | numero | 0 | Un numero che il blocco somma alla primitiva. Con 0 non si aggiunge niente. |

## Come funziona

Il blocco non calcola numeri: cerca la **formula** con una tabella di forme conosciute.

- **Polinomi** e **potenze** di un'espressione lineare: `3x^2 + 2x + 1`, `(2x+1)^5`, `1/x` (che dà `ln(abs(x))`), `sqrt(3x+1)`.
- **Esponenziali** `e^`, e `a^x`.
- **Funzioni**: `sin`, `cos`, `tan`, `sec`, `csc`, `sinh`, `cosh`, `tanh`, `ln`, `sqrt`, `cbrt`, `asin`, `acos`, `atan`, `abs`.
- **Quadrati** `sin²`, `cos²`, `sec²`, `csc²`, `tan²`.
- **1 / (polinomio di 2° grado)**: dà un'arcotangente o un logaritmo, secondo il discriminante (`1/(1+x^2)` → `atan(x)`).
- **1 / radice di un polinomio di 2° grado**: dà un arcoseno o un logaritmo (`1/sqrt(1-x^2)` → `asin(x)`).
- **Per parti**: `x^n` per `e^`, `sin`, `cos`, `sinh`, `cosh`, e `x^n` per `ln(x)`.
- **Per sostituzione**: le forme `u'·h(u)` e `u·u'` (per esempio `2x*cos(x^2)` → `sin(x^2)`).
- Altri nomi nella funzione (come `a` in `a*x`) restano nel risultato come parametri.

**Ogni risultato viene controllato**: il blocco lo deriva e lo confronta con la funzione in diversi punti. Se non coincide, o se la forma non è nella tabella, manda un errore invece di un risultato sbagliato. In quel caso usa l'[Integrale definito](int.definite), che lavora con i numeri.

La costante C è sempre scritta `+ C` nel testo lungo; il numero **C** delle Proprietà finisce solo nella primitiva.

Senza ingressi collegati calcola una volta all'avvio dello schema.

## Esempi

### 1. Per parti

```
[Primitiva: x e^x] F (primitiva) ──▶ valore [Print (console.log)]
```

Nessun ingresso collegato: calcola all'avvio. Scrive `x*e^x - e^x`. Con **∫ f dx = F + C** collegata scrive `∫ x*e^x dx = x*e^x - e^x + C`.

### 2. Un polinomio con la costante

```
[Costante · Variabile: 3x^2+2x+1] valore ──▶ f [Primitiva, C = 5] F (primitiva) ──▶ valore [Print (console.log)]
```

Scrive `x^3 + x^2 + x + 5`.

### 3. Altre primitive

| Funzione | Primitiva |
|---|---|
| `sin(x)^2` | `x/2 - sin(2x)/4` |
| `1/(1+x^2)` | `atan(x)` |
| `ln(x)` | `x*ln(x) - x` |
| `2x*cos(x^2)` | `sin(x^2)` |
| `cos(3x)` | `sin(3x)/3` |
| `x^2*e^x` | `x^2*e^x - 2x*e^x + 2e^x` |

## Errori

| Messaggio | Quando |
|---|---|
| Primitiva non trovata in forma chiusa: usa l'integrale definito numerico | La forma non è nella tabella (per esempio `sin(x)/x` o `e^(x^2)`), o il controllo derivando non è riuscito. |
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere …: … | La funzione è scritta male. |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti. |
| f deve essere un'espressione di testo, come «x^2 + 1» | All'ingresso **f** arriva qualcosa che non è un testo. |
| Nome di variabile non valido: «…» | La **Variabile** non è un nome valido. |
| «…» è una costante, non può essere la variabile | La **Variabile** è `pi` o `e`. |

## Vedi anche

- [Integrale definito](int.definite) per il valore dell'integrale tra due estremi
- [Derivata (simbolica)](fn.derivative) per il passaggio inverso
- [Funzione f(x)](fn.define) per dare un nome alla funzione
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
