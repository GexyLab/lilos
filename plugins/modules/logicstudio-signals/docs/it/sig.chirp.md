# Chirp (scipy.signal.chirp)

`sig.chirp` · Segnali · [Segnali](logicstudio-signals) · versione 1

Genera un **chirp**: un seno la cui frequenza cambia nel tempo, da una frequenza iniziale a una finale, in modo lineare o logaritmico. È il segnale di prova per vedere in un colpo solo come risponde un filtro o un sistema a tutte le frequenze.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **genera** (`generate`) | impulso | Un impulso genera una nuova finestra. Se **non è collegata**, il blocco manda una finestra all'avvio del programma. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | La finestra: `{ fs, t0, samples }`. |
| **Exception** (`error`) | oggetto | Frequenza di campionamento o numero di campioni non validi, frequenze non valide per l'andamento logaritmico, segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Frequenza iniziale f₀ (Hz)** (`f0`) | 0 o più | 10 | La frequenza al primo campione. |
| **Frequenza finale f₁ (Hz)** (`f1`) | 0 o più | 200 | La frequenza raggiunta alla fine della finestra. |
| **Andamento** (`method`) | Lineare / Logaritmico | Lineare | Come cambia la frequenza nel tempo. |
| **Ampiezza** (`amplitude`) | numero | 1 | Il picco del segnale. |
| **Frequenza di campionamento fs (Hz)** (`fs`) | più di 0 | 1000 | Quanti campioni al secondo. |
| **Campioni N** (`samples`) | da 1 | 1000 | Quanti campioni ha ogni finestra; con `fs` dà la durata `T = N / fs` dello sweep. |
| **Il tempo continua (ogni finestra dopo l'ultima)** (`continue`) | sì / no | sì | Cambia solo il `t0` scritto nella finestra (vedi sotto). |

## Come funziona

- Lo **sweep** dura quanto la finestra, `T = N / fs`: la frequenza vale `f₀` al primo campione e arriva a `f₁` alla fine. Il segnale è `A·cos(2π·fase(t))` e parte con valore `A` (il coseno a fase 0).
- **Lineare**: la frequenza istantanea cresce (o cala) in modo costante, `f(t) = f₀ + (f₁ − f₀)·t / T`, e la fase è `f₀·t + (f₁ − f₀)·t² / (2T)`.
- **Logaritmico**: la frequenza cambia per rapporti costanti, `f(t) = f₀·(f₁/f₀)^(t/T)`, e la fase è `f₀·(e^(k·t) − 1) / k` con `k = ln(f₁/f₀) / T`. Con `f₀ = f₁` esce un coseno a frequenza costante.
- Se `f₁` è minore di `f₀` lo sweep scende.
- **Ogni finestra rifà lo sweep dall'inizio**: con un impulso su **genera** a ogni finestra, il segnale ricomincia da `f₀` ogni volta. **Il tempo continua** cambia solo il `t0` della finestra (il tempo scritto), non i campioni.
- Il blocco non controlla che `f₀` e `f₁` siano sotto `fs/2`: sopra quel limite c'è aliasing (vedi la teoria).

## Un po' di teoria

Un segnale con frequenza che cambia è `x(t) = A·cos(φ(t))` e la sua **frequenza istantanea** è la derivata della fase: `f(t) = (1/2π)·dφ/dt`. Nel chirp lineare `f(t)` è una retta: lo spettro è quasi piatto tra `f₀` e `f₁`, perché ogni frequenza «passa» per lo stesso tempo. Nel chirp logaritmico ogni **ottava** dura lo stesso tempo, e lo spettro cala di 3 dB per ottava (come il rumore rosa): si usa per misurare impianti audio, dove interessano le decadi di frequenza.

Per questo il chirp è il segnale classico per misurare una **risposta in frequenza**: un solo segnale attraversa tutte le frequenze, e l'ampiezza dell'uscita nel tempo dice il guadagno del sistema alla frequenza in quell'istante. Si guarda bene con uno [Spettrogramma (STFT)](sig.spectrogram) (una riga diagonale) o con la [Densità spettrale (Welch)](sig.psd).

Ricorda il limite di **Nyquist**: lo sweep deve restare sotto `fs/2`. Con `fs = 1000` e `f₁ = 800` Hz, la parte sopra 500 Hz si ripiega verso il basso (aliasing) e lo sweep sembra tornare indietro.

## Esempi

### 1. Quanto passa un filtro

Un chirp da 10 a 200 Hz di 1 secondo entra in un passa-basso; la FFT dell'uscita mostra il filtro che taglia:

```
[Chirp (scipy.signal.chirp)] segnale ──▶ segnale [Filtro IIR (butter, cheby1, cheby2)] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

### 2. Lo sweep nel tempo

Il segnale si guarda nel tempo con un [Per grafico](sig.toChart): le oscillazioni si fanno più strette man mano che la frequenza sale.

```
[Chirp (scipy.signal.chirp)] segnale ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

Con le impostazioni di serie (10→200 Hz, `fs` 1000, 1000 campioni) lo sweep dura 1 secondo.

### 3. Chirp logaritmico

Con **Andamento** logaritmico, **f₀** 20 e **f₁** 20000 e `fs` 48000, l'intervallo audio da 20 Hz a 20 kHz è coperto in modo uniforme per ottave; con **Lineare**, quasi tutto il tempo passa sopra i 1000 Hz.

## Errori

| Messaggio | Quando |
|---|---|
| La frequenza di campionamento deve essere più di 0 | **fs** è 0 o negativa. |
| Serve almeno un campione | **Campioni N** è minore di 1. |
| Con l'andamento logaritmico f₀ e f₁ devono essere più di 0 | **Logaritmico** con **f₀** o **f₁** uguale a 0 (o negativa). |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | **Campioni N** supera il limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |

## Vedi anche

- [Spettrogramma (STFT)](sig.spectrogram) per vedere la frequenza che cambia nel tempo
- [Risposta in frequenza (freqz, Bode)](sig.response)
- [Generatore (oscillatore)](sig.oscillator), [Impulso · Gradino · Rampa](sig.elementary)
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
