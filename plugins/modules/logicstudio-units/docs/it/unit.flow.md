# Portata

`unit.flow` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una portata (volume che passa in un tempo): metri cubi al secondo e all'ora, litri al secondo, al minuto e all'ora, galloni USA al minuto.

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
| **Da** (`from`) | le unità della tabella sotto | L/min | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | m³/h | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `L/min · m³/h`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- Il gallone di **gal/min** è quello USA.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `m³/s` | metro cubo al secondo | unità di base | `m3/s` |
| `m³/h` | metro cubo all'ora | 0,000277777777777778 m³/s | `m3/h` |
| `L/s` | litro al secondo | 0,001 m³/s | `l/s` |
| `L/min` | litro al minuto | 0,0000166666666666667 m³/s | `l/min`, `lpm` |
| `L/h` | litro all'ora | 2,77777777777778e−7 m³/s | `l/h` |
| `gal/min` | gallone USA al minuto | 0,0000630901964 m³/s | `gpm` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 12 L/min in m³/h

```
[Costante · Variabile: 12] valore ──▶ valore [Portata: L/min · m³/h] risultato ──▶ valore [Print (console.log)]
```

Scrive `0.72`.

### 2. 5 gal/min in L/min

```
[Costante · Variabile: 5] valore ──▶ valore [Portata: gal/min · L/min] risultato ──▶ valore [Print (console.log)]
```

Scrive `18.92705892`.

Con **Arrotonda** e 2 **Decimali** scrive `18.93`.

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
