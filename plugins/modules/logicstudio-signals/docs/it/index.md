# Segnali

`logicstudio-signals` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per la **teoria dei segnali**: generare segnali (seno, quadra, rumore, chirp…), guardarli in frequenza (FFT, densità spettrale, spettrogramma), filtrarli (IIR, FIR, biquad) e vedere la risposta dei filtri, confrontarli (convoluzione, correlazione), misurarli (RMS, THD, SNR, frequenza) e modularli (AM, FM, PM).

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-signals` («Logic Studio: i blocchi per la teoria dei segnali…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Segnali**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## Come viaggia un segnale

Un segnale non passa un campione alla volta: un messaggio porta **una finestra di campioni**, un oggetto così:

```
{ fs: 1000, t0: 0, samples: [0, 0.31, 0.59, …] }
```

- `fs` è la **frequenza di campionamento** in Hz: quanti campioni al secondo.
- `t0` è il **tempo del primo campione**, in secondi. I generatori lo fanno avanzare da una finestra all'altra, così le finestre si mettono in fila.
- `samples` sono i campioni. Un segnale **complesso** ha anche `im`, la parte immaginaria, della stessa lunghezza.

Anche una **lista di numeri** è un segnale: ogni blocco che riceve un segnale ha l'impostazione **fs delle liste semplici** (1000 Hz di serie), la frequenza di campionamento da dare alle liste. Molti blocchi, se ricevono una lista, rispondono con una lista.

Perché a finestre? Il motore fa al massimo un certo numero di esecuzioni al secondo ([Limiti](logicstudio-engine/limits)): un messaggio per campione andrebbe bene solo per segnali lentissimi. Per i valori che arrivano uno alla volta (un sensore, MQTT, un [Intervallo (setInterval)](core.every)) c'è [Buffer (campioni → finestre)](sig.buffer), che li raccoglie in finestre; [Riproduci campioni](sig.play) fa il contrario.

Gli **spettri** sono oggetti con le frequenze `f` e i valori: lo spettro della [FFT](sig.fft) (`mag`, `db`, `phase`…), la densità spettrale di [Welch](sig.psd) (`psd`, `db`) e la risposta di un filtro ([Risposta in frequenza](sig.response): `mag`, `db`, `phase`, `groupDelay`). [Per grafico](sig.toChart) trasforma segnali e spettri nei dati dei [Grafici](logicstudio-charts).

### Quanto può essere lungo

Un segnale ha al massimo **65.536 campioni** di serie. Un amministratore può cambiare il limite in **Pannello di controllo → Logic Studio → Limiti**, alla voce **Campioni per segnale, al massimo** (da 1024 a 1.048.576). Un segnale più lungo fa uscire un'eccezione «Segnale troppo lungo».

## I blocchi

### Generazione

Ognuno manda una finestra all'avvio, oppure a ogni impulso su **genera** quando è collegato. Nelle Proprietà: frequenza di campionamento, numero di campioni e **Il tempo continua**.

| Blocco | Cosa fa |
|---|---|
| [Generatore (oscillatore)](sig.oscillator) | Seno, quadra (con duty cycle), triangolo, dente di sega, treno di impulsi; frequenza, ampiezza, fase e offset |
| [Rumore (np.random)](sig.noise) | Rumore bianco gaussiano o uniforme, rosa (1/f), marrone (1/f²); con un seme per ripeterlo uguale |
| [Impulso · Gradino · Rampa](sig.elementary) | I segnali elementari: impulso δ, gradino, rampa, esponenziale, rettangolo, sinc, gaussiana |
| [Chirp (scipy.signal.chirp)](sig.chirp) | Un seno che sale (o scende) di frequenza, lineare o logaritmico |

### Segnale ↔ dati

| Blocco | Cosa fa |
|---|---|
| [Segnale da lista](sig.fromList) | Fa un segnale da una lista di numeri, con fs e t₀ |
| [Scomponi segnale](sig.info) | Campioni, fs, N, durata, tempi, parte immaginaria |
| [Buffer (campioni → finestre)](sig.buffer) | Raccoglie valori singoli in finestre di N campioni, anche sovrapposte |
| [Riproduci campioni](sig.play) | Manda i campioni di una finestra uno alla volta (al massimo 100 al secondo) |
| [Per grafico](sig.toChart) | Segnali e spettri → dati per un grafico, anche più serie |

### Operazioni nel tempo

| Blocco | Cosa fa |
|---|---|
| [Somma · Prodotto di segnali](sig.combine) | Somma, sottrae, moltiplica, divide, media, minimo, massimo campione per campione |
| [Guadagno · Offset](sig.gain) | Guadagno (anche in dB), offset, inversione, toglie la media, normalizza |
| [Finestra (scipy.signal.get_window)](sig.window) | Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey |
| [Ritardo · Taglia · Zero-padding](sig.edit) | Ritarda, scorre in cerchio, taglia, aggiunge zeri, inverte il tempo, ripete |
| [Ricampiona (resample)](sig.resample) | Cambia fs: sinc a finestra con anti-aliasing, lineare, mantieni |
| [Quantizza (ADC)](sig.quantize) | Come un convertitore analogico-digitale: bit, intervallo, codici, errore, SQNR |
| [Non linearità (clip, raddrizza)](sig.nonlinear) | Saturazione netta o morbida, raddrizzatori, zona morta, quadrato, segno |

### Frequenza

| Blocco | Cosa fa |
|---|---|
| [FFT (np.fft.fft)](sig.fft) | Lo spettro: monolatero o bilatero, in ampiezza, RMS o grezzo, con finestra e zero-padding |
| [IFFT (np.fft.ifft)](sig.ifft) | Dallo spettro di nuovo al segnale |
| [Densità spettrale (scipy.signal.welch)](sig.psd) | La PSD con il metodo di Welch: segmenti sovrapposti e mediati |
| [Spettrogramma (STFT)](sig.spectrogram) | Lo spettro che cambia nel tempo, per la Mappa di calore |
| [Picchi (find_peaks)](sig.peaks) | I picchi di uno spettro (o di un segnale), con frequenza interpolata |
| [Goertzel (toni, DTMF)](sig.goertzel) | L'ampiezza di poche frequenze, e i tasti del telefono (DTMF) |

### Filtri

I filtri tengono lo **stato** da una finestra alla successiva: un flusso di finestre si filtra senza salti. All'avvio mandano i loro **coefficienti**, che [Risposta in frequenza](sig.response) disegna anche prima di qualsiasi segnale.

| Blocco | Cosa fa |
|---|---|
| [Filtro IIR (butter, cheby1, cheby2)](sig.iir) | Butterworth, Chebyshev I e II: passa-basso, passa-alto, passa-banda, elimina-banda, ordine 1–20, anche a fase zero |
| [Biquad (RBJ, equalizzatore)](sig.biquad) | Una sezione del secondo ordine: anche notch, picco, shelf e passa-tutto |
| [Filtro FIR (firwin)](sig.fir) | A finestra, media mobile o coefficienti dati; fase lineare |
| [Filtro su campioni (media mobile, EMA)](sig.smooth) | Per valori singoli o segnali: esponenziale, media e mediana mobili |
| [Equazione alle differenze (lfilter)](sig.difference) | Un filtro qualsiasi dai coefficienti b e a |
| [Risposta in frequenza (freqz, Bode)](sig.response) | Modulo, fase, ritardo di gruppo, poli, zeri e stabilità di un filtro |

### Convoluzione e correlazione

| Blocco | Cosa fa |
|---|---|
| [Convoluzione (np.convolve)](sig.convolve) | Completa, stessa lunghezza, valida o circolare |
| [Correlazione (np.correlate)](sig.correlate) | Correlazione e autocorrelazione, con il ritardo stimato tra due segnali |

### Misure

| Blocco | Cosa fa |
|---|---|
| [Misure (RMS, picco, media)](sig.measure) | RMS, picco, media, minimo, massimo, picco-picco, deviazione standard, fattore di cresta, potenza, energia, dB |
| [Distorsione (THD, SNR, SINAD)](sig.distortion) | Distorsione armonica, rumore, ENOB di un tono |
| [Frequenza · Periodo](sig.frequency) | La frequenza di un segnale periodico, con tre metodi |
| [Inviluppo (scipy.signal.hilbert)](sig.envelope) | Inviluppo, fase e frequenza istantanee, segnale analitico |
| [dB ↔ lineare](sig.db) | Decibel di ampiezza e di potenza, dBm, dBV, dBu |

### Modulazione

| Blocco | Cosa fa |
|---|---|
| [Modula (AM, FM, PM)](sig.modulate) | AM con portante, DSB-SC, FM, PM |
| [Demodula (AM, FM, PM)](sig.demodulate) | Riporta il messaggio: con le stesse impostazioni di Modula |

## Un primo esempio

Lo spettro di un'onda quadra a 50 Hz: le armoniche dispari (150, 250, 350 Hz…) con ampiezza che cala come 1/n.

```
[Generatore (oscillatore): quadra 50 Hz] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

Con **Mostra: Decibel** in [Per grafico](sig.toChart) si vedono bene anche le armoniche piccole.

Altri esempi sono nelle pagine dei blocchi: un sensore rumoroso ripulito ([Buffer](sig.buffer) e [Filtro IIR](sig.iir)), un messaggio modulato e demodulato in AM ([Modula](sig.modulate)), il ritardo tra due segnali ([Correlazione](sig.correlate)).

## Errori

Gli errori (segnale troppo lungo, frequenza oltre fs/2, segnali con fs diverse, coefficienti sbagliati…) escono dalla porta **Exception** del blocco, o vanno nella console principale se non è collegata. I messaggi sono nella pagina di ogni blocco.

## Vedi anche

- [Grafici](logicstudio-charts), per disegnare segnali, spettri e spettrogrammi
- [Liste e matrici](logicstudio-collections), per lavorare sulle liste di campioni
- [Costanti](logicstudio-constants) (π, e…)
- [Limiti](logicstudio-engine/limits), compreso **Campioni per segnale**
- [Come funziona un blocco](ide/blocks)
