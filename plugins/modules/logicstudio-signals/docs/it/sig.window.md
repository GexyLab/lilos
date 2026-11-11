# Finestra (scipy.signal.get_window)

`sig.window` · Segnali · [Segnali](logicstudio-signals) · versione 1

Moltiplica un segnale per una finestra (Hann, Hamming, Blackman…) che lo fa scendere dolcemente a zero ai bordi, prima di calcolarne lo spettro. Dà anche la finestra stessa, il suo guadagno coerente e la sua larghezza di banda equivalente (ENBW).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale: un segnale vero `{ fs, t0, samples }` o una lista di numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale moltiplicato per la finestra, con la stessa fs e lo stesso `t0`. Se in ingresso c'era una lista semplice, esce una lista semplice. |
| **finestra** (`window`) | lista | I valori della finestra, uno per campione. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **guadagno coerente** (`coherentGain`) | numero | La media della finestra, `Σw / N`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **ENBW (bin)** (`enbw`) | numero | La larghezza di banda equivalente di rumore, in bin della FFT. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Un ingresso che non è un segnale, o un segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Finestra** (`window`) | rettangolare (nessuna), Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett (triangolare), Kaiser, Tukey | Hann | Il tipo di finestra. |
| **β di Kaiser** (`beta`) | da 0 a 50 | 8,6 | Più è alto, più i lobi laterali sono bassi e più il lobo principale è largo. Si vede solo con la finestra **Kaiser**. |
| **α di Tukey (parte che scende)** (`alpha`) | da 0 a 1 | 0,5 | La frazione della finestra occupata dalle due salite/discese (0 = rettangolare, 1 = Hann). Si vede solo con la finestra **Tukey**. |
| **Periodica (per gli spettri)** (`periodic`) | sì / no | sì | Con sì il denominatore è `N` (finestra "DFT-pari", giusta per la FFT); con no è `N − 1` (simmetrica, giusta per progettare filtri). |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso. Un segnale vero porta già la sua fs. |

## Come funziona

La finestra ha la stessa lunghezza `N` del segnale che arriva; ogni campione è moltiplicato per il valore corrispondente. Le uscite **guadagno coerente** e **ENBW** sono calcolate sulla finestra di quella lunghezza:

- **guadagno coerente** = `Σw / N`;
- **ENBW** = `N · Σw² / (Σw)²`, in bin (un bin è `fs / N`).

Se la lunghezza è 1 la finestra vale 1; se il segnale è vuoto, il guadagno coerente e l'ENBW valgono 0. Una parte immaginaria di un segnale complesso non viene mantenuta.

I valori per `N` grande (finestra periodica):

| Finestra | Guadagno coerente | ENBW (bin) |
|---|---|---|
| Rettangolare | 1 | 1 |
| Hann | 0,5 | 1,5 |
| Hamming | 0,54 | 1,363 |
| Blackman | 0,42 | 1,727 |
| Blackman-Harris | 0,359 | 2,004 |
| Flat-top | 0,216 | 3,770 |
| Bartlett | 0,5 | 1,333 |
| Kaiser (β 8,6) | 0,421 | 1,721 |
| Tukey (α 0,5) | 0,75 | 1,222 |

## Un po' di teoria

- **Perché una finestra.** La FFT immagina che i `N` campioni si ripetano all'infinito. Se il segnale non contiene un numero intero di periodi, il salto tra la fine e l'inizio sporca lo spettro: l'energia di una riga "cola" sulle righe vicine (*leakage*). Una finestra che va a zero ai bordi toglie il salto.
- **Le formule** (con `n = 0…N−1`, finestra periodica):
  - Hann: `w[n] = 0.5 − 0.5·cos(2πn/N)`
  - Hamming: `w[n] = 0.54 − 0.46·cos(2πn/N)`
  - Blackman: `w[n] = 0.42 − 0.5·cos(2πn/N) + 0.08·cos(4πn/N)`
  - Kaiser: `w[n] = I₀(β·√(1 − (2n/N − 1)²)) / I₀(β)`, con `I₀` la funzione di Bessel modificata.
  - Bartlett: una tenda triangolare; Blackman-Harris e Flat-top sono somme di 4 e 5 coseni.
- **Guadagno coerente.** Una finestra abbassa l'ampiezza di una riga di un fattore `Σw / N`. Per leggere l'ampiezza giusta la FFT divide per `Σw` (lo fa già [FFT](sig.fft)); a mano si moltiplica per `1 / guadagno coerente` (Hann: ×2).
- **ENBW.** È la larghezza di un filtro rettangolare che lascerebbe passare la stessa potenza di rumore bianco: finestre più larghe vedono più rumore, ma separano meglio le righe lontane. Serve per convertire una potenza di rumore in densità (W/Hz).
- **Scelta.** Rettangolare: risoluzione migliore ma leakage forte (vale con segnali che hanno periodi interi). Hann/Hamming: buon compromesso. Blackman-Harris: lobi laterali molto bassi. **Flat-top**: l'ampiezza di una riga è letta con errore minimo (sotto 0,01 dB) ma le righe sono molto larghe.
- **Periodica o simmetrica.** Per gli spettri si usa la periodica; la simmetrica (denominatore `N − 1`) serve a disegnare i coefficienti di un filtro FIR.

## Esempi

### 1. Lo spettro di un seno senza leakage

```
[Generatore (oscillatore)] segnale ──▶ segnale [Finestra (scipy.signal.get_window)] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ dati [Per grafico]
```

Con un seno di 52,5 Hz a fs 1000 Hz e 1000 campioni (non un numero intero di periodi) il picco con la finestra **rettangolare** ha code larghe; con **Hann** le code scendono molto più in fretta.

### 2. Il guadagno coerente per correggere l'ampiezza

Con **Hann**, la lista `[1, 1, 1, 1, 1, 1, 1, 1]` diventa `[0, 0,146, 0,5, 0,854, 1, 0,854, 0,5, 0,146]`: **guadagno coerente** 0,5 e **ENBW** 1,5. Per rimettere l'ampiezza giusta si moltiplica per `1 / 0,5 = 2` con [Guadagno · Offset](sig.gain).

### 3. Finestra simmetrica

Con **Periodica** spenta e 5 campioni a 1 la finestra Hann vale `[0, 0,5, 1, 0,5, 0]`: la forma simmetrica che tocca 1 al centro.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale manca | Il blocco parte senza segnale in ingresso. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero, un testo o un oggetto che non è un segnale. |
| Il segnale: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il segnale ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Più campioni del limite (vedi [Limiti del motore](logicstudio-engine/limits)). |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft) per calcolare lo spettro (ha già una finestra tra le sue impostazioni)
- [Densità spettrale (scipy.signal.welch)](sig.psd) per la densità di potenza, con finestra e media
- [Filtro FIR (firwin)](sig.fir) per i filtri disegnati con una finestra
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
