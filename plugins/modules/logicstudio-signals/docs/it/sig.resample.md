# Ricampiona (resample)

`sig.resample` · Segnali · [Segnali](logicstudio-signals) · versione 1

Cambia la frequenza di campionamento di un segnale: lo porta a una nuova fs, con un'interpolazione a banda limitata (sinc a finestra, che evita l'aliasing quando si scende), lineare o a gradini.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale: un segnale vero `{ fs, t0, samples }` o una lista di numeri (presa a **fs delle liste semplici**). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale alla nuova fs. È sempre un segnale vero (anche se in ingresso c'era una lista), con la **nuova fs** e lo stesso `t0`. |
| **Exception** (`error`) | oggetto | Nuova fs non valida, un segnale troppo lungo (in ingresso o in uscita), o un ingresso che non è un segnale. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Nuova fs (Hz)** (`fsOut`) | numero maggiore di 0 | 500 | La frequenza di campionamento del risultato. |
| **Metodo** (`method`) | a banda limitata (sinc a finestra, anti-aliasing) / interpolazione lineare / mantieni (sample and hold) | a banda limitata | Come calcolare i nuovi campioni. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso. Un segnale vero porta già la sua fs. |

## Come funziona

Il campione `j` del risultato è preso all'istante `j / fs_nuova` (dall'inizio del segnale). Il numero di campioni è

`M = floor(N · fs_nuova / fs_vecchia)`

con `N` i campioni in ingresso: da 1000 campioni a 1000 Hz verso 500 Hz ne escono 500; verso 2000 Hz ne escono 2000. La durata resta la stessa (a meno di un campione).

- **A banda limitata** (sinc a finestra). Ogni nuovo campione è una somma pesata dei campioni vicini, con il nucleo `sinc` tagliato da una finestra di Blackman, largo 16 campioni per lato (16 / c, se si scende, dove `c = fs_nuova / fs_vecchia`). Quando si scende di fs, il taglio è a `fs_nuova / 2`, così le frequenze troppo alte vengono tolte prima (anti-aliasing). Vicino all'inizio e alla fine il nucleo esce dal segnale e mancano campioni: i primi e gli ultimi valori sono meno precisi. Per fare bene servono segnali abbastanza lunghi (più di una trentina di campioni).
- **Interpolazione lineare.** Unisce i campioni con segmenti retti. Non filtra: scendendo di fs può esserci aliasing. L'ultimo campione, quando mancherebbe il successivo, si ripete.
- **Mantieni.** Ogni nuovo campione prende il valore del campione precedente più vicino nel tempo (sample and hold, a gradini). Non filtra.

Con fs uguali il risultato è praticamente lo stesso segnale. Una parte immaginaria di un segnale complesso non viene mantenuta.

Esempio con `[0, 1, 2, 3, 4, 5, 6, 7]` a 1000 Hz verso 500 Hz: **lineare** e **mantieni** → `[0, 2, 4, 6]`; verso 2000 Hz con **lineare** → `[0, 0,5, 1, 1,5, …, 6,5, 7, 7]` (16 campioni, l'ultimo ripetuto).

## Un po' di teoria

- **Nyquist.** Una fs permette di rappresentare frequenze fino a `fs / 2`. Sopra, le frequenze si "ripiegano" in basso (*aliasing*): un seno a 700 Hz campionato a 1000 Hz appare a 300 Hz.
- **Scendere di fs (decimazione).** Prima di buttare campioni bisogna togliere tutto ciò che sta sopra `fs_nuova / 2` con un filtro passa-basso; altrimenti l'aliasing non si può più riparare. Il metodo **a banda limitata** lo fa da solo; **lineare** e **mantieni** no.
- **Salire di fs (interpolazione).** I campioni nuovi sono ricostruiti dal segnale originale. L'interpolazione ideale è la formula di Shannon: `x(t) = Σ x[n] · sinc((t − n·T) / T)` con `sinc(u) = sin(πu)/(πu)`. Non si può calcolare all'infinito, perciò il blocco usa una sinc corta moltiplicata per una finestra.
- **Lineare e a gradini.** Sono veloci ma sono filtri passa-basso poveri: l'interpolazione lineare abbassa le frequenze alte (un piccolo calo di ampiezza), il sample and hold produce una copia dello spettro alle frequenze multiple della fs originale ("immagini") e un calo `sinc`.
- **Allineare due segnali.** Per sommare o moltiplicare due segnali hanno bisogno della stessa fs: con un rapporto non intero (per esempio 1000 → 441 Hz) questo blocco calcola comunque i nuovi istanti.

## Esempi

### 1. Da 1000 Hz a 100 Hz

```
[Generatore (oscillatore): fs 1000] segnale ──▶ segnale [Ricampiona (resample): 100 Hz] segnale ──▶ segnale [Per grafico]
```

Un seno di 20 Hz si vede bene anche a 100 Hz (5 campioni per periodo). Un seno di 80 Hz, invece, è sopra i 50 Hz della nuova fs: con il metodo **a banda limitata** sparisce, con **mantieni** diventa un'ombra a 20 Hz.

### 2. Sommare due segnali con fs diverse

```
[Generatore (oscillatore): fs 1000] segnale ──▶ a [Somma · Prodotto di segnali]
[Generatore (oscillatore): fs 500 ] segnale ──▶ [Ricampiona (resample): 1000 Hz] segnale ──▶ b
```

Senza il blocco **Ricampiona**, **Somma · Prodotto** darebbe un'eccezione sulle fs diverse.

### 3. Una lista presa a 8000 Hz

Con **fs delle liste semplici** 8000 e **Nuova fs** 4000, una lista di 1000 numeri diventa un segnale di 500 campioni a 4000 Hz: l'uscita è un segnale, non una lista.

## Errori

| Messaggio | Quando |
|---|---|
| La nuova fs deve essere più di 0 | **Nuova fs** è 0 o negativa. |
| Il segnale manca | Il blocco parte senza segnale in ingresso. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero, un testo o un oggetto che non è un segnale. |
| Il segnale: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il segnale ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale in ingresso, o quello che uscirebbe, supera il limite (vedi [Limiti del motore](logicstudio-engine/limits)). |

## Vedi anche

- [Somma · Prodotto di segnali](sig.combine), che vuole segnali con la stessa fs
- [Filtro IIR (butter, cheby1, cheby2)](sig.iir) e [Filtro FIR (firwin)](sig.fir) per togliere le alte frequenze a mano
- [Quantizza (ADC)](sig.quantize) per simulare anche i bit di un convertitore
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
