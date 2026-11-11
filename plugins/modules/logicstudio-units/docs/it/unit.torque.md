# Coppia

`unit.torque` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una coppia (momento di una forza): newton metro, chilogrammi forza metro, libbre forza piede e pollice.

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
| **Da** (`from`) | le unità della tabella sotto | N·m | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | lbf·ft | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `N·m · lbf·ft`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- Le chiavi dinamometriche e le schede dei motori usano N·m o lbf·ft (si scrive anche lb·ft o ft·lbf).

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `N·m` | newton metro | unità di base | `Nm`, `N*m`, `N m`, `N.m` |
| `kgf·m` | chilogrammo forza metro | 9,80665 N·m | `kgfm`, `kgf*m`, `kgm` |
| `lbf·ft` | libbra forza piede | 1,3558179483314 N·m | `lbft`, `lb·ft`, `ft·lbf`, `lbf*ft` |
| `lbf·in` | libbra forza pollice | 0,112984829027617 N·m | `lbin`, `lb·in`, `in·lbf`, `lbf*in` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 120 N·m in lbf·ft

```
[Costante · Variabile: 120] valore ──▶ valore [Coppia: N·m · lbf·ft] risultato ──▶ valore [Print (console.log)]
```

Scrive `88.5074579133`.

Con **Arrotonda** e 2 **Decimali** scrive `88.51`.

### 2. 25 kgf·m in N·m

```
[Costante · Variabile: 25] valore ──▶ valore [Coppia: kgf·m · N·m] risultato ──▶ valore [Print (console.log)]
```

Scrive `245.16625`.

Con **Arrotonda** e 2 **Decimali** scrive `245.17`.

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
