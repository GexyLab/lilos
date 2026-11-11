# FFT (np.fft.fft)

`sig.fft` · Segnali · [Segnali](logicstudio-signals) · versione 1

Calcola lo **spettro** di un segnale: dice quanto c'è di ogni frequenza. Usa la trasformata di Fourier veloce (FFT) e funziona con qualunque lunghezza, non solo con le potenze di 2. Il risultato è un oggetto spettro, che si può disegnare, cercarci i picchi ([Picchi](sig.peaks)) o riportare nel tempo ([IFFT](sig.ifft)).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Un segnale `{ fs, t0, samples, im? }` oppure una lista semplice di numeri (presa come segnale a **fs delle liste semplici**). Se ha la parte immaginaria (`im`) è un segnale complesso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **spettro** (`spectrum`) | oggetto | Lo spettro: `{ kind, fs, t0, n, df, sided, scale, window, f, mag, db, phase, re, im }`. `kind` vale `"spectrum"`; `n` è il numero di punti della FFT; `df` la distanza tra due frequenze (Hz); `sided` è `"one"` o `"two"`; `scale` e `window` ripetono le impostazioni usate. `f` sono le frequenze in Hz, `mag` il modulo (nella scala scelta), `db` il modulo in dB (20·log10, minimo −300), `phase` la fase in radianti, `re` e `im` la parte reale e immaginaria **grezze** della FFT. Sono liste lunghe uguali. |
| **modulo** (`magnitude`) | lista | Solo la lista `mag`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **frequenze (Hz)** (`frequencies`) | lista | Solo la lista `f`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Segnale mancante o non valido, troppo lungo, o con meno di 2 campioni. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Finestra** (`window`) | Rettangolare (nessuna), Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett (triangolare), Kaiser, Tukey | Rettangolare | La finestra che pesa i campioni prima della FFT (vedi la teoria). |
| **β di Kaiser** (`beta`) | da 0 a 50 | 8,6 | Si vede solo con la finestra **Kaiser**. Più è alto, più le code si abbassano e il picco si allarga. |
| **α di Tukey (parte che scende)** (`alpha`) | da 0 a 1 | 0,5 | Si vede solo con la finestra **Tukey**. La parte della finestra che sale e scende; 0 è rettangolare, 1 è Hann. |
| **Spettro** (`sided`) | Monolatero (0 … fs/2), Bilatero (−fs/2 … fs/2) | Monolatero | Monolatero: solo le frequenze da 0 a fs/2. Bilatero: anche quelle negative. Un segnale complesso dà **sempre** uno spettro bilatero. |
| **Scala** (`scale`) | Ampiezza, Efficace (RMS), Grezzo \|X[k]\| | Ampiezza | Ampiezza: un seno di ampiezza A dà A sulla sua frequenza. Efficace: lo stesso diviso per √2 (tranne a 0 Hz). Grezzo: il modulo della FFT senza nessuna divisione. |
| **Punti (0 = N; di più = zero-padding)** (`size`) | numero, 0 o più | 0 | Quanti punti ha la FFT. 0 è la lunghezza del segnale. Con un numero più grande il segnale è completato con zeri; con uno più piccolo viene tagliato. |
| **Arrotonda a una potenza di 2** (`pow2`) | sì / no | no | Porta i punti alla potenza di 2 successiva (1000 diventa 1024). |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri. Un segnale `{ fs, samples }` porta già la sua. |

## Come funziona

A ogni segnale che arriva, il blocco moltiplica i campioni per la finestra, completa con zeri fino a **Punti**, calcola la FFT e manda lo spettro.

- Monolatero: i punti vanno da 0 a fs/2 (N/2 + 1 valori). Bilatero: da −fs/2 a poco meno di fs/2, con lo 0 al centro.
- Nella scala **Ampiezza** il modulo è diviso per la somma della finestra e, nello spettro monolatero, raddoppiato (tranne a 0 Hz e a fs/2), così un seno di ampiezza A legge A. Per questo la scala è giusta qualunque sia la finestra, se la frequenza cade su un punto.
- **re** e **im** sono i valori grezzi: servono a [IFFT](sig.ifft) per tornare al segnale.
- Per mostrare lo spettro basta collegarlo a [Per grafico](sig.toChart), che sceglie da solo modulo e frequenze.

