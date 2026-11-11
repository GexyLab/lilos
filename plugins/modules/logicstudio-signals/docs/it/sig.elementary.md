# Impulso · Gradino · Rampa

`sig.elementary` · Segnali · [Segnali](logicstudio-signals) · versione 1

Genera i segnali elementari della teoria dei sistemi: impulso, gradino, rampa, esponenziale decrescente, rettangolo, sinc e gaussiana. Sono i segnali con cui si «interroga» un filtro o un sistema per vedere come risponde.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **genera** (`generate`) | impulso | Un impulso genera una nuova finestra. Se **non è collegata**, il blocco manda una finestra all'avvio del programma. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | La finestra: `{ fs, t0, samples }`. |
| **Exception** (`error`) | oggetto | Frequenza di campionamento, numero di campioni o larghezza non validi, segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tipo** (`kind`) | Impulso δ / Gradino u(t) / Rampa / Esponenziale decrescente / Rettangolo / Sinc / Gaussiana | Impulso δ | Quale segnale generare. |
| **Al tempo (s)** (`at`) | numero | 0 | L'istante dell'impulso, dell'inizio del gradino, della rampa e dell'esponenziale, e il **centro** di rettangolo, sinc e gaussiana. |
| **Ampiezza** (`amplitude`) | numero | 1 | L'altezza (per la rampa: la pendenza, cioè quanto sale ogni secondo). |
| **Larghezza o costante di tempo τ (s)** (`width`) | più di 0 | 0,1 | La larghezza o la costante di tempo. Si vede solo con Esponenziale, Rettangolo, Sinc e Gaussiana. |
| **Frequenza di campionamento fs (Hz)** (`fs`) | più di 0 | 1000 | Quanti campioni al secondo. |
| **Campioni N** (`samples`) | da 1 | 1000 | Quanti campioni ha ogni finestra. |
| **Il tempo continua (ogni finestra dopo l'ultima)** (`continue`) | sì / no | sì | Con sì, ogni finestra comincia dove è finita la precedente (`t0` cresce); con no, ogni finestra comincia a `t0 = 0`. |

## Come funziona

Il campione `i` è calcolato al tempo `t = t0 + i / fs`, e `ta` è il valore di **Al tempo**. Con `A` ampiezza e `w` la larghezza:

| Tipo | Valore del campione |
|---|---|
| Impulso δ | `A` nel campione più vicino a `ta`, 0 negli altri |
| Gradino u(t) | 0 prima di `ta`, `A` da `ta` in poi |
| Rampa | 0 prima di `ta`, `A·(t − ta)` da `ta` in poi |
| Esponenziale decrescente | 0 prima di `ta`, `A·e^(−(t−ta)/w)` da `ta` in poi |
| Rettangolo | `A` quando `abs(t − ta) ≤ w/2`, 0 altrove |
| Sinc | `A·sinc((t−ta)/w)`, con `sinc(x) = sin(πx)/(πx)` e `sinc(0) = 1` |
| Gaussiana | `A·e^(−½·((t−ta)/w)²)` (`w` è la deviazione standard) |

- L'impulso è **un solo campione** di altezza `A` (non un impulso di area 1): compare solo nella finestra che contiene il tempo `ta`. Con **Il tempo continua**, le finestre dopo sono tutte a zero.
- Il gradino (e la rampa, e l'esponenziale) cominciano dal campione più vicino a `ta`; nelle finestre dopo quella in cui cominciano restano accesi.
- Se `ta` è prima dell'inizio della finestra, il gradino è già acceso fin dal primo campione.
- Con Esponenziale, Rettangolo, Sinc e Gaussiana `w` deve essere più di 0; con le altre forme il campo **Larghezza** non conta.

## Un po' di teoria

- L'**impulso unitario** `δ[n]` è 1 per `n = 0` e 0 altrove. In un sistema lineare e invariante nel tempo (LTI) la **risposta all'impulso** `h[n]` descrive il sistema per intero: l'uscita a un ingresso qualsiasi è la **convoluzione** `y = x * h` (vedi [Convoluzione](sig.convolve)). Per questo mandare un impulso a un filtro e guardare cosa esce è il modo più diretto di conoscerlo.
- Il **gradino** `u[n]` è la somma cumulata dell'impulso: la **risposta al gradino** mostra come il sistema si assesta (sovraelongazione, tempo di salita). La **rampa** è la somma cumulata del gradino.
- L'**esponenziale decrescente** `e^(−t/τ)` è la risposta all'impulso di un filtro passa-basso del primo ordine (circuito RC). Dopo `τ` il valore è sceso a circa il 37 %; la frequenza di taglio vale `1/(2π·τ)`.
- Rettangolo e **sinc** sono una coppia di trasformate di Fourier: un rettangolo largo `w` nel tempo ha come spettro una sinc con zeri ogni `1/w` Hz, e viceversa. Più è stretto un segnale nel tempo, più è largo il suo spettro (**principio di indeterminazione**).
- La **gaussiana** è l'unica forma che ha come spettro ancora una gaussiana, ed è la più compatta possibile nel tempo e in frequenza insieme.

## Esempi

### 1. La risposta di un filtro all'impulso

```
[Impulso · Gradino · Rampa] segnale ──▶ segnale [Filtro IIR (butter, cheby1, cheby2)] segnale ──▶ segnale [Per grafico] dati del grafico ──▶ dati [Linee]
```

Con **Tipo** impulso, **Al tempo** 0 e **fs** 1000, il primo campione vale `A` e gli altri 0; il filtro risponde con la sua risposta all'impulso, che il grafico mostra.

### 2. Cosa esce con fs = 10 e 6 campioni

- Impulso a 0,2 s: `0; 0; 1; 0; 0; 0` (il campione 2 è a 0,2 s).
- Rampa a 0,2 s con ampiezza 1: `0; 0; 0; 0,1; 0,2; 0,3`.
- Esponenziale con τ = 0,1 s: `1; 0,3679; 0,1353; 0,0498; 0,0183; 0,0067`.
- Rettangolo largo 0,2 s centrato a 0,2 s: `0; 1; 1; 1; 0; 0`.

### 3. Un impulso e il suo spettro

L'impulso ha uno spettro piatto (tutte le frequenze con la stessa ampiezza):

```
[Impulso · Gradino · Rampa] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

## Errori

| Messaggio | Quando |
|---|---|
| La frequenza di campionamento deve essere più di 0 | **fs** è 0 o negativa. |
| Serve almeno un campione | **Campioni N** è minore di 1. |
| La larghezza deve essere più di 0 | Con Esponenziale, Rettangolo, Sinc o Gaussiana, **Larghezza** è 0 o negativa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | **Campioni N** supera il limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |

## Vedi anche

- [Convoluzione (np.convolve)](sig.convolve) per usare la risposta all'impulso
- [Risposta in frequenza (freqz, Bode)](sig.response) per la risposta di un filtro senza simulare
- [Generatore (oscillatore)](sig.oscillator), [Chirp (scipy.signal.chirp)](sig.chirp)
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
