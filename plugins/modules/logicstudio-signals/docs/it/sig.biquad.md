# Biquad (RBJ, equalizzatore)

`sig.biquad` · Segnali · [Segnali](logicstudio-signals) · versione 1

Un solo filtro del **secondo ordine** (biquad) con le formule dell'«Audio EQ Cookbook» di Robert Bristow-Johnson (RBJ): passa-basso, passa-alto, passa-banda, notch, picco (campana), shelf basso, shelf alto e passa-tutto. Si sceglie la frequenza, il fattore **Q** e, per picco e shelf, il guadagno in dB. È il mattone degli equalizzatori: con più blocchi in fila si fa un equalizzatore a più bande. Tiene lo stato tra una finestra e la successiva e manda i suoi **coefficienti** per la [Risposta in frequenza (freqz, Bode)](sig.response).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale da filtrare: un oggetto `{ fs, t0, samples }` o una lista di numeri (presa come segnale alla **fs delle liste semplici**). La parte immaginaria `im`, se c'è, viene ignorata. |
| **azzera** (`reset`) | impulso | Riporta il filtro a zero. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale filtrato, con la stessa `fs` e lo stesso `t0`. Se è arrivata una lista, esce una lista. |
| **coefficienti** (`coefficients`) | oggetto | `{ fs, sos, b, a }`: la sezione `[b0, b1, b2, 1, a1, a2]` (`sos`, con una sola sezione), i coefficienti `b` e `a` e la `fs` per cui è calcolato. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Frequenza o Q non validi, segnale non valido o troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tipo** (`kind`) | passa-basso, passa-alto, passa-banda, notch (elimina una frequenza), picco (campana), shelf basso, shelf alto, passa-tutto | passa-basso | La forma della risposta. |
| **Frequenza (Hz)** (`frequency`) | maggiore di 0 e minore di fs/2 | 100 | La frequenza di taglio, o il centro della banda, del notch, del picco; per gli shelf la frequenza di mezzo. |
| **Q** (`q`) | da 0,01 a 100 | 0,7071 | Quanto è stretta (o risonante) la risposta. 0,7071 (= 1/√2) dà un filtro piatto come un Butterworth. |
| **Guadagno (dB)** (`gain`) | numero (positivo alza, negativo abbassa) | 6 | Di quanti dB alza o abbassa. Si vede solo con **picco**, **shelf basso** e **shelf alto**. |
| **Fase zero (avanti e indietro, filtfilt)** (`zeroPhase`) | sì / no | no | Filtra avanti e indietro: nessun ritardo di fase, ma niente stato tra le finestre. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri che arriva su **segnale**. Serve anche per i coefficienti mandati all'avvio. |

## Come funziona

- Il filtro usa la `fs` del segnale che arriva; se la `fs` o un'impostazione cambia, viene calcolato da capo e lo stato torna a zero.
- **Lo stato resta tra le finestre**: finestre consecutive si uniscono senza salti. **azzera** lo riporta a zero.
- Con **Fase zero** ogni finestra è filtrata **avanti e indietro** (con i bordi prolungati) e **non tiene stato**; il filtro agisce due volte, quindi il guadagno in dB raddoppia (un picco di 6 dB diventa 12 dB).
- **All'avvio** il blocco manda i coefficienti calcolati alla **fs delle liste semplici**, così la [Risposta in frequenza (freqz, Bode)](sig.response) li può disegnare prima del segnale. Poi li manda con il primo segnale (alla sua `fs`) e dopo ogni cambio o **azzera**.
- Se arriva una lista di numeri, esce una lista; se arriva un segnale, esce un segnale.
- Se i parametri non vanno bene, l'errore arriva con il primo segnale.

I guadagni, misurati con `fs` = 48000 Hz, **Frequenza** 1000 Hz, Q = 0,7071 e guadagno 6 dB:

| Tipo | A 10 Hz | A 1000 Hz | A 10000 Hz |
|---|---|---|---|
| passa-basso | 0 dB | −3 dB | −43 dB |
| passa-alto | −77 dB | −3 dB | 0 dB |
| passa-banda | −36 dB | 0 dB | −18 dB |
| notch | 0 dB | molto basso | −0,06 dB |
| passa-tutto | 0 dB | 0 dB | 0 dB |
| shelf basso | +6 dB | +3 dB | 0 dB |
| shelf alto | 0 dB | +3 dB | +6 dB |