## Un po' di teoria

La **trasformata discreta di Fourier** (DFT) di N campioni è `X[k] = Σ x[n]·e^(−i2πkn/N)`, per k = 0 … N−1. Il valore X[k] dice quanto c'è del segnale alla frequenza `f_k = k·fs/N`. La FFT è solo un modo veloce di calcolare la stessa cosa, in circa N·log N operazioni invece di N².

- **Risoluzione**: la distanza tra due punti è `Δf = fs/N`. Per distinguere due frequenze vicine servono più campioni, cioè una registrazione più lunga: `Δf = 1 / durata`.
- **Nyquist**: con campioni a frequenza fs si vedono solo le frequenze fino a **fs/2**. Un tono più alto si ripiega (aliasing) e appare a una frequenza più bassa.
- **Segnale reale**: lo spettro è simmetrico (le frequenze negative sono il riflesso di quelle positive), perciò basta metà: è lo spettro monolatero.
- **Dispersione spettrale (leakage)**: la FFT suppone che i campioni siano un periodo di un segnale che si ripete. Se la finestra non contiene un numero intero di periodi, il salto tra la fine e l'inizio sparge l'energia sulle frequenze vicine. Una **finestra** (Hann, Hamming, Blackman…) porta i bordi verso zero e riduce la dispersione, al prezzo di un picco un po' più largo. La Flat-top dà l'ampiezza più precisa; la Rettangolare il picco più stretto.
- **Zero-padding**: aggiungere zeri non aggiunge informazione e **non migliora la risoluzione**; infittisce i punti e rende il picco più liscio da leggere.

## Esempi

### 1. Lo spettro di un seno

```
[Generatore (oscillatore)] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

Con un seno di 50 Hz e ampiezza 2, a fs 1000 Hz e 1000 campioni, `Δf` è 1 Hz e il punto a 50 Hz vale `2`. Il decibel è 6,02 (20·log10 2).

### 2. Meno dispersione con una finestra

Un seno di 50,3 Hz non cade su un punto della griglia. Con la finestra **Rettangolare** il picco è basso e le code salgono lontano; con **Hann** le code scendono molto più in fretta.

```
[Generatore (oscillatore): 50,3 Hz] segnale ──▶ segnale [FFT (np.fft.fft): Hann] spettro ──▶ dati [Picchi (find_peaks)] posizione ──▶ valore [Print (console.log)]
```

I picchi interpolano tra i punti: la posizione esce vicina a 50,3 Hz.

### 3. Più punti, stessa risoluzione

Un segnale di 1000 campioni con **Arrotonda a una potenza di 2** dà 1024 punti: `df` passa da 1 a 0,9765625 Hz, ma due toni più vicini di 1 Hz restano confusi.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale manca | Arriva un valore vuoto. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero singolo, un testo che non è JSON o un oggetto senza `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` manca o non è maggiore di 0. |
| Il segnale: il valore N non è un numero | Il campione N (da 1) della lista non è un numero. |
| Il segnale ha samples e im di lunghezze diverse | La parte immaginaria ha un numero di campioni diverso. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale, o i **Punti** della FFT, superano il limite `signalSamples` (65536 di serie). Vedi [i limiti](logicstudio-engine/limits). |
| Servono almeno 2 campioni | Il segnale ha meno di 2 campioni. |
| Finestra sconosciuta: … | La finestra scelta nelle Proprietà non esiste (può succedere con una configurazione scritta a mano). |

## Vedi anche

- [IFFT (np.fft.ifft)](sig.ifft) per tornare dallo spettro al segnale
- [Densità spettrale (scipy.signal.welch)](sig.psd) per uno spettro mediato di un segnale rumoroso
- [Spettrogramma (STFT)](sig.spectrogram) per vedere come lo spettro cambia nel tempo
- [Picchi (find_peaks)](sig.peaks) per trovare le frequenze principali
- [Finestra (scipy.signal.get_window)](sig.window) per applicare una finestra a parte
- [Per grafico](sig.toChart) per disegnare lo spettro
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
