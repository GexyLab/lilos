# Frequenza

`unit.frequency` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una frequenza o una velocità di rotazione: hertz e multipli, giri al minuto, radianti al secondo.

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
| **Da** (`from`) | le unità della tabella sotto | Hz | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | rpm | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `Hz · rpm`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- 1 Hz = 60 giri/min = 2π rad/s.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `Hz` | hertz | unità di base |  |
| `kHz` | kilohertz | 1000 Hz |  |
| `MHz` | megahertz | 1000000 Hz |  |
| `GHz` | gigahertz | 1000000000 Hz |  |
| `rpm` | giri al minuto | 0,0166666666666667 Hz | `giri/min` |
| `rad/s` | radiante al secondo | 0,159154943091895 Hz |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 3000 rpm in Hz

```
[Costante · Variabile: 3000] valore ──▶ valore [Frequenza: rpm · Hz] risultato ──▶ valore [Print (console.log)]
```

Scrive `50`.

### 2. 2,4 GHz in MHz

```
[Costante · Variabile: 2.4] valore ──▶ valore [Frequenza: GHz · MHz] risultato ──▶ valore [Print (console.log)]
```

Scrive `2400`.

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
