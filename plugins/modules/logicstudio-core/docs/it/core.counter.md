# Contatore (++ −−)

`core.counter` · Matematica · [Blocchi di base](logicstudio-core) · versione 1

Tiene un numero che sale di un passo a ogni impulso su **più**, scende a ogni impulso su **meno** e torna al valore di partenza con **azzera**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **più** (`up`) | impulso | Aggiunge il **Passo** al conteggio. |
| **meno** (`down`) | impulso | Toglie il **Passo** dal conteggio. |
| **azzera** (`reset`) | impulso | Riporta il conteggio a **Parte da**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **conteggio** (`count`) | numero | Il conteggio, dopo ogni impulso. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Passo** (`step`) | un numero (anche con decimali o negativo) | 1 | Di quanto sale o scende il conteggio a ogni impulso. |
| **Parte da** (`from`) | un numero | 0 | Il conteggio all'avvio e dopo **azzera**. |

## Come funziona

All'avvio del programma il conteggio vale **Parte da**, ma il blocco **non lo manda**: il primo valore esce al primo impulso.

A ogni impulso il blocco cambia il conteggio e lo manda su **conteggio**:

| Arriva su | Nuovo conteggio |
|---|---|
| **più** | conteggio + Passo |
| **meno** | conteggio − Passo |
| **azzera** | Parte da (e lo manda) |

Cose da sapere:

- Conta solo **che** arrivi qualcosa, non **cosa**: anche `false` o `0` su **più** fanno salire il conteggio.
- Non c'è un limite: il conteggio può scendere sotto zero e salire quanto vuoi. Per tenerlo tra due valori, metti dopo un blocco [Clamp (limita)](core.clamp) (che però limita solo quello che esce, non il conteggio interno).
- Con un **Passo** con i decimali si accumulano piccoli scarti: partendo da 10 con passo 0,1, dopo quattro **più** il conteggio è 10,399999999999999. Arrotonda con [Funzioni Math](core.math) prima di mostrarlo.
- Con un **Passo** negativo, **più** fa scendere e **meno** fa salire.
- Se lasci vuoto il **Passo**, vale 0 (il conteggio non cambia). Se lasci vuoto **Parte da**, all'inizio il conteggio è vuoto e il primo **più** dà il Passo.
- Il conteggio riparte da **Parte da** a ogni avvio del programma: non viene salvato.
- Non togliere «lo avvia» dagli ingressi: un ingresso senza «lo avvia» non fa più niente.

## Esempi

### 1. Contare i clic

```
[Pulsante: +1]     premuto ──▶ più    [Contatore (++ −−)] conteggio ──▶ valore [Valore: clic]
[Pulsante: −1]     premuto ──▶ meno
[Pulsante: Azzera] premuto ──▶ azzera
```

Tre clic su **+1**: la componente [Valore](ui.value) mostra 1, 2, 3. Un clic su **−1**: 2. **Azzera**: 0. Fino al primo clic, la componente mostra il suo testo «vuoto» (di serie `—`).

### 2. Un conto alla rovescia

Passo 1, Parte da 10. Collega [Intervallo (setInterval)](core.every) (1 secondo) a **meno**: il blocco manda 9, 8, 7… un numero al secondo, e continua sotto lo zero (−1, −2…). Per fermarlo a 0, usa un blocco [Confronto (== ≠ < >)](core.compare) `a ≤ b` con **b** = 0 e manda il risultato, rovesciato con [NOT](core.not), all'ingresso **acceso** di Ogni….

### 3. Un indice che avanza di 5

Passo 5, Parte da 100: **più**, **più**, **meno** → 105, 110, 105.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Al cambio (fronte ↑↓)](core.edge) per contare i cambiamenti di un sì/no
- [Memoria (set · get)](core.store) per tenere un valore qualsiasi
- [Somma (+)](core.add) per sommare numeri che arrivano
- [Range](coll.range) per una lista di numeri in fila
- [Come funziona un blocco](ide/blocks)
