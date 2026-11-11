# Spettrogramma (STFT)

`sig.spectrogram` · Segnali · [Segnali](logicstudio-signals) · versione 1

Mostra **come cambia lo spettro nel tempo**. Il segnale è tagliato in finestre brevi che si sovrappongono, di ognuna si calcola lo spettro (trasformata di Fourier a breve termine, STFT) e il risultato è una **griglia in dB** pronta per la [Mappa di calore](charts.heatmap): il tempo scorre da sinistra a destra, la frequenza sale dal basso verso l'alto. È ideale per una voce, un fischio che sale (chirp), un tasto del telefono.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Un segnale `{ fs, t0, samples }` oppure una lista semplice di numeri (presa come segnale a **fs delle liste semplici**). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **griglia (dB) per Mappa di calore** (`grid`) | oggetto | `{ rows, cols, values }`. `rows` sono i nomi delle righe: le frequenze in Hz (come testo, 4 cifre significative), **dalla più alta alla più bassa**. `cols` sono i nomi delle colonne: i tempi in secondi (al centro di ogni finestra). `values` è la lista delle righe, ognuna con un valore in dB per colonna. Si collega direttamente alla [Mappa di calore](charts.heatmap). |
| **tempi (s)** (`times`) | lista | I tempi del centro di ogni finestra, in secondi, come numeri. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **frequenze (Hz)** (`frequencies`) | lista | Le frequenze da 0 a fs/2, **dalla più bassa alla più alta**, come numeri. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Segnale mancante o non valido, troppo lungo, segmento non valido, griglia troppo grande. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Segmento (campioni)** (`segment`) | 2 o più | 256 | La lunghezza di ogni finestra, in campioni. Se il segnale è più corto, diventa lungo quanto il segnale. |
| **Sovrapposizione (%)** (`overlap`) | da 0 a 99 | 50 | Di quanto una finestra si sovrappone alla precedente. |
| **Finestra** (`window`) | Rettangolare, Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey | Hann | La finestra applicata a ogni segmento. |
| **β di Kaiser** (`beta`) | da 0 a 50 | 8,6 | Si vede solo con la finestra **Kaiser**. |
| **α di Tukey (parte che scende)** (`alpha`) | da 0 a 1 | 0,5 | Si vede solo con la finestra **Tukey**. |
| **Intervallo mostrato (dB sotto il massimo)** (`range`) | da 10 a 300 | 100 | Tutti i valori più bassi di (massimo − intervallo) sono portati a quel livello, così i colori della mappa non si sprecano sul fondo. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri. |

## Come funziona

- Le finestre sono `Segmento` campioni; la prossima parte `Segmento · (1 − Sovrapposizione/100)` campioni dopo (almeno 1). Le finestre intere sono `⌊(N − Segmento)/passo⌋ + 1`; i campioni finali che non bastano per una finestra sono lasciati fuori.
- Ogni finestra è moltiplicata per la finestra scelta e passa nella FFT. Il valore di ogni cella è la **densità di potenza** della finestra, in dB (10·log10), come nella [densità spettrale](sig.psd) ma senza media.
- Le righe vanno **dalla frequenza più alta a 0**: nella mappa di calore le basse frequenze stanno quindi in basso, come in ogni spettrogramma.
- Il massimo di tutta la griglia fissa il livello più alto; i valori sono arrotondati a 0,01 dB.
- La griglia ha `finestre × (Segmento/2 + 1)` celle e non può superare **4 volte il limite** `signalSamples` (262144 di serie). Se è troppo grande, allunga il segmento o riduci la sovrapposizione.

## Un po' di teoria

La trasformata di Fourier dice quali frequenze ci sono, ma non **quando**. La STFT calcola lo spettro su finestre brevi che scorrono: `S[m, k] = Σ x[n]·w[n − m·passo]·e^(−i2πkn/L)`. Il quadrato del modulo, in dB, è lo **spettrogramma**.

C'è un compromesso inevitabile tra tempo e frequenza:

- una finestra **lunga** distingue bene due frequenze vicine (`Δf = fs/Segmento` piccolo) ma sfoca nel tempo;
- una finestra **corta** localizza bene un evento nel tempo ma ha frequenze poco nette.

Non esiste una scelta migliore in assoluto: dipende dal segnale. Un tono stabile vuole finestre lunghe; un colpo secco, finestre corte. La **sovrapposizione** non migliora la risoluzione: rende solo la mappa più liscia nel tempo e fa pesare di più i campioni ai bordi, che la finestra attenua. Il solito 50% con Hann è un buon punto di partenza.

## Esempi

### 1. Un tono nel tempo

```
[Generatore (oscillatore)] segnale ──▶ segnale [Spettrogramma (STFT)] griglia (dB) per Mappa di calore ──▶ dati [Mappa di calore]
```

Con un seno di 100 Hz, 4096 campioni a fs 1000 Hz e le impostazioni predefinite: 31 finestre e 129 righe. La prima riga è `500`, la seconda `496.1`; la prima colonna `0.128` s. Nella mappa si vede una riga orizzontale accesa a 100 Hz.

### 2. Un fischio che sale

Un [Chirp](sig.chirp) che va da 50 a 400 Hz in pochi secondi disegna nella mappa una diagonale che sale. Con un segmento di 128 campioni la diagonale è più netta nel tempo; con 512 è più netta in frequenza.

```
[Chirp (scipy.signal.chirp)] segnale ──▶ segnale [Spettrogramma (STFT)] griglia (dB) per Mappa di calore ──▶ dati [Mappa di calore]
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
| Il segmento deve avere almeno 2 campioni | **Segmento** è minore di 2. |
| Servono almeno 2 campioni | Il segnale ha meno di 2 campioni. |
| Spettrogramma troppo grande: … × … celle, al massimo … (allunga il segmento o riduci la sovrapposizione) | Le celle (finestre × righe) superano 4 volte il limite `signalSamples`. |
| Finestra sconosciuta: … | La finestra scelta nelle Proprietà non esiste (configurazione scritta a mano). |

## Vedi anche

- [Mappa di calore](charts.heatmap) per disegnare la griglia
- [FFT (np.fft.fft)](sig.fft) per lo spettro di un solo blocco di campioni
- [Densità spettrale (scipy.signal.welch)](sig.psd) per lo spettro medio nel tempo
- [Chirp (scipy.signal.chirp)](sig.chirp) per provare il blocco
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
