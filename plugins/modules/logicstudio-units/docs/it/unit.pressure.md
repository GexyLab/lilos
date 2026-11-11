# Pressione

`unit.pressure` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una pressione: pascal e multipli, bar, millibar, atmosfere, psi, millimetri e pollici di mercurio, torr, metri d'acqua.

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
| **Da** (`from`) | le unità della tabella sotto | bar | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | psi | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `bar · psi`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- 1 bar = 100000 Pa; 1 hPa = 1 mbar; 1 atm = 101325 Pa = 760 Torr.
- mmHg, inHg e mH₂O sono i valori convenzionali (mercurio a 0 °C, acqua a 4 °C con la gravità standard).
- Il blocco **non distingue** la pressione assoluta da quella relativa (quella dei manometri, «bar g», «psig»): converte il numero così com'è.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `Pa` | pascal | unità di base |  |
| `hPa` | ettopascal | 100 Pa |  |
| `kPa` | kilopascal | 1000 Pa |  |
| `MPa` | megapascal | 1000000 Pa |  |
| `bar` | bar | 100000 Pa |  |
| `mbar` | millibar | 100 Pa |  |
| `atm` | atmosfera standard | 101325 Pa |  |
| `psi` | libbra per pollice quadrato | 6894,75729316836 Pa |  |
| `mmHg` | millimetro di mercurio | 133,322387415 Pa |  |
| `Torr` | torr | 133,322368421053 Pa | `torr` |
| `inHg` | pollice di mercurio | 3386,389 Pa |  |
| `mH₂O` | metro d'acqua | 9806,65 Pa | `mH2O` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 2,2 bar in psi

```
[Costante · Variabile: 2.2] valore ──▶ valore [Pressione: bar · psi] risultato ──▶ valore [Print (console.log)]
```

Scrive `31.9083023006`.

Con **Arrotonda** e 2 **Decimali** scrive `31.91`.

### 2. 1013,25 hPa in mmHg

```
[Costante · Variabile: 1013.25] valore ──▶ valore [Pressione: hPa · mmHg] risultato ──▶ valore [Print (console.log)]
```

Scrive `759.999891726`.

Con **Arrotonda** e 2 **Decimali** scrive `760`.

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
