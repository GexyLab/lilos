# Filtro FIR (firwin)

`sig.fir` · Segnali · [Segnali](logicstudio-signals) · versione 1

Filtra un segnale con un filtro **FIR** (a risposta finita): passa-basso, passa-alto, passa-banda o elimina-banda costruiti con il metodo della **finestra** (come `firwin`), una **media mobile**, oppure **coefficienti tuoi**. Un FIR simmetrico ha **fase lineare**: tutte le frequenze sono ritardate dello stesso tempo, quindi la forma del segnale non si deforma. Il blocco dice anche quanto è il ritardo e manda i suoi coefficienti alla [Risposta in frequenza (freqz, Bode)](sig.response).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale da filtrare: un oggetto `{ fs, t0, samples }` o una lista di numeri (presa come segnale alla **fs delle liste semplici**). La parte immaginaria `im`, se c'è, viene ignorata. |
| **coefficienti** (`coefficients`) | qualsiasi | Coefficienti già pronti: una lista di numeri `b`, o un oggetto `{ b }` (o `{ b, a }` con `a = [1]`). Se c'è un valore, **vince su tutte le impostazioni** di progetto. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **azzera** (`reset`) | impulso | Riporta il filtro a zero (nessun ricordo delle finestre passate). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale filtrato, con la stessa `fs` e lo stesso `t0`. Se è arrivata una lista, esce una lista. |
| **coefficienti** (`coefficients`) | oggetto | `{ fs, b, a }`: i coefficienti `b` del filtro, `a = [1]` e la `fs` per cui è calcolato. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **ritardo (s)** (`delay`) | numero | Il ritardo del filtro in secondi: `(N − 1) / 2 / fs`, con N il numero di coefficienti. Esce a ogni finestra. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Frequenze o coefficienti non validi, segnale non valido o troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tipo** (`band`) | passa-basso, passa-alto, passa-banda, elimina-banda, media mobile, coefficienti della lista | passa-basso | Che filtro fare. |
| **Coefficienti (taps)** (`taps`) | da 1 a 4095 | 101 | Quanti coefficienti. Più sono, più il taglio è ripido e più è lungo il ritardo. Un numero pari diventa dispari (+1), tranne per la media mobile. Non si vede con **coefficienti della lista**. |
| **Frequenza di taglio (Hz)** (`f1`) | maggiore di 0 e minore di fs/2 | 100 | Il taglio; nei filtri a banda, la frequenza **bassa** della banda. Si vede solo con i quattro tipi passa/elimina. |
| **Frequenza alta (Hz)** (`f2`) | maggiore di **f1** e minore di fs/2 | 200 | La frequenza **alta** della banda. Si vede solo con **passa-banda** o **elimina-banda**. |
| **Finestra** (`window`) | Rettangolare, Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey | Hamming | La finestra che smussa i coefficienti: decide ondulazione e ripidità. Si vede solo con i quattro tipi passa/elimina. |
| **β di Kaiser** (`beta`) | da 0 a 50 | 8,6 | Il parametro della finestra di Kaiser. Si vede solo con la finestra **Kaiser**. |
| **Coefficienti b** (`list`) | lista JSON | `[0.25, 0.5, 0.25]` | I coefficienti da usare. Si vede solo con **coefficienti della lista**. |
| **Fase zero (avanti e indietro, filtfilt)** (`zeroPhase`) | sì / no | no | Filtra avanti e indietro: nessun ritardo, ma niente stato tra le finestre. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri che arriva su **segnale**. Serve anche per i coefficienti mandati all'avvio. |

## Come funziona

- I coefficienti si calcolano con la `fs` del segnale che arriva; se la `fs` o un'impostazione cambia, vengono calcolati da capo e lo stato torna a zero. Lo stesso se cambia il valore su **coefficienti**.
- **Lo stato resta tra le finestre**: finestre consecutive dello stesso segnale si uniscono senza salti. **azzera** lo riporta a zero.
- Il segnale esce **in ritardo** di `(N − 1) / 2` campioni (esce su **ritardo (s)**): l'inizio è occupato dal transitorio. Con **Fase zero** invece ogni finestra è filtrata **avanti e indietro**, con i bordi prolungati: niente ritardo, ma il filtro agisce due volte e **non tiene stato**. (**ritardo (s)** esce comunque, anche con Fase zero: in quel caso non vale.)
- **All'avvio** il blocco manda i coefficienti calcolati alla **fs delle liste semplici**, così la [Risposta in frequenza (freqz, Bode)](sig.response) li può disegnare prima del segnale. Poi li manda con il primo segnale (alla sua `fs`) e dopo ogni cambio o **azzera**.
- **Passa-basso, passa-alto, passa-banda, elimina-banda** usano una **finestra** (non rettangolare, di serie Hamming). **Media mobile** ha N coefficienti uguali a `1/N`. **Coefficienti della lista** usa la lista scritta in **Coefficienti b** (vedi anche l'ingresso **coefficienti**).
- Se arriva una lista di numeri, esce una lista; se arriva un segnale, esce un segnale.
- Se i parametri non vanno bene, l'errore arriva con il primo segnale.

## Un po' di teoria

Un filtro FIR calcola l'uscita solo dagli ingressi: `y[n] = Σ b[k]·x[n−k]`. Non ha poli (a parte l'origine), quindi è **sempre stabile**. I coefficienti `b` sono la **risposta all'impulso** del filtro: l'uscita è la [convoluzione](sig.convolve) dell'ingresso con `b`.

