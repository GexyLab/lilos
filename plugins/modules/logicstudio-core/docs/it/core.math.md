# Funzioni Math

`core.math` · Matematica · [Blocchi di base](logicstudio-core) · versione 1

Fa un'operazione su un numero: arrotonda, valore assoluto, radice quadrata, cambia segno, seno, coseno, logaritmo, esponenziale.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il numero su cui lavorare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il risultato dell'operazione. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | vedi la tabella sotto | arrotonda | L'operazione da fare. |
| **Decimali (arrotonda)** (`decimals`) | da 0 a 10 | 0 | Quanti decimali tenere. Si vede solo con **arrotonda**. Vuoto vale 0. |

Le operazioni:

| Operazione | Cosa fa | Esempi |
|---|---|---|
| **arrotonda** (`round`) | All'intero più vicino, o al numero di **Decimali** scelto. Un ,5 esatto va **verso l'alto** (verso +∞). | 2,4 → 2; 2,5 → 3; −2,5 → **−2**; con 2 decimali 3,14159 → 3,14 |
| **arrotonda per difetto** (`floor`) | All'intero più piccolo o uguale. | 2,9 → 2; −2,1 → −3 |
| **arrotonda per eccesso** (`ceil`) | All'intero più grande o uguale. | 2,1 → 3; −2,9 → −2 |
| **valore assoluto** (`abs`) | Toglie il segno. | −3 → 3; 3 → 3 |
| **radice quadrata** (`sqrt`) | La radice quadrata. | 16 → 4; 2 → 1,4142135623730951; −1 → NaN |
| **cambia segno** (`neg`) | Il numero con il segno opposto. | 5 → −5; −5 → 5 |
| **seno** (`sin`) | Il seno di un angolo **in radianti**. | 0 → 0; π/2 (1,5707963267948966) → 1 |
| **coseno** (`cos`) | Il coseno di un angolo **in radianti**. | 0 → 1 |
| **logaritmo naturale** (`log`) | Il logaritmo in base *e*. | *e* (2,718281828459045) → 1; 1 → 0; 0 → −∞; −1 → NaN |
| **esponenziale** (`exp`) | *e* elevato al numero. | 0 → 1; 1 → 2,718281828459045 |

Gli angoli in gradi vanno prima convertiti in radianti: moltiplica per 0,017453292519943295 (π ÷ 180) con il blocco [Moltiplicazione (×)](core.multiply).

## Come funziona

A ogni valore che arriva, il blocco lo converte in numero, fa l'operazione e manda il risultato su **risultato**.

- La conversione segue le regole del blocco [Somma (+)](core.add): `"2,5"` vale 2,5; `true` vale 1 e `false` 0; un testo vuoto e `null` valgono 0.
- Un valore che non si può convertire (`"ciao"`, un oggetto) **non** dà errore: il risultato è `NaN` («non è un numero»). Lo stesso per la radice di un numero negativo e il logaritmo di un numero negativo.
- Con **arrotonda** e dei decimali, il numero viene moltiplicato, arrotondato e diviso: per i numeri che il computer non sa scrivere esattamente il risultato può sorprendere. Per esempio 1,005 con 2 decimali dà **1**, non 1,01, perché per il computer 1,005 è in realtà 1,00499999…
- Scrivi i **Decimali** come numero intero: un valore con la virgola (per esempio 1,5) dà risultati senza senso.

## Esempi

### 1. Un prezzo con due decimali

```
[Divisione (÷ %)] risultato ──▶ valore [Funzioni Math: arrotonda, 2 decimali] risultato ──▶ valore [Valore: prezzo]
```

100 ÷ 3 = 33,333333333333336 → 33,33. 0,1 + 0,2 = 0,30000000000000004 → 0,3.

### 2. Quante scatole servono

Operazione **arrotonda per eccesso**: 23 oggetti ÷ 10 per scatola = 2,3 → 3 scatole.

### 3. Una distanza senza segno

Operazione **valore assoluto**: la differenza tra due quote, 120 − 150 = −30 → 30.

### 4. Un'onda

Collega un blocco [Contatore (++ −−)](core.counter) a **valore** con operazione **seno**: a ogni passo il risultato oscilla tra −1 e 1 (con passo 0,1 il contatore manda 0,1, 0,2, 0,3… e il seno 0,0998…, 0,1986…, 0,2955…).

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Clamp (limita)](core.clamp) per tenere un numero tra un minimo e un massimo
- [Divisione (÷ %)](core.divide) per il resto di una divisione
- [Somma (+)](core.add), [Moltiplicazione (×)](core.multiply)
- [Come funziona un blocco](ide/blocks)
