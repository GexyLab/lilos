# Funzioni iperboliche (Math.sinh, Math.cosh…)

`trig.hyperbolic` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Calcola una funzione iperbolica (seno, coseno, tangente, cotangente, secante, cosecante) o una delle sue inverse (settori).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | numero | Il numero su cui lavorare. Un testo con un numero (`"0,5"`) va bene. Non è un angolo: qui non ci sono unità. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore della funzione. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Il valore non è un numero, è fuori dal dominio o il risultato è troppo grande. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`fn`) | sinh, cosh, tanh, coth, sech, csch, asinh, acosh, atanh, acoth, asech, acsch | sinh | Quale funzione calcolare. |

## Come funziona

A ogni valore che arriva il blocco calcola la funzione e manda il risultato su **valore**.

| Funzione | Nome | Valori accettati |
|---|---|---|
| **sinh** | seno iperbolico | qualsiasi |
| **cosh** | coseno iperbolico | qualsiasi |
| **tanh** | tangente iperbolica | qualsiasi |
| **coth** | cotangente iperbolica | tutti tranne 0 |
| **sech** | secante iperbolica | qualsiasi |
| **csch** | cosecante iperbolica | tutti tranne 0 |
| **asinh** | settore seno iperbolico | qualsiasi |
| **acosh** | settore coseno iperbolico | 1 o più |
| **atanh** | settore tangente iperbolica | tra −1 e 1, esclusi |
| **acoth** | settore cotangente iperbolica | minore di −1 o maggiore di 1 |
| **asech** | settore secante iperbolica | maggiore di 0 e al massimo 1 |
| **acsch** | settore cosecante iperbolica | tutti tranne 0 |

- Sono funzioni di un numero qualsiasi, non di un angolo: per questo il blocco non ha l'impostazione **Unità**.
- sinh e cosh crescono in fretta: da circa 710 in su il risultato è troppo grande per il computer e il blocco dà un errore invece di un numero infinito.
- Il risultato è arrotondato a **15 cifre significative**.

## Esempi

### 1. Il seno iperbolico di 1

```
[Costante · Variabile: 1] valore ──▶ x [Funzioni iperboliche: sinh] valore ──▶ valore [Print (console.log)]
```

Scrive `1.1752011936438`.

### 2. La tangente iperbolica di 0,5

Funzione **tanh**, x = 0,5: scrive `0.46211715726001`.

### 3. Il settore coseno iperbolico di 2

Funzione **acosh**, x = 2: scrive `1.31695789692482`. La funzione **asech** con x = 0,5 dà lo stesso numero.

### 4. Un valore fuori dominio

Funzione **atanh**, x = 1: errore `atanh vuole un valore tra −1 e 1 esclusi`.

### 5. Un numero troppo grande

Funzione **sinh**, x = 1000: errore `sinh(1000) è troppo grande`.

## Errori

| Messaggio | Quando |
|---|---|
| x: serve un numero | x non è un numero. |
| coth non è definita per x = 0 | **coth** con x = 0. |
| csch non è definita per x = 0 | **csch** con x = 0. |
| acsch non è definita per x = 0 | **acsch** con x = 0. |
| acosh vuole un valore maggiore o uguale a 1 | **acosh** con x minore di 1. |
| atanh vuole un valore tra −1 e 1 esclusi | **atanh** con x minore o uguale a −1, o maggiore o uguale a 1. |
| acoth vuole un valore minore di −1 o maggiore di 1 | **acoth** con x tra −1 e 1 (compresi). |
| asech vuole un valore maggiore di 0 e al massimo 1 | **asech** con x minore o uguale a 0, o maggiore di 1. |
| sinh(1000) è troppo grande | Il risultato non sta in un numero (per esempio **sinh** o **cosh** di 1000). Il nome della funzione e il valore cambiano. |

## Vedi anche

- [Funzioni trigonometriche (Math.sin, Math.cos…)](trig.fn) per le funzioni di un angolo
- [Funzioni inverse (Math.asin, Math.acos…)](trig.inverse)
- [Funzioni Math](core.math) per logaritmo ed esponenziale
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
