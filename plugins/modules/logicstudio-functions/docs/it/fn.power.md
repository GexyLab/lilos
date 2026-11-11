# Potenze e radici (Math.pow, Math.sqrt)

`fn.power` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Potenze e radici di un numero: xⁿ, la radice n-esima, il quadrato, il cubo, la radice quadrata, la radice cubica, il reciproco.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | numero | Il numero. |
| **n (esponente o indice)** (`n`) | numero | L'esponente (per **xⁿ**) o l'indice della radice (per **ⁿ√x**). Le altre operazioni non lo usano e il blocco non lo aspetta. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il risultato, arrotondato a 15 cifre significative. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | `pow` xⁿ; `root` radice n-esima ⁿ√x; `square` x²; `cube` x³; `sqrt` √x; `cbrt` ∛x; `reciprocal` 1/x | `pow` | L'operazione. |

## Come funziona

A ogni valore che arriva il blocco fa l'operazione scelta. Per xⁿ e ⁿ√x aspetta anche **n**.

- **xⁿ**: la potenza. Un numero negativo con un esponente non intero (`(-8)^0.5`) non ha un risultato reale: errore.
- **ⁿ√x**: la radice di indice **n**, cioè x elevato a 1/n. Un numero negativo ha radice solo con **n** intero **dispari** (`ⁿ√-27` con n = 3 dà −3). L'indice 0 non esiste.
- **√x**: il numero deve essere 0 o più. **∛x**: va bene anche per i negativi (∛−27 = −3).
- **1/x**: per 0 dà errore.
- **0** con un esponente **negativo** (`0^-1`) è una divisione per 0: errore.
- Un risultato troppo grande per il computer (oltre circa 10³⁰⁸) è un errore, non un'infinito.
- Per le potenze dentro una funzione scritta come testo non serve questo blocco: nelle espressioni c'è già `^`.

## Esempi

### 1. 2 alla 10

Operazione **xⁿ**, **x** = 2 e **n** = 10:

```
[Costante · Variabile: 2] valore ──▶ x [Potenze e radici] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 10] valore ──▶ n
```

Scrive `1024`.

### 2. Radici

Operazione **ⁿ√x**: **x** = 27, **n** = 3 dà `3`; **x** = −27, **n** = 3 dà `-3`. Operazione **√x** con 2 dà `1.4142135623731`; **∛x** con −27 dà `-3`.

### 3. Quadrato, cubo, reciproco

**x²** con 1,5 dà `2.25`; **x³** con −3 dà `-27`; **1/x** con 4 dà `0.25`.

### 4. Gli errori

**xⁿ** con **x** = −8 e **n** = 0,5: «Potenza di un numero negativo con esponente non intero: il risultato non è reale». **√x** con −2: «La radice quadrata di un numero negativo non è reale». **xⁿ** con **x** = 0 e **n** = −1: «0 elevato a un esponente negativo non esiste (è una divisione per 0)». **1/x** con 0: «Il reciproco di 0 non esiste».

## Errori

| Messaggio | Quando |
|---|---|
| x: serve un numero | **x** non è un numero (per esempio un testo come `"abc"`). |
| n: serve un numero | **n** non è un numero. |
| Potenza di un numero negativo con esponente non intero: il risultato non è reale | **xⁿ** con **x** negativo e **n** non intero. |
| L'indice della radice non può essere 0 | **ⁿ√x** con **n** = 0. |
| La radice di indice pari di un numero negativo non è reale | **ⁿ√x** con **x** negativo e **n** pari o non intero. |
| La radice quadrata di un numero negativo non è reale | **√x** con **x** negativo. |
| Il reciproco di 0 non esiste | **1/x** con **x** = 0. |
| 0 elevato a un esponente negativo non esiste (è una divisione per 0) | **xⁿ** con **x** = 0 e **n** negativo. |
| Il risultato è troppo grande | Il risultato non è un numero finito (supera il massimo dei numeri del computer, circa 10³⁰⁸). |

## Vedi anche

- [Esponenziali](fn.exp) per eˣ, 2ˣ, 10ˣ e aˣ
- [Logaritmi](fn.log) per l'operazione inversa
- [Funzioni Math](core.math) per le altre funzioni dei numeri
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
