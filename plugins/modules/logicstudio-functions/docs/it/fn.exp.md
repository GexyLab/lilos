# Esponenziali (Math.exp)

`fn.exp` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Le funzioni esponenziali: eˣ, 2ˣ, 10ˣ, aˣ con una base a scelta, ed eˣ − 1 preciso vicino a 0.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | numero | L'esponente. |
| **a (base)** (`a`) | numero | La base, per **aˣ**. Le altre funzioni non la usano e il blocco non la aspetta. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il risultato, arrotondato a 15 cifre significative. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`base`) | `e` eˣ; `two` 2ˣ; `ten` 10ˣ; `a` aˣ (l'ingresso **a**); `expm1` eˣ − 1 | `e` | Quale funzione calcolare. |

## Come funziona

A ogni valore che arriva su **x** il blocco calcola la funzione scelta. Con **aˣ** aspetta anche la base **a**, che deve essere maggiore di 0; l'ingresso **a** è nascosto di serie e serve solo con quella funzione.

**eˣ − 1** è calcolata con una formula che resta precisa quando x è molto vicino a 0: `eˣ - 1` calcolata a mano con x = 10⁻¹⁰ perderebbe quasi tutte le cifre, il blocco dà `1.00000000005e-10`.

Un risultato troppo grande per il computer (per eˣ, x oltre circa 709) è un errore. Per la funzione inversa vedi [Logaritmi](fn.log).

## Esempi

### 1. e alla 1

Funzione **eˣ**, **x** = 1:

```
[Costante · Variabile: 1] valore ──▶ x [Esponenziali: eˣ] risultato ──▶ valore [Print (console.log)]
```

Scrive `2.71828182845905`.

### 2. Altre basi

**2ˣ** con 10 dà `1024`; **10ˣ** con −3 dà `0.001`; **aˣ** con **x** = 3 e **a** = 2 dà `8`.

### 3. Vicino a zero

**eˣ − 1** con **x** = 10⁻¹⁰ (`1e-10`) dà `1.00000000005e-10`.

### 4. Quando non va

**aˣ** con **a** = 0: «La base a deve essere maggiore di 0». **eˣ** con **x** = 1000: «Il risultato è troppo grande».

## Errori

| Messaggio | Quando |
|---|---|
| x: serve un numero | **x** non è un numero (per esempio un testo come `"abc"`). |
| a: serve un numero | La base **a** non è un numero. |
| La base a deve essere maggiore di 0 | **aˣ** con **a** zero o negativa. |
| Il risultato è troppo grande | Il risultato non è un numero finito (supera il massimo dei numeri del computer, circa 10³⁰⁸). |

## Vedi anche

- [Logaritmi](fn.log) per la funzione inversa
- [Crescita e decadimento esponenziale](fn.growth) per N₀·e^(k·t)
- [Potenze e radici](fn.power) per xⁿ
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
