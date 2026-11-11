# Velocità

`unit.speed` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una velocità: metri al secondo, chilometri orari, miglia orarie, nodi, piedi al secondo.

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
| **Da** (`from`) | le unità della tabella sotto | km/h | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | m/s | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `km/h · m/s`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- 1 km/h = 1/3,6 m/s; il nodo è un miglio nautico all'ora (1,852 km/h).

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `m/s` | metro al secondo | unità di base |  |
| `km/h` | chilometro orario | 0,277777777777778 m/s | `kmh`, `kph` |
| `mph` | miglio orario | 0,44704 m/s |  |
| `kn` | nodo | 0,514444444444444 m/s | `kt` |
| `ft/s` | piede al secondo | 0,3048 m/s | `fps` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 100 km/h in mph

```
[Costante · Variabile: 100] valore ──▶ valore [Velocità: km/h · mph] risultato ──▶ valore [Print (console.log)]
```

Scrive `62.1371192237`.

Con **Arrotonda** e 2 **Decimali** scrive `62.14`.

### 2. 10 m/s in km/h

```
[Costante · Variabile: 10] valore ──▶ valore [Velocità: m/s · km/h] risultato ──▶ valore [Print (console.log)]
```

Scrive `36`.

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
