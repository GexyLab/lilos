# dB ↔ lineare

`sig.db` · Segnali · [Segnali](logicstudio-signals) · versione 1

Converte tra valori lineari e decibel: ampiezza e potenza in dB e ritorno, e le scale assolute dBm, dBV e dBu. Funziona su un numero, su una lista o su un segnale intero.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore, lista o segnale** (`value`) | qualsiasi | Un numero (anche un testo come `"2,5"`), una lista di numeri o un segnale `{ fs, samples }`. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | Il valore convertito. Un numero esce come numero, una lista come lista, un segnale come segnale (stessa fs e `t0`). |
| **Exception** (`error`) | oggetto | Un ingresso che non è un numero, una lista o un segnale; un segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Conversione** (`op`) | vedi la tabella sotto | Ampiezza → dB | Quale conversione fare. |
| **Riferimento (0 dB)** (`ref`) | numero maggiore di 0 | 1 | Il valore che corrisponde a 0 dB. Si vede solo con le prime quattro conversioni (ampiezza e potenza). |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso. Un segnale vero porta già la sua fs. |

| Conversione | Formula | Esempio |
|---|---|---|
| **Ampiezza → dB** (`ampToDb`) | `20·log₁₀(x / rif)` | 0,5 → −6,02; 1 → 0; 0,1 → −20 |
| **Potenza → dB** (`powerToDb`) | `10·log₁₀(x / rif)` | 0,5 → −3,01; 100 → 20 |
| **dB → ampiezza** (`dbToAmp`) | `rif · 10^(x/20)` | 20 → 10; −6,02 → 0,5 |
| **dB → potenza** (`dbToPower`) | `rif · 10^(x/10)` | 20 → 100; 3,01 → 2 |
| **W → dBm** (`wToDbm`) | `10·log₁₀(x / 0,001 W)` | 0,001 → 0; 1 → 30 |
| **dBm → W** (`dbmToW`) | `0,001 · 10^(x/10)` | 0 → 0,001; 20 → 0,1 |
| **V → dBV** (`vToDbv`) | `20·log₁₀(x / 1 V)` | 1 → 0; 0,1 → −20 |
| **dBV → V** (`dbvToV`) | `10^(x/20)` | 0 → 1; 20 → 10 |
| **V → dBu (0,775 V)** (`vToDbu`) | `20·log₁₀(x / 0,7746 V)` | 0,7746 → 0; 1 → 2,218 |
| **dBu → V** (`dbuToV`) | `0,7746 · 10^(x/20)` | 0 → 0,7746; 20 → 7,746 |

## Come funziona

Il blocco applica la formula scelta a ogni valore che arriva.

- **Un numero** (o un testo che è un numero) dà un numero. **Una lista** dà una lista (presa a **fs delle liste semplici**), **un segnale** dà un segnale con lo stesso `t0` e la stessa fs: la formula è applicata a ogni campione.
- **Il pavimento di −300 dB.** Il logaritmo di 0 non esiste: per l'ampiezza 0 (o potenza 0) il risultato è **−300 dB**, e nessuna conversione verso i dB scende mai sotto −300. Un valore negativo è trattato con il suo valore assoluto (ampiezza `−0,5` → −6,02 dB).
- **Riferimento.** Solo **Ampiezza ↔ dB** e **Potenza ↔ dB** usano **Riferimento**; le scale dBm, dBV e dBu hanno un riferimento fisso. Con un riferimento diverso da 1 si ottengono per esempio i dB rispetto a 20 µPa (`2e-5`, dB SPL) o a un fondo scala (dBFS: rif = fondo scala).
- La parte immaginaria di un segnale complesso non viene mantenuta.

## Un po' di teoria

- **Perché i dB.** Misurano un *rapporto* con una scala logaritmica: moltiplicare diventa sommare, e un intervallo enorme di valori (da 0,00001 a 100000) sta in poche decine di numeri. L'orecchio e molti strumenti ragionano in modo logaritmico.
- **20 o 10?** La potenza è proporzionale al quadrato dell'ampiezza: `P ∝ A²`, quindi `10·log₁₀(P₂/P₁) = 20·log₁₀(A₂/A₁)`. Per le ampiezze (tensione, corrente, pressione, campioni) si usa 20; per le potenze (W, energia, densità spettrale) si usa 10.
- **Valori da ricordare.** ±3 dB = ×1,414 / ×0,707 in ampiezza = ×2 / ×0,5 in potenza (3,01 dB per la precisione); ±6 dB = ×2 / ×0,5 in ampiezza; ±20 dB = ×10 / ×0,1 in ampiezza; ±10 dB = ×10 / ×0,1 in potenza. L'RMS di un seno è −3,01 dB rispetto al picco.
- **dBm.** Potenza rispetto a 1 mW: 0 dBm = 1 mW, 30 dBm = 1 W.
- **dBV.** Tensione rispetto a 1 V: 0 dBV = 1 V (RMS).
- **dBu.** Tensione rispetto a 0,7746 V (`√(0,001 W · 600 Ω)`, la tensione che dissipa 1 mW su 600 Ω): 0 dBu = 0,7746 V RMS, +4 dBu è il livello "professionale" del segnale audio.
- **Il pavimento.** Un segnale a zero ha −∞ dB; il blocco usa −300 dB per non mandare −∞ nei grafici.

## Esempi

### 1. Lo spettro in dB, a mano

```
[FFT (np.fft.fft)] modulo ──▶ valore [dB ↔ lineare: Ampiezza → dB] risultato ──▶ dati [Per grafico]
```

(Se ti basta, lo spettro ha già i suoi dB nell'oggetto che esce dalla FFT, e [Per grafico](sig.toChart) può mostrarli.)

### 2. Una potenza in dBm

```
[Costante · Variabile: 0,001] valore ──▶ valore [dB ↔ lineare: W → dBm] risultato ──▶ valore [Print (console.log)]
```

Scrive `0` (1 mW è 0 dBm); con 1 W scrive `30`.

### 3. Un guadagno in dB tornato lineare

Una lista `[1, 0,5, 0,1]` con **Ampiezza → dB** dà `[0, −6,02, −20]`; il valore `0` dà `−300`; il valore 20 con **dB → ampiezza** dà `10`.

## Errori

| Messaggio | Quando |
|---|---|
| Il valore manca | Il blocco parte senza valore in ingresso. |
| Il valore deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso non è un numero, né una lista, né un segnale (per esempio un testo che non è un numero). |
| Il valore: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il valore ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il valore ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Più campioni del limite (vedi [Limiti del motore](logicstudio-engine/limits)). |
| Conversione sconosciuta: … | La conversione salvata nel progetto non esiste (non succede scegliendola dal menu). |

## Vedi anche

- [Guadagno · Offset](sig.gain), che accetta il guadagno anche in dB
- [Misure (RMS, picco, media)](sig.measure), con l'RMS anche in dB
- [FFT (np.fft.fft)](sig.fft) e [Densità spettrale (scipy.signal.welch)](sig.psd), che danno già i dB
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
