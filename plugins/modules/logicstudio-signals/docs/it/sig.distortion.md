# Distorsione (THD, SNR, SINAD)

`sig.distortion` · Segnali · [Segnali](logicstudio-signals) · versione 1

Misura la **qualità di un tono**: quanto è puro. Da un segnale che contiene un tono (un seno che esce da un amplificatore, da un convertitore, da un altoparlante) calcola la **distorsione armonica totale** (THD), il **rapporto segnale/rumore** (SNR), il **SINAD** e il numero effettivo di bit (**ENOB**).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Un segnale `{ fs, t0, samples }` oppure una lista semplice di numeri (presa come segnale a **fs delle liste semplici**). Servono almeno 64 campioni, meglio molti di più e con diversi periodi del tono. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **THD (%)** (`thd`) | numero | La distorsione armonica totale in percentuale: la radice della potenza delle armoniche diviso la potenza del tono, per 100. |
| **SNR (dB)** (`snr`) | numero | Il rapporto tra la potenza del tono e quella del rumore (senza le armoniche), in dB. |
| **SINAD (dB)** (`sinad`) | numero | Il rapporto tra il tono e tutto il resto, rumore e armoniche insieme, in dB. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **ENOB (bit)** (`enob`) | numero | Il numero effettivo di bit, `(SINAD − 1,76) / 6,02`. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **THD (dB)** (`thdDb`) | numero | Il THD in dB: `10·log10(potenza armoniche / potenza tono)`, per esempio −40 dB per 1%. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **fondamentale (Hz)** (`frequency`) | numero | La frequenza del tono trovata (interpolata). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **ampiezza della fondamentale** (`amplitude`) | numero | L'ampiezza del tono, nelle unità del segnale. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Segnale non valido, troppo lungo, con meno di 64 campioni, o fondamentale non valida. |

I valori in dB sono limitati a ±300.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Fondamentale (Hz, 0 = il picco più alto)** (`fundamental`) | 0 o più | 0 | La frequenza del tono. Con 0 il blocco cerca il picco più alto dello spettro. Scrivila se nel segnale c'è qualcosa di più forte del tono (un ronzio, un'armonica più alta). Deve stare sotto fs/2. |
| **Armoniche contate (dalla 2ª)** (`harmonics`) | da 1 a 50 | 5 | Quante armoniche entrano nel THD, a partire dalla seconda: con 5 si contano la 2ª, 3ª, 4ª, 5ª e 6ª. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri. |

## Come funziona

1. Toglie la media e applica una finestra **Blackman-Harris** (code molto basse: la dispersione del tono non si scambia per rumore), poi fa la FFT.
2. Trova il tono: è la frequenza indicata o il picco più alto (escluso un piccolo tratto vicino a 0 Hz). La sua potenza è la somma dei punti nel suo "lobo" (5 punti per lato) e la frequenza è affinata con una parabola.
3. Per ogni armonica da 2 a **Armoniche + 1** sceglie il punto `h · fondamentale` e somma la potenza nel suo lobo. Se l'armonica supera fs/2, è **ripiegata** nello spettro (aliasing), come succede nella realtà.
4. Tutto il resto, escluso il tratto vicino a 0 Hz, è **rumore**.
5. Calcola i risultati:
   - **THD** = `√(P_armoniche / P_tono) · 100` %
   - **SNR** = `10·log10(P_tono / P_rumore)`
   - **SINAD** = `10·log10(P_tono / (P_rumore + P_armoniche))`
   - **ENOB** = `(SINAD − 1,76) / 6,02`

Con meno di 64 campioni, o se il tono è troppo vicino a 0 Hz per la lunghezza (meno di circa 6 punti della FFT), il calcolo non regge e il blocco dà un errore.

## Un po' di teoria

