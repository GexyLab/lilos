# Densità spettrale (scipy.signal.welch)

`sig.psd` · Segnali · [Segnali](logicstudio-signals) · versione 1

Calcola la **densità spettrale di potenza** (PSD) con il **metodo di Welch**: taglia il segnale in segmenti che si sovrappongono, calcola lo spettro di ognuno e ne fa la **media**. È lo strumento giusto per un segnale con rumore: il risultato è molto più liscio e affidabile di una sola FFT.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Un segnale `{ fs, t0, samples }` oppure una lista semplice di numeri (presa come segnale a **fs delle liste semplici**). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **PSD** (`psd`) | oggetto | `{ kind, fs, df, scaling, segments, f, psd, db }`. `kind` vale `"psd"`; `df` è la distanza tra due frequenze (Hz); `scaling` è `"density"` o `"spectrum"`; `segments` è quanti segmenti sono stati mediati; `f` sono le frequenze da 0 a fs/2; `psd` i valori; `db` i valori in dB (10·log10, minimo −300). |
| **potenza totale** (`power`) | numero | La potenza del segnale: la somma dei valori (moltiplicata per `df` nella scala Densità). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Segnale mancante o non valido, troppo lungo, con meno di 2 campioni, o segmento non valido. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Segmento (campioni)** (`segment`) | 2 o più | 256 | Quanti campioni ha ogni segmento. Se il segnale è più corto, il segmento diventa lungo quanto il segnale. |
| **Sovrapposizione (%)** (`overlap`) | da 0 a 99 | 50 | Di quanto un segmento si sovrappone al precedente. |
| **Finestra** (`window`) | Rettangolare, Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey | Hann | La finestra applicata a ogni segmento. |
| **β di Kaiser** (`beta`) | da 0 a 50 | 8,6 | Si vede solo con la finestra **Kaiser**. |
| **α di Tukey (parte che scende)** (`alpha`) | da 0 a 1 | 0,5 | Si vede solo con la finestra **Tukey**. |
| **Scala** (`scaling`) | Densità (unità²/Hz), Spettro di potenza (unità²) | Densità | Densità: la potenza per ogni Hz. Spettro di potenza: la potenza in ogni punto (un seno di ampiezza A dà A²/2 sul suo punto). |
| **Detrend** (`detrend`) | Togli la media di ogni segmento, No | Togli la media | Toglie la componente continua da ogni segmento prima di calcolarne lo spettro. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri. |

## Come funziona

1. Il segnale è diviso in segmenti di **Segmento** campioni; ogni segmento parte `Segmento · (1 − Sovrapposizione/100)` campioni dopo il precedente. I campioni finali che non bastano per un segmento intero sono lasciati fuori.
2. Ogni segmento perde la media (se **Detrend**), è moltiplicato per la finestra e passa nella FFT.
3. Si calcola la potenza di ogni frequenza, raddoppiata (tranne 0 Hz e fs/2) perché lo spettro è monolatero, e si fa la media tra i segmenti.

La risoluzione è `Δf = fs / Segmento`: i segmenti corti dànno una curva liscia ma poco dettagliata, quelli lunghi più dettaglio e più rumore. L'integrale della densità (cioè **potenza totale**) è la potenza media del segnale: un seno di ampiezza 1 dà circa 0,5.

## Un po' di teoria

Per un segnale con rumore, una sola FFT è una stima molto disturbata: il valore di ogni punto oscilla in modo casuale, e l'oscillazione **non diminuisce** allungando il segnale. Il metodo di Welch riduce questa varianza facendo la **media** di K spettri: l'oscillazione scende di circa `1/√K`. Si paga con la risoluzione, perché ogni segmento è più corto del segnale intero.

- **Densità** (unità²/Hz): per il rumore bianco è piatta e non dipende da quanti punti si usano. La potenza in una banda è l'area sotto la curva.
- **Spettro di potenza** (unità²): il valore di un punto è la potenza in quel punto; è comodo per leggere l'ampiezza di un tono (A²/2).
- **Sovrapposizione**: con una finestra che va a zero ai bordi (Hann), i campioni vicini ai bordi pesano poco; sovrapporre del 50% li fa contare in un segmento vicino e dà più segmenti senza allungare il segnale.
- **dB**: per la potenza `dB = 10·log10(P)` (per l'ampiezza sarebbe 20·log10).

## Esempi

### 1. La PSD di un tono

Un seno di 100 Hz, ampiezza 1, 4096 campioni a fs 1000 Hz, con le impostazioni predefinite: 31 segmenti, `df` = 3,90625 Hz, **potenza totale** circa 0,5.

```
[Generatore (oscillatore)] segnale ──▶ segnale [Densità spettrale (scipy.signal.welch)] PSD ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

[Per grafico](sig.toChart) disegna da solo la PSD in valori lineari (con **Mostra** = Decibel la vedi in dB).

### 2. Rumore e picco

Un tono sepolto nel rumore: in una sola FFT il picco si perde nelle oscillazioni; con più segmenti il fondo si appiattisce e il picco emerge.

```
[Somma · Prodotto di segnali] segnale ──▶ segnale [Densità spettrale (scipy.signal.welch)] PSD ──▶ dati [Picchi (find_peaks)] posizione ──▶ valore [Print (console.log)]
[Generatore (oscillatore)] segnale ──▶ a [Somma · Prodotto di segnali]
[Rumore (np.random)] segnale ──▶ b [Somma · Prodotto di segnali]
```

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale manca | Arriva un valore vuoto. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero singolo, un testo che non è JSON o un oggetto senza `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` manca o non è maggiore di 0. |
| Il segnale: il valore N non è un numero | Il campione N (da 1) della lista non è un numero. |
| Il segnale ha samples e im di lunghezze diverse | La parte immaginaria ha un numero di campioni diverso. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite `signalSamples` (65536 di serie). Vedi [i limiti](logicstudio-engine/limits). |
| Servono almeno 2 campioni | Il segnale ha meno di 2 campioni. |
| Il segmento deve avere almeno 2 campioni | **Segmento** è minore di 2. |
| Finestra sconosciuta: … | La finestra scelta nelle Proprietà non esiste (configurazione scritta a mano). |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft) per lo spettro di un solo blocco di campioni, con fase
- [Spettrogramma (STFT)](sig.spectrogram) per vedere lo spettro cambiare nel tempo
- [Picchi (find_peaks)](sig.peaks) per trovare le frequenze principali (accetta anche la PSD)
- [Rumore (np.random)](sig.noise) per provare il blocco
- [Per grafico](sig.toChart) per disegnare la PSD
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
