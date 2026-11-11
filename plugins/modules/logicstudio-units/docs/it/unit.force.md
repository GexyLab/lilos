# Forza

`unit.force` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una forza: newton, kilonewton, dine, chilogrammi forza, libbre forza.

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
| **Da** (`from`) | le unità della tabella sotto | N | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | kgf | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `N · kgf`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- 1 kgf (o kp) è il peso di 1 kg con la gravità standard: 9,80665 N. 1 lbf = 4,4482216152605 N.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `N` | newton | unità di base |  |
| `kN` | kilonewton | 1000 N |  |
| `dyn` | dina | 0,00001 N |  |
| `kgf` | chilogrammo forza | 9,80665 N | `kp` |
| `lbf` | libbra forza | 4,4482216152605 N |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 10 kgf in N

```
[Costante · Variabile: 10] valore ──▶ valore [Forza: kgf · N] risultato ──▶ valore [Print (console.log)]
```

Scrive `98.0665`.

Con **Arrotonda** e 2 **Decimali** scrive `98.07`.

### 2. 500 N in lbf

```
[Costante · Variabile: 500] valore ──▶ valore [Forza: N · lbf] risultato ──▶ valore [Print (console.log)]
```

Scrive `112.40447155`.

Con **Arrotonda** e 2 **Decimali** scrive `112.4`.

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
