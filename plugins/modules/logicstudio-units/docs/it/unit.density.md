# Densità

`unit.density` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una densità (massa per volume): chilogrammi al metro cubo, grammi al centimetro cubo, chilogrammi e grammi al litro, libbre al piede cubo.

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
| **Da** (`from`) | le unità della tabella sotto | kg/m³ | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | g/cm³ | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `kg/m³ · g/cm³`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- 1 g/cm³ = 1 kg/L = 1000 kg/m³; 1 g/L = 1 kg/m³. L'acqua è circa 1 g/cm³.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `kg/m³` | chilogrammo al metro cubo | unità di base | `kg/m3` |
| `g/cm³` | grammo al centimetro cubo | 1000 kg/m³ | `g/cm3`, `g/cc` |
| `kg/L` | chilogrammo al litro | 1000 kg/m³ | `kg/l` |
| `g/L` | grammo al litro | 1 kg/m³ | `g/l` |
| `lb/ft³` | libbra al piede cubo | 16,0184633739601 kg/m³ | `lb/ft3` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 7,85 g/cm³ in kg/m³

```
[Costante · Variabile: 7.85] valore ──▶ valore [Densità: g/cm³ · kg/m³] risultato ──▶ valore [Print (console.log)]
```

Scrive `7850`.

### 2. 62,4 lb/ft³ in kg/m³

```
[Costante · Variabile: 62.4] valore ──▶ valore [Densità: lb/ft³ · kg/m³] risultato ──▶ valore [Print (console.log)]
```

Scrive `999.552114535`.

Con **Arrotonda** e 2 **Decimali** scrive `999.55`.

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