Un componente non lineare (un amplificatore saturo, un convertitore) trasforma un seno puro di frequenza `f` in un segnale con anche le **armoniche** `2f, 3f, …`. Il **THD** misura quanto valgono rispetto al tono: `THD = √(V₂² + V₃² + …) / V₁`. Un THD di 1% corrisponde a −40 dB; di 0,1% a −60 dB.

Il rumore e le armoniche si sommano in potenza, non in ampiezza. Per questo:

- **SNR** = tono / rumore (senza armoniche);
- **SINAD** (signal to noise and distortion) = tono / (rumore + armoniche): è la qualità reale di un convertitore o di un amplificatore;
- **ENOB**: un convertitore ideale a N bit, con un seno a fondo scala, ha un SINAD di `6,02·N + 1,76` dB. Invertendo la formula, `ENOB = (SINAD − 1,76) / 6,02` dice a quanti bit ideali corrisponde la qualità misurata. La formula è esatta con un tono a fondo scala del convertitore; con un tono più basso il valore sembra peggiore di quello reale.

La finestra di **Blackman-Harris** ha code quasi trascurabili (sotto −92 dB), e per questo la dispersione di un tono forte non nasconde l'ultima armonica o il rumore. Il suo lobo principale è largo: per questo ogni tono occupa 5 punti per lato. Perché le armoniche non si confondano, i toni devono essere separati da più di 5 punti (`5 · fs/N`), cioè la finestra deve contenere più periodi.

## Esempi

### 1. Un seno con un po' di distorsione

Un tono di 1 kHz con il 1% di seconda armonica (2 kHz) e lo 0,1% di terza (3 kHz), a fs 48000 Hz, 4096 campioni:

```
[Somma · Prodotto di segnali] segnale ──▶ segnale [Distorsione (THD, SNR, SINAD)] THD (%) ──▶ valore [Print (console.log)]
[Generatore (oscillatore): 1000 Hz] segnale ──▶ a [Somma · Prodotto di segnali]
[Generatore (oscillatore): 2000 Hz, ampiezza 0,01] segnale ──▶ b [Somma · Prodotto di segnali]
[Generatore (oscillatore): 3000 Hz, ampiezza 0,001] segnale ──▶ c [Somma · Prodotto di segnali]
```

Esce: THD circa **1,005 %** (`√(0,01² + 0,001²) = 0,01005`), THD in dB circa −39,96, SINAD circa 39,96 dB, ENOB circa 6,34 bit, fondamentale circa 1000 Hz, ampiezza 1,000.

### 2. Un convertitore a 8 bit

Un seno a fondo scala, quantizzato a 8 bit con [Quantizza (ADC)](sig.quantize): il SINAD esce circa 50 dB e **ENOB** circa 8,0. Se **ENOB** esce molto sotto il numero di bit del convertitore, c'è altro oltre al rumore di quantizzazione: distorsione, rumore del circuito.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale manca | Arriva un valore vuoto. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero singolo, un testo che non è JSON o un oggetto senza `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` manca o non è maggiore di 0. |
| Il segnale: il valore N non è un numero | Il campione N (da 1) della lista non è un numero. |
| Il segnale ha samples e im di lunghezze diverse | La parte immaginaria ha un numero di campioni diverso. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite `signalSamples` (65536 di serie). Vedi [i limiti](logicstudio-engine/limits). |
| Servono almeno 64 campioni | Il segnale ha meno di 64 campioni. |
| La fondamentale deve stare sotto fs/2 (… Hz) | **Fondamentale** è uguale o maggiore di fs/2. |
| La fondamentale è troppo vicina a 0 Hz per questa lunghezza: servono più campioni | Il tono sta entro circa 5 punti della FFT da 0 Hz (è il caso di un segnale che non ha un tono chiaro, o di un tono molto basso). |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft) per vedere lo spettro e le armoniche
- [Quantizza (ADC)](sig.quantize) per provare il blocco con un convertitore
- [Misure (RMS, picco, media)](sig.measure) per RMS, picco e fattore di cresta
- [Picchi (find_peaks)](sig.peaks) per trovare le armoniche
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
