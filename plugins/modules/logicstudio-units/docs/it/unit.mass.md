# Massa

`unit.mass` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una massa (quello che di solito si chiama «peso»): tonnellate, chilogrammi e sottomultipli, libbre, once, stone, carati.

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
| **Da** (`from`) | le unità della tabella sotto | kg | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | lb | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `kg · lb`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- La libbra è quella internazionale: 0,45359237 kg esatti; 1 lb = 16 oz; 1 st = 14 lb.
- La tonnellata è quella metrica (1000 kg), non la «ton» americana o inglese.
- Il carato (delle pietre preziose) è 0,2 g.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `kg` | chilogrammo | unità di base |  |
| `t` | tonnellata | 1000 kg |  |
| `g` | grammo | 0,001 kg |  |
| `mg` | milligrammo | 0,000001 kg |  |
| `µg` | microgrammo | 1e−9 kg | `ug`, `μg`, `mcg` |
| `lb` | libbra | 0,45359237 kg | `lbs` |
| `oz` | oncia | 0,028349523125 kg |  |
| `st` | stone | 6,35029318 kg | `stone` |
| `ct` | carato | 0,0002 kg |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 70 kg in lb

```
[Costante · Variabile: 70] valore ──▶ valore [Massa: kg · lb] risultato ──▶ valore [Print (console.log)]
```

Scrive `154.323583529`.

Con **Arrotonda** e 2 **Decimali** scrive `154.32`.

### 2. 8 oz in g

```
[Costante · Variabile: 8] valore ──▶ valore [Massa: oz · g] risultato ──▶ valore [Print (console.log)]
```

Scrive `226.796185`.

Con **Arrotonda** e 2 **Decimali** scrive `226.8`.

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
