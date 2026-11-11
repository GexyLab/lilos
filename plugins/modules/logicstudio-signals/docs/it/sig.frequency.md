# Frequenza · Periodo

`sig.frequency` · Segnali · [Segnali](logicstudio-signals) · versione 1

Misura la **frequenza** (e il **periodo**) di un segnale periodico, per esempio un seno, un'onda quadra o un suono. Funziona anche con pochi periodi e sceglie tra tre metodi: passaggi per lo zero, autocorrelazione, picco dello spettro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Un segnale `{ fs, t0, samples }` oppure una lista semplice di numeri (presa come segnale a **fs delle liste semplici**). Serve almeno qualche periodo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **frequenza (Hz)** (`frequency`) | numero | La frequenza trovata, in Hz. |
| **periodo (s)** (`period`) | numero | Il periodo, `1 / frequenza`, in secondi. |
| **Exception** (`error`) | oggetto | Segnale non valido, troppo lungo, con meno di 4 campioni, o frequenza non trovata. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Metodo** (`method`) | Passaggi per lo zero, Autocorrelazione, Picco dello spettro (FFT) | Passaggi per lo zero | Come si cerca la frequenza (vedi sotto). |
| **Isteresi (frazione del picco)** (`hysteresis`) | da 0 a 0,9 | 0,1 | Si vede solo con il metodo **Passaggi per lo zero**. Il segnale deve scendere sotto questa frazione del picco, in negativo, prima che un nuovo passaggio per lo zero conti: così il rumore vicino a zero non conta come passaggi in più. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri. |

## Come funziona

Prima di tutto il blocco toglie la media dal segnale. Poi:

- **Passaggi per lo zero**: cerca i punti in cui il segnale passa da negativo a positivo (solo in salita), calcolando l'istante preciso con una retta tra i due campioni. La frequenza è il numero di periodi tra il primo e l'ultimo passaggio, diviso per il tempo trascorso. Servono almeno 2 passaggi. È il metodo più semplice e veloce, e va bene per onde pulite.
- **Autocorrelazione**: confronta il segnale con se stesso spostato nel tempo; il massimo più alto dopo il primo passaggio sotto lo zero è il periodo, affinato con una parabola. Regge meglio le onde non sinusoidali (un suono con molte armoniche) e un po' di rumore.
- **Picco dello spettro (FFT)**: prende la FFT con finestra Hann e cerca il punto più alto (escluso 0 Hz), poi affina con una parabola. Regge bene il rumore, ma serve un segnale con più periodi.

Se il segnale non è periodico (per esempio una linea piatta, o un solo periodo), il blocco dà un errore invece di una frequenza sbagliata.

## Un po' di teoria

Un segnale è **periodico** con periodo T se `x(t + T) = x(t)`; la frequenza è `f = 1/T`. Tre modi di vederlo:

- nel **tempo**, T è la distanza tra due punti uguali, per esempio tra due passaggi per lo zero nello stesso verso;
- con l'**autocorrelazione** `r[k] = Σ x[n]·x[n+k]`: il segnale è simile a se stesso spostato di un periodo, quindi r ha un massimo a `k = T·fs`;
- nella **frequenza**, il tono fondamentale è il picco più alto dello spettro; la risoluzione di una FFT è `fs/N`, ma l'interpolazione parabolica la porta a una frazione di quel valore.

Con meno di un periodo nella finestra, nessun metodo può trovare la frequenza. Con pochi periodi, i passaggi per lo zero dànno l'errore più piccolo se il segnale è pulito, perché ogni periodo conta. Per un segnale con molti armonici (un violino, una voce) la fondamentale può non essere il picco più alto dello spettro: in quel caso l'autocorrelazione è più affidabile.

## Esempi

### 1. La nota di un diapason

Un seno di 440 Hz a fs 8000 Hz, 800 campioni (0,1 s):

```
[Generatore (oscillatore)] segnale ──▶ segnale [Frequenza · Periodo] frequenza (Hz) ──▶ valore [Print (console.log)]
```

Con il metodo Passaggi per lo zero esce circa 440 Hz e il periodo circa 0,00227 s.

### 2. Un segnale rumoroso

Un seno di 50 Hz con molto rumore sopra: i passaggi per lo zero si moltiplicano. Prova prima **Isteresi** più alta (0,3–0,5) oppure cambia il metodo in **Picco dello spettro (FFT)**.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale manca | Arriva un valore vuoto. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero singolo, un testo che non è JSON o un oggetto senza `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` manca o non è maggiore di 0. |
| Il segnale: il valore N non è un numero | Il campione N (da 1) della lista non è un numero. |
| Il segnale ha samples e im di lunghezze diverse | La parte immaginaria ha un numero di campioni diverso. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite `signalSamples` (65536 di serie). Vedi [i limiti](logicstudio-engine/limits). |
| Servono almeno 4 campioni | Il segnale ha meno di 4 campioni. |
| Non trovo una frequenza: il segnale non sembra periodico in questa finestra | Il metodo scelto non trova abbastanza periodi (segnale piatto, un solo periodo, rumore). |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft) e [Picchi (find_peaks)](sig.peaks) per più frequenze insieme
- [Correlazione (np.correlate)](sig.correlate) per l'autocorrelazione completa
- [Goertzel (toni, DTMF)](sig.goertzel) per misurare frequenze note
- [Misure (RMS, picco, media)](sig.measure) per le altre misure di un segnale
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
