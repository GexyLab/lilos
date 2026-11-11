# Dati

`unit.data` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una quantità di dati: bit, byte e multipli decimali (kB, MB…) e binari (KiB, MiB…).

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
| **Da** (`from`) | le unità della tabella sotto | MB | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | MiB | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `MB · MiB`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- **kB, MB, GB, TB** sono decimali (1 kB = 1000 B); **KiB, MiB, GiB, TiB** sono binari (1 KiB = 1024 B). Molti sistemi scrivono «GB» intendendo GiB: un disco da 500 GB è 465,66 GiB.
- 1 B = 8 bit. **kbit, Mbit, Gbit** sono in bit (si scrivono anche kb, Mb, Gb, con la b minuscola).

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `bit` | bit | unità di base |  |
| `B` | byte | 8 bit | `byte` |
| `kB` | kilobyte (1000 B) | 8000 bit |  |
| `MB` | megabyte (1000 kB) | 8000000 bit |  |
| `GB` | gigabyte (1000 MB) | 8000000000 bit |  |
| `TB` | terabyte (1000 GB) | 8000000000000 bit |  |
| `KiB` | kibibyte (1024 B) | 8192 bit |  |
| `MiB` | mebibyte (1024 KiB) | 8388608 bit |  |
| `GiB` | gibibyte (1024 MiB) | 8589934592 bit |  |
| `TiB` | tebibyte (1024 GiB) | 8796093022208 bit |  |
| `kbit` | kilobit | 1000 bit | `kb` |
| `Mbit` | megabit | 1000000 bit | `Mb` |
| `Gbit` | gigabit | 1000000000 bit | `Gb` |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 500 GB in GiB

```
[Costante · Variabile: 500] valore ──▶ valore [Dati: GB · GiB] risultato ──▶ valore [Print (console.log)]
```

Scrive `465.661287308`.

Con **Arrotonda** e 2 **Decimali** scrive `465.66`.

### 2. 1 MiB in kB

```
[Costante · Variabile: 1] valore ──▶ valore [Dati: MiB · kB] risultato ──▶ valore [Print (console.log)]
```

Scrive `1048.576`.

Con **Arrotonda** e 2 **Decimali** scrive `1048.58`.

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
