# Crescita e decadimento esponenziale

`fn.growth` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

La crescita e il decadimento esponenziale N(t) = N₀·e^(k·t): dal tasso k, oppure dal tempo di dimezzamento o di raddoppio.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **N₀ (valore iniziale)** (`n0`) | numero | Il valore iniziale N₀ (a t = 0). |
| **t (tempo)** (`t`) | numero | Il tempo, nella stessa unità di **k** o di **T**. |
| **k (tasso)** (`k`) | numero | Il tasso k (con il modo **Tasso**). Se non è collegato vale l'impostazione **k**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **T (dimezzamento o raddoppio)** (`T`) | numero | Il tempo di dimezzamento o di raddoppio (con gli altri due modi). Se non è collegato vale l'impostazione **T**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **N(t)** (`n`) | numero | Il valore N(t), arrotondato a 15 cifre significative. |
| **k (tasso)** (`k`) | numero | Il tasso usato: quello dato, o ricavato da **T** (negativo per il dimezzamento). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **tempo di dimezzamento o raddoppio** (`halfLife`) | numero | Il tempo di dimezzamento (se k < 0) o di raddoppio (se k > 0), cioè ln 2 / |k|. Non esce se k = 0. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Dato** (`mode`) | `rate` tasso k: N = N₀·e^(k·t); `halfLife` tempo di dimezzamento T (decadimento); `doubling` tempo di raddoppio T (crescita) | `rate` | Quale dato conosci. |
| **k (se l'ingresso non è collegato)** (`k`) | un numero | 0,05 | Il tasso, quando l'ingresso **k** non è collegato. |
| **T (se l'ingresso non è collegato)** (`T`) | un numero | 10 | Il tempo di dimezzamento o raddoppio, quando l'ingresso **T** non è collegato. |

## Come funziona

Il blocco gira quando arriva **N₀** o **t** (e aspetta finché ci sono tutti e due) e calcola N = N₀·e^(k·t).

- Con **Tasso**, k è l'ingresso **k** (o l'impostazione). Positivo è crescita, negativo è decadimento.
- Con **Tempo di dimezzamento T** si usa k = −ln 2 / T: dopo un tempo T il valore è la metà (N₀ = 100, T = 5: a t = 10 il valore è 25).
- Con **Tempo di raddoppio T** si usa k = ln 2 / T: dopo un tempo T il valore è doppio.
- Gli ingressi **k** e **T** sono nascosti di serie: se non li colleghi valgono le impostazioni, e il blocco usa solo quello che serve al modo scelto.
- Un risultato troppo grande per il computer è un errore.

## Esempi

### 1. Un tasso

Modo **Tasso**, **k** = 0,05 (il 5% per unità di tempo), **N₀** = 100, **t** = 10:

```
[Costante · Variabile: 100] valore ──▶ N₀ [Crescita e decadimento] N(t) ──▶ valore [Print (console.log)]
[Costante · Variabile: 10] valore ──▶ t
```

Scrive `164.872127070013`. **k** è `0.05` e il tempo di raddoppio `13.8629436111989`.

### 2. Un dimezzamento

Modo **Tempo di dimezzamento T**, **T** = 5, **N₀** = 100, **t** = 10: **N(t)** è `25` e **k** è `-0.138629436111989`. Con **N₀** = 80, **T** = 3, **t** = 3 esce `40`.

### 3. Un raddoppio

Modo **Tempo di raddoppio T**, **T** = 10, **N₀** = 100, **t** = 30: **N(t)** è `800`.

### 4. Quando non va

Con **T** = 0: «T deve essere maggiore di 0».

## Errori

| Messaggio | Quando |
|---|---|
| N₀: serve un numero | **N₀** non è un numero. |
| t: serve un numero | **t** non è un numero. |
| k: serve un numero | Il tasso non è un numero. |
| T: serve un numero | Il tempo T non è un numero. |
| T deve essere maggiore di 0 | Con dimezzamento o raddoppio, **T** è 0 o negativo. |
| Il risultato è troppo grande | Il risultato non è un numero finito (supera il massimo dei numeri del computer, circa 10³⁰⁸). |

## Vedi anche

- [Esponenziali](fn.exp) per eˣ
- [Logaritmi](fn.log) per ricavare t o k da due valori
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
