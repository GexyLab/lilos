# Sottrazione (−)

`core.subtract` · Matematica · [Blocchi di base](logicstudio-core) · versione 1

Toglie **b** da **a** e manda la differenza: a − b.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | numero | Il numero da cui togliere. |
| **b** | numero | Il numero da togliere. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | a − b. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui (vedi sotto i valori che non sono numeri). |

Questo blocco ha solo due ingressi: non se ne possono aggiungere.

## Come funziona

Ogni volta che arriva un valore su **a** o su **b**, il blocco calcola a − b con l'ultimo valore di ciascuno e lo manda su **risultato**.

- Un ingresso che non ha ancora ricevuto niente vale **0**: con solo **a** = 10 il risultato è 10; con solo **b** = 4 il risultato è −4.
- I valori vengono convertiti in numero con le stesse regole del blocco [Somma (+)](core.add): `"2,5"` vale 2,5; `true` vale 1 e `false` 0; un testo vuoto e `null` valgono 0.
- **Diversamente dal blocco Somma**, un valore che non si può convertire (`"ciao"`, un oggetto) **non** dà errore: il risultato è `NaN` («non è un numero»), e viene mandato lo stesso. I blocchi dopo (per esempio un blocco [Confronto (== ≠ < >)](core.compare)) lo trattano come un numero sbagliato. Se vuoi un errore, metti prima un blocco [Cast in numero (Number())](core.toNumber).
- I numeri decimali del computer possono dare piccoli scarti: 0,3 − 0,1 = 0,19999999999999998. Arrotonda con [Funzioni Math](core.math) prima di mostrarli.

## Esempi

### 1. Quanto manca

```
[Costante · Variabile: 100]              valore ──▶ a  [Sottrazione (−)] risultato ──▶ valore [Valore: mancano]
[Campo numerico: raccolti] valore ──▶ b
```

Obiettivo 100, raccolti 35: mancano 65. Raccolti 120: −20.

### 2. La differenza tra due misure

**a** = 22,5 (temperatura dentro), **b** = `"8,5"` (temperatura fuori, arrivata come testo) → 14.

### 3. Un valore non numerico

**a** = 10, **b** = `"dieci"` → il risultato è `NaN`, senza Exception. Con un blocco [Cast in numero (Number())](core.toNumber) davanti a **b**, invece, l'Exception del blocco Cast riceve «Non è un numero» e la Sottrazione non riceve niente.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Somma (+)](core.add), [Moltiplicazione (×)](core.multiply), [Divisione (÷ %)](core.divide)
- [Funzioni Math](core.math) con **cambia segno** per rendere negativo un numero
- [Come funziona un blocco](ide/blocks)
