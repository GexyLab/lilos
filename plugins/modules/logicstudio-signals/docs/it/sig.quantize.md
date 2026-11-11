# Quantizza (ADC)

`sig.quantize` · Segnali · [Segnali](logicstudio-signals) · versione 1

Simula un convertitore analogico-digitale: arrotonda ogni campione a uno dei livelli possibili con un certo numero di bit, e misura l'errore che ne viene (rumore di quantizzazione) e il rapporto segnale/rumore (SQNR).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale: un segnale vero `{ fs, t0, samples }` o una lista di numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale quantizzato, con la stessa fs e lo stesso `t0`. Se in ingresso c'era una lista semplice, esce una lista semplice. |
| **codici** (`codes`) | lista | Il codice intero di ogni campione (da 0 in su), come lo darebbe il convertitore. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **errore di quantizzazione** (`quantError`) | oggetto | Un segnale con l'errore di ogni campione, calcolato come *quantizzato − originale*. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **SQNR (dB)** (`sqnr`) | numero | Il rapporto segnale/rumore di quantizzazione, in dB. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Bit o intervallo non validi, un segnale troppo lungo, o un ingresso che non è un segnale. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Bit** (`bits`) | da 1 a 32 | 8 | Quanti bit ha il convertitore. |
| **Intervallo da** (`min`) | numero | −1 | Il valore più basso che il convertitore riesce a leggere. |
| **Intervallo a** (`max`) | numero | 1 | Il valore più alto. Deve essere maggiore di **Intervallo da**. |
| **Livelli** (`mode`) | mid-rise (senza il livello zero) / mid-tread (con lo zero) | mid-rise | Come sono disposti i livelli (vedi sotto). |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso. Un segnale vero porta già la sua fs. |

## Come funziona

Il passo di quantizzazione è `q = (max − min) / 2^bit`.

- **Mid-rise.** L'intervallo è diviso in `2^bit` fasce uguali larghe `q`; ogni campione diventa il **centro** della sua fascia: `min + (codice + 0,5)·q`, con il codice da 0 a `2^bit − 1`. Non c'è un livello esattamente a zero (con un intervallo simmetrico, 0 sta tra due livelli).
- **Mid-tread.** I livelli sono i multipli di `q`: `…, −q, 0, q, 2q, …` (c'è il livello zero). Il codice conta da 0 a partire dal livello più basso dentro l'intervallo. Con un intervallo simmetrico i livelli sono `2^bit + 1`: per esempio 8 bit tra −1 e 1 danno 257 livelli, da −1 a 1 con passo 1/128.
- **Fuori intervallo (clipping).** I valori sotto **Intervallo da** o sopra **Intervallo a** non si fermano lì: vengono portati al livello più basso o più alto, con il codice 0 o massimo.
- **Errore e SQNR.** L'errore di ogni campione è *quantizzato − originale*. L'SQNR è `10·log₁₀(potenza del segnale / potenza dell'errore)`, calcolato su questo segnale (compresa la continua). Se l'errore è esattamente zero l'SQNR vale 300 dB (e non supera mai 300).
- **Lunghezza e tempo.** Come per l'ingresso. Le parti immaginarie di un segnale complesso non vengono mantenute.

Per esempio, con 2 bit tra −1 e 1 (`q` = 0,5) e il segnale `[−1, −0,3, 0, 0,3, 0,9, 1,5]`: **mid-rise** → `[−0,75, −0,25, 0,25, 0,25, 0,75, 0,75]` (codici 0, 1, 2, 2, 3, 3); **mid-tread** → `[−1, −0,5, 0, 0,5, 1, 1]` (codici 0, 1, 2, 3, 4, 4).

## Un po' di teoria

- **Il passo e l'errore.** Quantizzare butta via tutto quello che è più piccolo di `q`: l'errore per campione sta tra `−q/2` e `+q/2`. Se il segnale è abbastanza ricco, l'errore si comporta come rumore uniforme, con potenza `q² / 12`.
- **SQNR.** Per un seno che usa tutto l'intervallo (fondo scala): `SQNR ≈ 6,02·b + 1,76 dB`, con `b` i bit. Ogni bit in più vale circa 6 dB; con 8 bit si hanno circa 50 dB, con 12 bit circa 74 dB, con 16 bit circa 98 dB. Un segnale più piccolo del fondo scala perde dB: dimezzare l'ampiezza costa 6 dB, cioè un bit.
- **Il rumore si spande su tutta la banda** (da 0 a `fs / 2`). Campionare più veloce (sovracampionare) e filtrare poi dà più dB nella banda che interessa.
- **Mid-rise e mid-tread.** Il mid-tread ha uno zero vero: un segnale a zero resta zero, come in molti convertitori audio. Il mid-rise è il caso tipico di un convertitore con livelli simmetrici intorno allo zero, senza zero.
- **Distorsione da saturazione.** Un segnale più grande dell'intervallo viene tagliato (clipping): non è più rumore uniforme ma distorsione armonica. Vedi [Non linearità](sig.nonlinear).
- **Dither.** Aggiungere un pizzico di rumore prima della quantizzazione rende l'errore indipendente dal segnale (meno distorsione, più rumore): lo si può provare sommando [Rumore](sig.noise) con [Somma · Prodotto di segnali](sig.combine).

## Esempi

### 1. Un convertitore a 8 bit

```
[Generatore (oscillatore)] segnale ──▶ segnale [Quantizza (ADC)] segnale ──▶ segnale [Per grafico]
                                                   SQNR (dB) ──▶ valore [Etichetta]
```

Con un seno di ampiezza 0,999 tra −1 e 1, l'SQNR di **8 bit** viene circa 49,96 dB, quello di **12 bit** circa 73,96 dB, come dice la formula (50,0 e 74,0 dB).

### 2. Quanti bit servono

Collega il segnale a due blocchi **Quantizza (ADC)** con bit diversi e confronta le uscite **SQNR (dB)**, o guarda lo spettro del rumore con:

```
[Quantizza (ADC)] errore di quantizzazione ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ dati [Per grafico]
```

### 3. Un convertitore 0–8 V a 3 bit

Con **Intervallo da** 0, **Intervallo a** 8 e 3 bit, `q` = 1: `[0, 1,2, 7,9]` → `[0,5, 1,5, 7,5]` (mid-rise), codici 0, 1, 7.

## Errori

| Messaggio | Quando |
|---|---|
| I bit vanno da 1 a 32 | **Bit** è fuori da 1…32 (si arrotonda a un intero). |
| «Intervallo a» deve essere più grande di «Intervallo da» | **Intervallo a** è minore o uguale a **Intervallo da**. |
| Il segnale manca | Il blocco parte senza segnale in ingresso. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero, un testo o un oggetto che non è un segnale. |
| Il segnale: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il segnale ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Più campioni del limite (vedi [Limiti del motore](logicstudio-engine/limits)). |

## Vedi anche

- [Non linearità (clip, raddrizza)](sig.nonlinear) per la saturazione senza arrotondare
- [Ricampiona (resample)](sig.resample) per cambiare la fs di un convertitore
- [Distorsione (THD, SNR, SINAD)](sig.distortion) per misurare il rumore e la distorsione di un segnale
- [Rumore (np.random)](sig.noise) per un dither
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
