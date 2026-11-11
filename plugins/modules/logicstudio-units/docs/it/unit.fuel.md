# Consumo di carburante

`unit.fuel` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte un consumo di carburante: litri per 100 km, chilometri al litro, miglia per gallone USA e imperiale.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore da convertire, nell'unità **Da**. Un testo con un numero (`"2,5"`, `"2.5"`) va bene. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il valore nell'unità **A**. |
| **Exception** (`error`) | oggetto | Il valore non è un numero o il consumo è 0 o negativo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Da** (`from`) | le unità della tabella sotto | L/100km | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | km/L | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `L/100km · km/L`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- Queste unità sono **una l'inverso dell'altra**: con L/100km meno è meglio, con km/L e mpg più è meglio. Il blocco usa le formule giuste (km/L = 100 / L/100km), non un fattore.
- Per lo stesso motivo un consumo di **0 o negativo** non si può convertire: il blocco manda un'eccezione (anche da L/100km a L/100km, così il risultato non cambia secondo l'unità di arrivo).
- **mpg US** e **mpg UK** usano galloni diversi: 30 mpg UK sono circa 25 mpg US.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `L/100km` | litri per 100 km | unità di base | `l/100km`, `L/100 km`, `l/100 km` |
| `km/L` | chilometri al litro | L/100km = 100 / km/L | `km/l` |
| `mpg US` | miglia per gallone USA | L/100km ≈ 235,215 / mpg US | `mpg` |
| `mpg UK` | miglia per gallone imperiale | L/100km ≈ 282,481 / mpg UK |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 6,5 L/100km in km/L

```
[Costante · Variabile: 6.5] valore ──▶ valore [Consumo di carburante: L/100km · km/L] risultato ──▶ valore [Print (console.log)]
```

Scrive `15.3846153846`.

Con **Arrotonda** e 2 **Decimali** scrive `15.38`.

### 2. 35 mpg US in L/100km

```
[Costante · Variabile: 35] valore ──▶ valore [Consumo di carburante: mpg US · L/100km] risultato ──▶ valore [Print (console.log)]
```

Scrive `6.72041666667`.

Con **Arrotonda** e 2 **Decimali** scrive `6.72`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | Il valore non è un numero (per esempio un testo come `"abc"`). |
| Il consumo deve essere maggiore di zero | Il valore è 0 o negativo. |
| Unità sconosciuta: «…» | Un'unità delle Proprietà non esiste in questa versione del pacchetto (uno schema fatto con una versione più nuova). |

## Vedi anche

- [Converti (da · a)](unit.convert) per scegliere le unità mentre il programma gira
- [Scrivi misura (format)](unit.format) per mostrare il risultato con la sua unità
- [Grandezze e unità](logicstudio-units), tutte le grandezze
- [Come funziona un blocco](ide/blocks)
