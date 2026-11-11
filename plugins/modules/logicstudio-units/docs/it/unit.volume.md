# Volume

`unit.volume` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte un volume o una capacità: metri e centimetri cubi, litri e sottomultipli, pollici e piedi cubi, galloni, quarti, pinte e once liquide USA e imperiali.

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
| **Da** (`from`) | le unità della tabella sotto | L | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | gal US | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `L · gal US`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- 1 L = 1 dm³ = 1000 cm³; 1 mL = 1 cm³.
- Le unità **USA** e **imperiali (UK)** sono diverse e si scelgono a parte: 1 gal US = 3,785411784 L, 1 gal UK = 4,54609 L.
- Quarto e pinta USA sono quelli per i liquidi (1/4 e 1/8 di gallone USA); la pinta imperiale è 1/8 di gallone imperiale. L'oncia liquida USA è 1/128 di gallone USA, quella imperiale 1/160 di gallone imperiale.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `m³` | metro cubo | unità di base | `m3`, `m^3`, `mc` |
| `L` | litro | 0,001 m³ | `l` |
| `dL` | decilitro | 0,0001 m³ | `dl` |
| `cL` | centilitro | 0,00001 m³ | `cl` |
| `mL` | millilitro | 0,000001 m³ | `ml` |
| `cm³` | centimetro cubo | 0,000001 m³ | `cm3`, `cc` |
| `in³` | pollice cubo | 0,000016387064 m³ | `in3` |
| `ft³` | piede cubo | 0,028316846592 m³ | `ft3` |
| `gal US` | gallone USA | 0,003785411784 m³ |  |
| `gal UK` | gallone imperiale | 0,00454609 m³ |  |
| `qt US` | quarto USA | 0,000946352946 m³ |  |
| `pt US` | pinta USA | 0,000473176473 m³ |  |
| `pt UK` | pinta imperiale | 0,00056826125 m³ |  |
| `fl oz US` | oncia liquida USA | 0,0000295735295625 m³ |  |
| `fl oz UK` | oncia liquida imperiale | 0,0000284130625 m³ |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 1 gal US in L

```
[Costante · Variabile: 1] valore ──▶ valore [Volume: gal US · L] risultato ──▶ valore [Print (console.log)]
```

Scrive `3.785411784`.

Con **Arrotonda** e 2 **Decimali** scrive `3.79`.

### 2. 500 mL in fl oz US

```
[Costante · Variabile: 500] valore ──▶ valore [Volume: mL · fl oz US] risultato ──▶ valore [Print (console.log)]
```

Scrive `16.9070113509`.

Con **Arrotonda** e 2 **Decimali** scrive `16.91`.

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
