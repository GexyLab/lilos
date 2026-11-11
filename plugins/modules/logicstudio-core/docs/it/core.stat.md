# Minimo · Massimo · Media

`core.stat` · Matematica · [Blocchi di base](logicstudio-core) · versione 1

Tra due o più numeri, manda il più piccolo, il più grande o la media.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | numero | Il primo numero. |
| **b** | numero | Il secondo numero. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il minimo, il massimo o la media dei numeri validi. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | minimo, massimo, media | media | **minimo**: il numero più piccolo; **massimo**: il più grande; **media**: la somma divisa per quanti sono. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo numero, chiamati con le lettere che seguono: **c**, **d**, **e**… fino a **r**. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva un valore su un ingresso, il blocco prende l'ultimo valore di ogni ingresso, tiene solo quelli che sono numeri e manda il risultato su **risultato**.

- Gli ingressi che non hanno ancora ricevuto niente non contano.
- I valori vengono convertiti in numero con le stesse regole della [Somma](core.add): `"2,5"` vale 2,5; `true` vale 1 e `false` 0; **un testo vuoto e `null` valgono 0** (e quindi contano, per esempio abbassano la media).
- **Diversamente dalla Somma**, i valori che non si possono convertire (`"ciao"`, un oggetto) vengono **saltati** senza errore: la media di 4, `"abc"` e 10 è 7 (cioè (4 + 10) ÷ 2).
- Se non resta nessun numero valido, il blocco non manda niente.
- La media può avere molti decimali (la media di 1, 2 e 2 è 1,6666666666666667): arrotondala con [Calcola](core.math).

## Esempi

### 1. La media di tre misure

Operazione **media**, ingresso **c** aggiunto:

```
[Sensore 1] valore ──▶ a  [Minimo · Massimo · Media] risultato ──▶ valore [Valore: temperatura media]
[Sensore 2] valore ──▶ b
[Sensore 3] valore ──▶ c
```

Con 20, 22 e 24 la media è 22. Se il sensore 3 non ha ancora mandato niente, la media è 21 (di 20 e 22).

### 2. Il più alto di due offerte

Operazione **massimo**: **a** = 150, **b** = `"175,50"` → 175,5.

### 3. Un valore sbagliato

Operazione **minimo**: **a** = 8, **b** = `"n.d."` → 8 (il testo viene saltato). Con **b** = `""` invece il minimo è 0, perché il testo vuoto vale 0.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Somma](core.add) per il totale
- [Limita](core.clamp) per tenere un numero tra un minimo e un massimo fissi
- [Somma · Minimo · Massimo · Media](coll.stat) per fare lo stesso sugli elementi di una lista
- [Come funziona un blocco](ide/blocks)
