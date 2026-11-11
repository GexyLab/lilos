# Lunghezza

`unit.length` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una lunghezza (o una distanza) da un'unità a un'altra: metri e multipli, pollici, piedi, iarde, miglia, miglia nautiche.

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
| **Da** (`from`) | le unità della tabella sotto | m | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | ft | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `m · ft`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- Pollice, piede, iarda e miglio sono quelli internazionali del 1959: 1 in è **esattamente** 2,54 cm.
- Il miglio nautico è di 1852 m esatti.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `m` | metro | unità di base |  |
| `km` | chilometro | 1000 m |  |
| `cm` | centimetro | 0,01 m |  |
| `mm` | millimetro | 0,001 m |  |
| `µm` | micrometro | 0,000001 m | `um`, `μm` |
| `nm` | nanometro | 1e−9 m |  |
| `in` | pollice | 0,0254 m |  |
| `ft` | piede | 0,3048 m |  |
| `yd` | iarda | 0,9144 m |  |
| `mi` | miglio | 1609,344 m |  |
| `nmi` | miglio nautico | 1852 m | `NM` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 5 mi in km

```
[Costante · Variabile: 5] valore ──▶ valore [Lunghezza: mi · km] risultato ──▶ valore [Print (console.log)]
```

Scrive `8.04672`.

Con **Arrotonda** e 2 **Decimali** scrive `8.05`.

### 2. 180 cm in ft

```
[Costante · Variabile: 180] valore ──▶ valore [Lunghezza: cm · ft] risultato ──▶ valore [Print (console.log)]
```

Scrive `5.90551181102`.

Con **Arrotonda** e 2 **Decimali** scrive `5.91`.

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
