# Potenza

`unit.power` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una potenza: watt e multipli, cavalli vapore (metrici e britannici), BTU all'ora, chilocalorie all'ora.

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
| **Da** (`from`) | le unità della tabella sotto | kW | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | CV | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `kW · CV`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- **CV** è il cavallo vapore metrico (in tedesco PS), 735,49875 W; **hp** è il cavallo britannico (meccanico), 745,7 W circa. Le schede tecniche europee delle auto usano i CV.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `W` | watt | unità di base |  |
| `kW` | chilowatt | 1000 W |  |
| `MW` | megawatt | 1000000 W |  |
| `CV` | cavallo vapore | 735,49875 W | `PS` |
| `hp` | cavallo vapore britannico | 745,69987158227 W |  |
| `BTU/h` | BTU all'ora | 0,293071070172222 W | `Btu/h` |
| `kcal/h` | chilocaloria all'ora | 1,16222222222222 W |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 100 kW in CV

```
[Costante · Variabile: 100] valore ──▶ valore [Potenza: kW · CV] risultato ──▶ valore [Print (console.log)]
```

Scrive `135.96216173`.

Con **Arrotonda** e 2 **Decimali** scrive `135.96`.

### 2. 12000 BTU/h in kW

```
[Costante · Variabile: 12000] valore ──▶ valore [Potenza: BTU/h · kW] risultato ──▶ valore [Print (console.log)]
```

Scrive `3.51685284207`.

Con **Arrotonda** e 2 **Decimali** scrive `3.52`.

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