**Metodo della finestra**: la risposta ideale di un passa-basso è un `sinc` infinito. Se ne prendono N campioni centrati e si moltiplicano per una finestra:

`h[n] = (2·fc/fs) · sinc(2·fc/fs · (n − M)) · w[n]`, con `M = (N − 1)/2`

e poi si divide per la somma, così il guadagno a 0 Hz vale 1. Il passa-alto è `δ[n − M] − passa-basso`; il passa-banda è «passa-basso a f2 meno passa-basso a f1»; l'elimina-banda è `δ[n − M]` meno il passa-banda. Il guadagno al taglio vale circa −6 dB.

**Fase lineare**: se `b` è simmetrico, la fase è lineare e il ritardo di gruppo è costante: `(N − 1)/2` campioni, cioè `(N − 1)/(2·fs)` secondi. Per questo N è dispari (il ritardo è un numero intero di campioni). Il prezzo è il ritardo.

**Finestre**: la finestra rettangolare ha il taglio più ripido ma ondulazioni forti e poca attenuazione fuori banda; Hamming, Hann, Blackman attenuano di più al prezzo di una transizione più larga. La larghezza della transizione è circa `3,3·fs/N` con Hamming: più coefficienti, transizione più stretta. Kaiser ha il parametro β che regola il compromesso (di serie 8,6, circa 85 dB di attenuazione fuori banda).

**Media mobile**: N coefficienti uguali a `1/N`. È un passa-basso grezzo, con zeri a ogni multiplo di `fs/N`, che riduce di `√N` il rumore bianco.

## Esempi

### 1. Un passa-basso a fase lineare

`fs` = 1000 Hz, **Tipo** passa-basso, **Frequenza di taglio** 100, 101 coefficienti, Hamming:

```
[Rumore (np.random)] segnale ──▶ segnale [Filtro FIR (firwin)] segnale ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
                                         ritardo (s) ──▶ valore [Print (console.log)]
```

**ritardo (s)** manda `0.05` (50 campioni = 0,05 s). La risposta è circa 0 dB fino a 50 Hz, −6 dB a 100 Hz, −60 dB a 150 Hz.

### 2. Una media mobile di 5 valori

**Tipo** media mobile, 5 coefficienti (`0.2` ciascuno), `fs` = 1000 Hz: ritardo 2 campioni = `0.002` s. Su `[5, 5, 5, 5, 5, 5, 5]` esce `[1, 2, 3, 4, 5, 5, 5]`: l'uscita sale mentre la finestra si riempie.

### 3. Coefficienti miei

**Tipo** coefficienti della lista, **Coefficienti b** `[0.25, 0.5, 0.25]` (un lisciamento). Su `[1, 0, 0, 0]` esce `[0.25, 0.5, 0.25, 0]`: è proprio la lista, perché l'ingresso è un impulso. Gli stessi coefficienti si possono dare all'ingresso **coefficienti**, per esempio da [Costante · Variabile](core.value) o da un altro blocco.

### 4. Vedere la risposta

```
[Filtro FIR (firwin)] coefficienti ──▶ coefficienti [Risposta in frequenza (freqz, Bode)] risposta ──▶ segnale o spettro [Per grafico]
```

## Errori

| Messaggio | Quando |
|---|---|
| I coefficienti vanno da 1 a 4095 | **Coefficienti (taps)** fuori dall'intervallo. |
| La frequenza di taglio (… Hz) deve stare tra 0 e fs/2 (… Hz) | **Frequenza di taglio** (o **Frequenza alta**) non è maggiore di 0 e minore di fs/2. |
| La seconda frequenza deve essere più alta della prima | Nei filtri a banda, **Frequenza alta** non è maggiore di **Frequenza di taglio**. |
| Il filtro FIR vuole solo coefficienti b (una lista) | Sull'ingresso **coefficienti** è arrivato un filtro con `sos` o con un `a` più lungo di `[1]`. |
| I coefficienti non sono JSON valido | Su **coefficienti** è arrivato un testo che non è JSON. |
| I coefficienti devono essere una lista (FIR), { b, a } o { sos } | Su **coefficienti** (o in **Coefficienti b**) non c'è né una lista né un oggetto con `b`. |
| I coefficienti: il valore N non è un numero | Il coefficiente numero N non è un numero. |
| I coefficienti b: il valore N non è un numero | Come sopra, in un oggetto `{ b, a }`. |
| Serve almeno un coefficiente b | Un oggetto `{ b, a }` ha la lista `b` vuota. |
| Il primo coefficiente a (a0) non può essere 0 | Un oggetto `{ b, a }` con `a[0]` = 0. |
| Il segnale manca | Su **segnale** è arrivato un valore vuoto (`null`). |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | È arrivato un altro tipo di valore. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` non è maggiore di 0. |
| Il segnale ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il segnale: il valore N non è un numero | Il campione numero N non è un numero. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Risposta in frequenza (freqz, Bode)](sig.response) per disegnare modulo, fase e ritardo di gruppo
- [Filtro IIR (butter, cheby1, cheby2)](sig.iir) per tagli più ripidi con meno coefficienti (ma fase non lineare)
- [Convoluzione (np.convolve)](sig.convolve) per applicare una risposta all'impulso a un segnale intero
- [Filtro su campioni (media mobile, EMA)](sig.smooth) per lisciare valori singoli
- [Finestra (scipy.signal.get_window)](sig.window) per le finestre
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
