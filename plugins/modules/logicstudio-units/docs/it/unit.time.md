# Tempo

`unit.time` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una durata: secondi e sottomultipli, minuti, ore, giorni, settimane, anni.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore da convertire, nell'unità **Da**. Un testo con un numero (`"2,5"`, `"2.5"`) va bene. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il valore nell'unità **A**. |
| **Exception** (`error`) | oggetto | Il valore non è un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Da** (`from`) | le unità della tabella sotto | s | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | min | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `s · min`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- L'anno è quello giuliano degli astronomi, **365,25 giorni**. Il mese non c'è, perché non ha una durata fissa.
- Per le date e le ore del giorno ci sono i blocchi della categoria **Tempo** dei [Blocchi di base](logicstudio-core).

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `s` | secondo | unità di base |  |
| `ms` | millisecondo | 0,001 s |  |
| `µs` | microsecondo | 0,000001 s | `us`, `μs` |
| `ns` | nanosecondo | 1e−9 s |  |
| `min` | minuto | 60 s |  |
| `h` | ora | 3600 s |  |
| `d` | giorno | 86400 s |  |
| `wk` | settimana | 604800 s |  |
| `yr` | anno (365,25 giorni) | 31557600 s |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 90 min in h

```
[Costante · Variabile: 90] valore ──▶ valore [Tempo: min · h] risultato ──▶ valore [Print (console.log)]
```

Scrive `1.5`.

### 2. 2 d in s

```
[Costante · Variabile: 2] valore ──▶ valore [Tempo: d · s] risultato ──▶ valore [Print (console.log)]
```

Scrive `172800`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | Il valore non è un numero (per esempio un testo come `"abc"`). |
| Unità sconosciuta: «…» | Un'unità delle Proprietà non esiste in questa versione del pacchetto (uno schema fatto con una versione più nuova). |

## Vedi anche

- [Converti (da · a)](unit.convert) per scegliere le unità mentre il programma gira
- [Scrivi misura (format)](unit.format) per mostrare il risultato con la sua unità
- [Grandezze e unità](logicstudio-units), tutte le grandezze
- [Come funziona un blocco](ide/blocks)
