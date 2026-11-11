# Temperatura

`unit.temperature` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una temperatura tra gradi Celsius, Fahrenheit, kelvin e gradi Rankine.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore da convertire, nell'unità **Da**. Un testo con un numero (`"2,5"`, `"2.5"`) va bene. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il valore nell'unità **A**. |
| **Exception** (`error`) | oggetto | Il valore non è un numero o la temperatura è sotto lo zero assoluto. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Da** (`from`) | le unità della tabella sotto | °C | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | °F | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `°C · °F`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- Queste unità **non hanno lo stesso zero**: non basta moltiplicare, il blocco usa le formule giuste (°F = °C × 9/5 + 32; K = °C + 273,15; °R = K × 9/5).
- Una temperatura **sotto lo zero assoluto** (meno di 0 K, cioè −273,15 °C o −459,67 °F) non esiste: il blocco manda un'eccezione.
- **Converte temperature, non differenze di temperatura.** Una differenza di 10 °C è una differenza di 18 °F, ma il blocco converte 10 °C in 50 °F. Per una differenza usa gradi Celsius ↔ kelvin (uguali) o moltiplica per 9/5.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `°C` | grado Celsius | K = °C + 273,15 | `C`, `degC`, `℃` |
| `°F` | grado Fahrenheit | K = (°F + 459,67) × 5/9 | `F`, `degF`, `℉` |
| `K` | kelvin | unità di base |  |
| `°R` | grado Rankine | K = °R × 5/9 | `R`, `degR` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 37 °C in °F

```
[Costante · Variabile: 37] valore ──▶ valore [Temperatura: °C · °F] risultato ──▶ valore [Print (console.log)]
```

Scrive `98.6`.

### 2. −40 °C in °F

```
[Costante · Variabile: -40] valore ──▶ valore [Temperatura: °C · °F] risultato ──▶ valore [Print (console.log)]
```

Scrive `-40`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | Il valore non è un numero (per esempio un testo come `"abc"`). |
| Temperatura sotto lo zero assoluto | Il valore è sotto 0 K (−273,15 °C, −459,67 °F, 0 °R). |
| Unità sconosciuta: «…» | Un'unità delle Proprietà non esiste in questa versione del pacchetto (uno schema fatto con una versione più nuova). |

## Vedi anche

- [Converti (da · a)](unit.convert) per scegliere le unità mentre il programma gira
- [Scrivi misura (format)](unit.format) per mostrare il risultato con la sua unità
- [Grandezze e unità](logicstudio-units), tutte le grandezze
- [Come funziona un blocco](ide/blocks)
