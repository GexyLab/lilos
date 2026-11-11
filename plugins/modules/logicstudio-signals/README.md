# logicstudio-signals

I blocchi di Logic Studio per la **teoria dei segnali**, tutti nella categoria «Segnali».

Un segnale viaggia **a finestre di campioni**, non un messaggio per campione: un oggetto `{ fs, t0, samples }` (frequenza di campionamento in Hz, tempo del primo campione in secondi, i campioni; `im` per la parte immaginaria di un segnale complesso). Anche una lista di numeri è un segnale, alla «fs delle liste semplici» del blocco. Il segnale più lungo è un limite del motore (Pannello di controllo → Logic Studio → Limiti, 65.536 campioni di serie).

- **Generazione**: Generatore (seno, quadra, triangolo, dente di sega, treno di impulsi), Rumore (bianco gaussiano o uniforme, rosa, marrone, con seme), Impulso · Gradino · Rampa (anche esponenziale, rettangolo, sinc, gaussiana), Chirp (lineare o logaritmico).
- **Segnale ↔ dati**: Segnale da lista, Scomponi segnale, Buffer (valori singoli → finestre, con sovrapposizione), Riproduci campioni (una finestra → un valore alla volta), Per grafico (segnali e spettri → dati per i Grafici).
- **Operazioni nel tempo**: Somma · Prodotto di segnali, Guadagno · Offset, Finestra (Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey), Ritardo · Taglia · Zero-padding, Ricampiona (sinc a finestra con anti-aliasing), Quantizza (ADC), Non linearità.
- **Frequenza**: FFT (qualsiasi lunghezza, mono o bilatera, scala in ampiezza), IFFT, Densità spettrale (Welch), Spettrogramma (STFT, per la Mappa di calore), Picchi (con interpolazione), Goertzel (toni e tasti DTMF).
- **Filtri**: Filtro IIR (Butterworth, Chebyshev I e II; passa-basso, passa-alto, passa-banda, elimina-banda; sezioni biquad), Biquad (RBJ: anche notch, picco, shelf, passa-tutto), Filtro FIR (a finestra, media mobile, coefficienti dati), Filtro su campioni (EMA, media e mediana mobili), Equazione alle differenze (`lfilter`), Risposta in frequenza (modulo, fase, ritardo di gruppo, poli e zeri, stabilità). I filtri tengono lo stato tra una finestra e la successiva; «Fase zero» filtra avanti e indietro.
- **Correlazione**: Convoluzione (completa, stessa lunghezza, valida, circolare), Correlazione e autocorrelazione (con il ritardo stimato).
- **Misure**: Misure (RMS, picco, media, picco-picco, fattore di cresta, potenza, energia, dB), Distorsione (THD, SNR, SINAD, ENOB), Frequenza · Periodo (passaggi per lo zero, autocorrelazione, FFT), Inviluppo (trasformata di Hilbert: fase e frequenza istantanee), dB ↔ lineare (anche dBm, dBV, dBu).
- **Modulazione**: Modula e Demodula (AM, DSB-SC, FM, PM).

La matematica è tutta in `lib/dsp.js`, senza librerie esterne: FFT radix-2 e di Bluestein, prototipi analogici con trasformazioni di frequenza e trasformata bilineare, sezioni del secondo ordine.

Gli errori (segnale troppo lungo, frequenza oltre fs/2, segnali con fs diverse…) escono dalla porta «Exception» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine` (dalla 1.5.0 per il limite regolabile; con un motore più vecchio il limite è 65.536).
