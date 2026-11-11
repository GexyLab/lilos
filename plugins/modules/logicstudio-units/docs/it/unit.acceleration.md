# Accelerazione

`unit.acceleration` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte un'accelerazione: metri al secondo quadrato, accelerazione di gravità standard, piedi al secondo quadrato, gal.

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
| **Da** (`from`) | le unità della tabella sotto | m/s² | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | gn | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `m/s² · gn`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- **gn** è l'accelerazione di gravità standard, 9,80665 m/s² (quella dei «g» di un'auto o di un aereo). Il simbolo non è «g» per non confonderlo con il grammo.
- Il **Gal** (con la G maiuscola, 1 cm/s²) si usa in geofisica; non c'entra con il gallone.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `m/s²` | metro al secondo quadrato | unità di base | `m/s2`, `m/s^2` |
| `gn` | accelerazione di gravità standard | 9,80665 m/s² | `g0` |
| `ft/s²` | piede al secondo quadrato | 0,3048 m/s² | `ft/s2`, `ft/s^2` |
| `Gal` | gal (cm/s²) | 0,01 m/s² |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 3 gn in m/s²

```
[Costante · Variabile: 3] valore ──▶ valore [Accelerazione: gn · m/s²] risultato ──▶ valore [Print (console.log)]
```

Scrive `29.41995`.

Con **Arrotonda** e 2 **Decimali** scrive `29.42`.

### 2. 20 m/s² in gn

```
[Costante · Variabile: 20] valore ──▶ valore [Accelerazione: m/s² · gn] risultato ──▶ valore [Print (console.log)]
```

Scrive `2.03943242596`.

Con **Arrotonda** e 2 **Decimali** scrive `2.04`.

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
