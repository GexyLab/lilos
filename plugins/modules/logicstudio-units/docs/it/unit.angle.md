# Angolo

`unit.angle` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte un angolo: radianti, gradi, primi, secondi d'arco, gradienti centesimali (gon), giri.

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
| **Da** (`from`) | le unità della tabella sotto | ° | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | rad | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `° · rad`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- 1 giro = 360° = 2π rad = 400 gon; 1° = 60′; 1′ = 60″.
- Seno e coseno di [Funzioni Math](core.math) vogliono l'angolo **in radianti**: per un angolo in gradi metti prima questo blocco, da **°** a **rad**.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `rad` | radiante | unità di base |  |
| `°` | grado | 0,0174532925199433 rad | `deg` |
| `′` | primo | 0,000290888208665722 rad | `'`, `arcmin` |
| `″` | secondo d'arco | 0,00000484813681109536 rad | `"`, `arcsec` |
| `gon` | gradiente centesimale | 0,015707963267949 rad | `grad` |
| `rev` | giro | 6,28318530717959 rad | `turn` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 90 ° in rad

```
[Costante · Variabile: 90] valore ──▶ valore [Angolo: ° · rad] risultato ──▶ valore [Print (console.log)]
```

Scrive `1.57079632679`.

Con **Arrotonda** e 2 **Decimali** scrive `1.57`.

### 2. 0,5 rev in °

```
[Costante · Variabile: 0.5] valore ──▶ valore [Angolo: rev · °] risultato ──▶ valore [Print (console.log)]
```

Scrive `180`.

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
