# Scomponi segnale

`sig.info` · Segnali · [Segnali](logicstudio-signals) · versione 1

Apre un segnale nei suoi pezzi: la lista dei campioni, la frequenza di campionamento, quanti sono, la durata, i tempi di ogni campione. Serve per leggere un segnale con gli altri blocchi di Logic Studio (per esempio per scrivere i campioni in un file, o mostrare la durata).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Un segnale `{ fs, t0, samples }`, una lista di numeri (presa alla «fs delle liste semplici») o un testo JSON di uno dei due. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **campioni** (`samples`) | lista | I valori del segnale (la parte reale). |
| **fs (Hz)** (`fs`) | numero | La frequenza di campionamento. |
| **N** (`n`) | numero | Quanti campioni ha il segnale. |
| **durata (s)** (`duration`) | numero | `N / fs`, in secondi. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **t₀ (s)** (`t0`) | numero | Il tempo del primo campione. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **tempi (s)** (`times`) | lista | Il tempo di ogni campione, `t₀ + i/fs`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **parte immaginaria** (`im`) | lista | La parte immaginaria; lista vuota se il segnale è reale. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Segnale mancante o non valido, troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **fs delle liste semplici (Hz)** (`listFs`) | più di 0 | 1000 | Se al blocco arriva una lista semplice di numeri, la considera un segnale con questa frequenza di campionamento. |

## Come funziona

A ogni segnale che arriva, il blocco manda tutte le uscite insieme.

- La **durata** è `N / fs`, non `(N − 1) / fs`: è la durata di una finestra di N campioni, ognuno dei quali «occupa» un periodo `1/fs`. Il tempo dell'ultimo campione è quindi `t₀ + durata − 1/fs`.
- Con una lista semplice, **fs** vale la «fs delle liste semplici» e **t₀** vale 0.
- I tempi sono arrotondati a 12 cifre significative, per non vedere i resti del calcolo in virgola mobile.

## Un po' di teoria

Un segnale campionato è l'insieme di tre cose: i valori `x[n]`, la frequenza di campionamento `fs` e il tempo di partenza `t₀`. Da queste si ricava il resto: il passo `Ts = 1/fs`, i tempi `t[n] = t₀ + n·Ts`, la durata `T = N·Ts`. In frequenza, la stessa finestra ha **risoluzione** `Δf = fs/N = 1/T`: per distinguere due frequenze distanti 1 Hz serve guardare almeno 1 secondo di segnale. Ecco perché `fs` e `N`, insieme, contano più di `N` da solo.

## Esempi

### 1. Quanto dura una finestra

```
[Generatore (oscillatore)] segnale ──▶ segnale [Scomponi segnale] durata (s) ──▶ valore [Print (console.log)]
```

Con le impostazioni di serie del generatore (1000 campioni a 1000 Hz) scrive `1`.

### 2. Una lista semplice

La lista `[1, 2, 3, 4]` con «fs delle liste semplici» 1000 dà: **campioni** `[1, 2, 3, 4]`, **fs** `1000`, **N** `4`, **durata** `0.004`, **t₀** `0`, **tempi** `[0, 0.001, 0.002, 0.003]`, **parte immaginaria** `[]`.

### 3. Un segnale con un tempo di partenza

`{ "fs": 4, "t0": 1, "samples": [1, 2, 3, 4] }` dà **N** `4`, **durata** `1`, **t₀** `1`, **tempi** `[1, 1.25, 1.5, 1.75]`.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale manca | Su **segnale** è arrivato un valore vuoto. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | Non è né una lista né un segnale, o è un testo che non è JSON valido. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Nell'oggetto, `fs` è 0, negativa o non è un numero. |
| Il segnale: il valore N non è un numero | Un campione (il numero N) non è un numero. |
| Il segnale ha samples e im di lunghezze diverse | Nell'oggetto, `samples` e `im` non hanno la stessa lunghezza. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale ha più campioni del limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |

## Vedi anche

- [Segnale da lista](sig.fromList) per l'operazione inversa
- [Misure (RMS, picco, media)](sig.measure) per le misure del segnale
- [Riproduci campioni](sig.play) per mandarlo fuori un campione alla volta
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
