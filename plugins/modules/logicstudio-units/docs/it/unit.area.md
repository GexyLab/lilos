# Superficie

`unit.area` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una superficie: metri quadrati e multipli, ettari, are, pollici, piedi, iarde e miglia quadrate, acri.

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
| **Da** (`from`) | le unità della tabella sotto | m² | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | ft² | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `m² · ft²`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- 1 ha = 10000 m², 1 a (ara) = 100 m².
- L'acro è quello internazionale: 4046,8564224 m².

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `m²` | metro quadrato | unità di base | `m2`, `m^2`, `mq` |
| `km²` | chilometro quadrato | 1000000 m² | `km2`, `km^2` |
| `cm²` | centimetro quadrato | 0,0001 m² | `cm2`, `cm^2` |
| `mm²` | millimetro quadrato | 0,000001 m² | `mm2`, `mm^2` |
| `ha` | ettaro | 10000 m² |  |
| `a` | ara | 100 m² |  |
| `in²` | pollice quadrato | 0,00064516 m² | `in2`, `sq in` |
| `ft²` | piede quadrato | 0,09290304 m² | `ft2`, `sq ft` |
| `yd²` | iarda quadrata | 0,83612736 m² | `yd2`, `sq yd` |
| `ac` | acro | 4046,8564224 m² | `acre` |
| `mi²` | miglio quadrato | 2589988,110336 m² | `mi2`, `sq mi` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 2,5 ha in m²

```
[Costante · Variabile: 2.5] valore ──▶ valore [Superficie: ha · m²] risultato ──▶ valore [Print (console.log)]
```

Scrive `25000`.

### 2. 1000 ft² in m²

```
[Costante · Variabile: 1000] valore ──▶ valore [Superficie: ft² · m²] risultato ──▶ valore [Print (console.log)]
```

Scrive `92.90304`.

Con **Arrotonda** e 2 **Decimali** scrive `92.9`.

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
