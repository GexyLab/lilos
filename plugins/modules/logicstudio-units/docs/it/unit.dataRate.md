# Velocità dei dati

`unit.dataRate` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte una velocità di trasmissione dei dati: bit al secondo e multipli, byte al secondo e multipli.

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
| **Da** (`from`) | le unità della tabella sotto | Mbit/s | L'unità in cui arriva il valore. |
| **A** (`to`) | le unità della tabella sotto | MB/s | L'unità in cui va convertito. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

A ogni valore che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **risultato**. Sotto il titolo il blocco mostra le due unità scelte, per esempio `Mbit/s · MB/s`.

Il risultato è arrotondato a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono (`0.30000000000000004` diventa `0.3`). Con **Arrotonda** puoi tenere meno decimali.

Le unità si scelgono nelle Proprietà. Per sceglierle mentre il programma gira (da un menu, da un file) usa [Converti (da · a)](unit.convert).

- Le connessioni si misurano in **bit** al secondo (Mbit/s), gli scaricamenti spesso in **byte** al secondo (MB/s): 1 B/s = 8 bit/s.

## Le unità

| Simbolo | Unità | Vale | Si scrive anche |
|---|---|---|---|
| `bit/s` | bit al secondo | unità di base | `bps` |
| `kbit/s` | kilobit al secondo | 1000 bit/s | `kbps`, `kb/s` |
| `Mbit/s` | megabit al secondo | 1000000 bit/s | `Mbps`, `Mb/s` |
| `Gbit/s` | gigabit al secondo | 1000000000 bit/s | `Gbps`, `Gb/s` |
| `B/s` | byte al secondo | 8 bit/s |  |
| `kB/s` | kilobyte al secondo | 8000 bit/s |  |
| `MB/s` | megabyte al secondo | 8000000 bit/s |  |
| `GB/s` | gigabyte al secondo | 8000000000 bit/s |  |
| `MiB/s` | mebibyte al secondo | 8388608 bit/s |  |

La colonna **Si scrive anche** vale per [Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse), che ricevono le unità come testo.

## Esempi

### 1. 100 Mbit/s in MB/s

```
[Costante · Variabile: 100] valore ──▶ valore [Velocità dei dati: Mbit/s · MB/s] risultato ──▶ valore [Print (console.log)]
```

Scrive `12.5`.

### 2. 25 MB/s in Mbit/s

```
[Costante · Variabile: 25] valore ──▶ valore [Velocità dei dati: MB/s · Mbit/s] risultato ──▶ valore [Print (console.log)]
```

Scrive `200`.

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
