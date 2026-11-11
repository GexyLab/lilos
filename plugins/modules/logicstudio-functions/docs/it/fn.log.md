# Logaritmi (Math.log)

`fn.log` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

I logaritmi: naturale, in base 10, in base 2, in una base a scelta, e ln(1 + x) preciso vicino a 0.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **x** (`x`) | numero | Il numero. Deve essere maggiore di 0 (per **ln(1 + x)**: maggiore di −1). |
| **b (base)** (`b`) | numero | La base, per **log_b x**. Le altre funzioni non la usano e il blocco non la aspetta. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il risultato, arrotondato a 15 cifre significative. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`base`) | `ln` ln x (naturale); `log10` log₁₀ x; `log2` log₂ x; `b` log_b x (l'ingresso **b**); `log1p` ln(1 + x) | `ln` | Quale logaritmo calcolare. |

## Come funziona

A ogni valore che arriva su **x** il blocco calcola il logaritmo scelto. Con **log_b x** aspetta anche la base **b**, che deve essere maggiore di 0 e diversa da 1 (il risultato è ln x / ln b); l'ingresso **b** è nascosto di serie.

**ln(1 + x)** è calcolato con una formula che resta precisa quando x è vicino a 0: con x = 10⁻¹⁰ dà `9.9999999995e-11`.

Nelle funzioni scritte come testo (per esempio in [Calcola f(x)](fn.eval)) `ln` è il logaritmo naturale, `log` quello in base 10 e `log(b, x)` quello in base b.

## Esempi

### 1. Logaritmo naturale

Funzione **ln x**, **x** = 2,718281828459045 (il numero e): il risultato è `1`.

```
[Costante · Variabile: 1000] valore ──▶ x [Logaritmi: log₁₀ x] risultato ──▶ valore [Print (console.log)]
```

Con **log₁₀ x** scrive `3`.

### 2. Altre basi

**log₂ x** con 8 dà `3`; **log_b x** con **x** = 81 e **b** = 3 dà `4`; **log₁₀ x** con 0,5 dà `-0.301029995663981`.

### 3. Vicino a zero

**ln(1 + x)** con **x** = 10⁻¹⁰ dà `9.9999999995e-11`.

### 4. Quando non va

**ln x** con 0: «Il logaritmo vuole x > 0». **ln(1 + x)** con −1: «ln(1 + x) vuole x > −1». **log_b x** con **b** = 1: «La base del logaritmo deve essere maggiore di 0 e diversa da 1».

## Errori

| Messaggio | Quando |
|---|---|
| x: serve un numero | **x** non è un numero (per esempio un testo come `"abc"`). |
| b: serve un numero | La base **b** non è un numero. |
| Il logaritmo vuole x > 0 | **x** è 0 o negativo (con ln, log₁₀, log₂ e log_b). |
| ln(1 + x) vuole x > −1 | **x** è −1 o meno con **ln(1 + x)**. |
| La base del logaritmo deve essere maggiore di 0 e diversa da 1 | **log_b x** con **b** ≤ 0 o **b** = 1. |

## Vedi anche

- [Esponenziali](fn.exp) per la funzione inversa
- [Potenze e radici](fn.power) per xⁿ e ⁿ√x
- [Funzioni Math](core.math) per le altre funzioni dei numeri
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