## Un po' di teoria

Un biquad è un filtro con due poli e due zeri: `y[n] = b0·x[n] + b1·x[n−1] + b2·x[n−2] − a1·y[n−1] − a2·y[n−2]`, cioè `H(z) = (b0 + b1·z⁻¹ + b2·z⁻²) / (1 + a1·z⁻¹ + a2·z⁻²)`. Con le formule RBJ, i coefficienti vengono da

- `ω0 = 2π·f/fs` (la frequenza in radianti per campione),
- `α = sin(ω0) / (2·Q)`,
- `A = 10^(guadagno/40)` (per picco e shelf).

Per esempio il passa-basso ha `b = [(1−cos ω0)/2, 1−cos ω0, (1−cos ω0)/2]` e `a = [1+α, −2·cos ω0, 1−α]`, tutto diviso per `a0 = 1+α`.

**Il fattore Q**:

- nel passa-basso e nel passa-alto, Q = 0,7071 dà la risposta più piatta (come un Butterworth del secondo ordine); un Q più alto alza un picco di risonanza vicino alla frequenza;
- nel passa-banda e nel notch, Q è il rapporto tra la frequenza centrale e la larghezza della banda: la larghezza a −3 dB è circa `f/Q`. Q alto vuol dire banda stretta;
- nel picco, Q regola la larghezza della campana; al centro il guadagno è esattamente quello scelto;
- negli shelf, il guadagno scelto si raggiunge lontano dalla frequenza; alla **Frequenza** vale metà dei dB.

Il **passa-tutto** non cambia il modulo (guadagno 1 a ogni frequenza) ma cambia la fase: serve per correggere la fase di altri filtri. Il biquad è stabile finché Q > 0 e la frequenza sta sotto fs/2.

## Esempi

### 1. Togliere il ronzio a 50 Hz

`fs` = 1000 Hz, **Tipo** notch, **Frequenza** 50, **Q** 10 (banda di circa 5 Hz):

```
[Rumore (np.random)] segnale ──▶ a [Somma · Prodotto di segnali] segnale ──▶ segnale [Biquad (RBJ, equalizzatore)] segnale ──▶ segnale o spettro [Per grafico]
[Generatore (oscillatore): 50 Hz] segnale ──▶ b
```

La sinusoide a 50 Hz sparisce (dopo un breve transitorio) e il resto resta quasi uguale.

### 2. Un equalizzatore a tre bande

Tre biquad in fila: shelf basso a 100 Hz (+4 dB), picco a 1000 Hz (−3 dB, Q 1), shelf alto a 8000 Hz (+2 dB), con `fs` = 48000 Hz:

```
[Biquad: shelf basso] segnale ──▶ segnale [Biquad: picco] segnale ──▶ segnale [Biquad: shelf alto] segnale ──▶ segnale [Per grafico]
```

Per un picco di +6 dB a 1000 Hz con Q = 1, a 48000 Hz i coefficienti sono `[1,04395; −1,89532; 0,86772; 1; −1,89532; 0,91168]` e il guadagno a 1000 Hz è 6 dB.

### 3. Vedere la risposta

```
[Biquad (RBJ, equalizzatore)] coefficienti ──▶ coefficienti [Risposta in frequenza (freqz, Bode)] risposta ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
```

## Errori

| Messaggio | Quando |
|---|---|
| La frequenza (… Hz) deve stare tra 0 e fs/2 (… Hz) | **Frequenza** non è maggiore di 0 e minore di fs/2. |
| Q deve essere più di 0 | **Q** è 0 o meno. |
| Il segnale manca | Su **segnale** è arrivato un valore vuoto (`null`). |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | È arrivato un altro tipo di valore. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` non è maggiore di 0. |
| Il segnale ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il segnale: il valore N non è un numero | Il campione numero N non è un numero. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Filtro IIR (butter, cheby1, cheby2)](sig.iir) per filtri di ordine più alto
- [Risposta in frequenza (freqz, Bode)](sig.response) per disegnare modulo, fase, poli e zeri
- [Equazione alle differenze (lfilter)](sig.difference) per coefficienti scelti da te
- [Filtro FIR (firwin)](sig.fir) per un filtro a fase lineare
- [FFT (np.fft.fft)](sig.fft) per vedere lo spettro
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
