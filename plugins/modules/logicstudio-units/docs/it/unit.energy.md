# Energia

`unit.energy` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte un'energia: joule e multipli, wattora e chilowattora, calorie e chilocalorie, BTU, elettronvolt.

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
| **Da** (`from`) | le unità della tabella sotto | kWh | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | MJ | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `kWh · MJ`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- La caloria è quella **termochimica**, 4,184 J; la «Caloria» delle etichette degli alimenti è la chilocaloria (kcal).
- Il BTU è quello «International Table», 1055,05585262 J; 1 kWh = 3,6 MJ.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `J` | joule | unità di base |  |
| `kJ` | kilojoule | 1000 J |  |
| `MJ` | megajoule | 1000000 J |  |
| `Wh` | wattora | 3600 J |  |
| `kWh` | chilowattora | 3600000 J |  |
| `cal` | caloria | 4,184 J |  |
| `kcal` | chilocaloria | 4184 J | `Cal` |
| `BTU` | unità termica britannica | 1055,05585262 J | `Btu` |
| `eV` | elettronvolt | 1,602176634e−19 J |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 2000 kcal in kWh

```
[Costante · Variabile: 2000] valore ──▶ valore [Energia: kcal · kWh] risultato ──▶ valore [Print (console.log)]
```

Scrive `2.32444444444`.

Con **Arrotonda** e 2 **Decimali** scrive `2.32`.

### 2. 1 kWh in MJ

```
[Costante · Variabile: 1] valore ──▶ valore [Energia: kWh · MJ] risultato ──▶ valore [Print (console.log)]
```

Scrive `3.6`.

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
