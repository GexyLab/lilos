# Inviluppo (scipy.signal.hilbert)

`sig.envelope` · Segnali · [Segnali](logicstudio-signals) · versione 1

Calcola l'**inviluppo** di un segnale, cioè la curva che ne segue i picchi, e con lo stesso calcolo anche la **fase** e la **frequenza istantanee**. Usa il **segnale analitico** (trasformata di Hilbert). Serve per demodulare un segnale AM, vedere la forma di un suono o di una vibrazione, seguire una frequenza che cambia.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Un segnale `{ fs, t0, samples }` oppure una lista semplice di numeri (presa come segnale a **fs delle liste semplici**). Se ha una parte immaginaria (`im`) viene ignorata: il blocco usa solo la parte reale. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **inviluppo** (`envelope`) | oggetto | Un segnale `{ fs, t0, samples }` con l'inviluppo, uguale a `√(x² + H²)`, dove H è la trasformata di Hilbert. Mai negativo. |
| **fase istantanea (rad)** (`phase`) | oggetto | Un segnale con la fase in radianti, **srotolata** (continua, senza salti di 2π). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **frequenza istantanea (Hz)** (`frequency`) | oggetto | Un segnale con la frequenza in Hz di ogni campione. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **segnale analitico** (`analytic`) | oggetto | Il segnale analitico `x + i·H`, come segnale complesso con `samples` (reale) e `im` (immaginario). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Segnale non valido, troppo lungo o con meno di 2 campioni. |

Le quattro uscite hanno la stessa `fs`, lo stesso `t0` e la stessa lunghezza del segnale in ingresso.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri. |

## Come funziona

Il blocco calcola la FFT del segnale, azzera le frequenze negative e raddoppia quelle positive, poi torna al tempo con la IFFT. Il risultato è un segnale **complesso** `z[n] = x[n] + i·H[n]`, il segnale analitico, da cui si ricavano:

- l'**inviluppo** `|z|`, la distanza dall'origine;
- la **fase** `arg(z)`, l'angolo, srotolato;
- la **frequenza istantanea** `Δfase · fs / 2π`, cioè la velocità con cui la fase cresce. Il primo campione usa la differenza con il secondo.

Il calcolo funziona bene quando il segnale è a **banda stretta**, cioè una portante veloce con un inviluppo lento. Ai due estremi del segnale ci sono errori (il calcolo suppone che il segnale si ripeta), quindi non fidarti dei primi e degli ultimi campioni.

## Un po' di teoria

Un segnale reale `x(t)` ha uno spettro simmetrico: le frequenze negative non aggiungono informazione. Il **segnale analitico** tiene solo quelle positive: `z(t) = x(t) + i·H{x}(t)`, dove la **trasformata di Hilbert** H sfasa ogni componente di −90°. Per un coseno `cos(ωt)` dà `cos(ωt) + i·sin(ωt) = e^(iωt)`: un vettore che ruota.

Se `x(t) = a(t)·cos(φ(t))` con `a(t)` che varia lentamente rispetto alla portante, allora:

- `|z(t)| = a(t)` è l'**inviluppo** (ampiezza istantanea);
- `arg z(t) = φ(t)` è la **fase istantanea**;
- `f(t) = (1/2π)·dφ/dt` è la **frequenza istantanea**.

Per un segnale AM `(1 + m·cos(Ωt))·cos(ωt)` l'inviluppo è `1 + m·cos(Ωt)`: è il segnale che ha modulato la portante, ottenuto senza raddrizzare e filtrare. Per un chirp la frequenza istantanea è una retta che sale.

## Esempi

### 1. Demodulare un segnale AM

Una portante di 100 Hz moltiplicata per `1 + 0,5·sin(2π·5·t)` (un'onda di 5 Hz), a fs 1000 Hz, 1000 campioni:

```
[Generatore (oscillatore): 5 Hz] segnale ──▶ segnale [Guadagno · Offset: ×0,5 +1] segnale ──▶ a [Somma · Prodotto di segnali: Moltiplica] segnale ──▶ segnale [Inviluppo (scipy.signal.hilbert)] inviluppo ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
[Generatore (oscillatore): 100 Hz] segnale ──▶ b [Somma · Prodotto di segnali: Moltiplica]
```

L'inviluppo oscilla tra 0,5 e 1,5, a 5 Hz, e al centro vale 1,5 al campione 250.

### 2. La frequenza istantanea

Nello stesso segnale, l'uscita **frequenza istantanea** (da mostrare nelle Proprietà) vale circa 100 Hz lungo il segnale.

```
[Generatore (oscillatore)] segnale ──▶ segnale [Inviluppo (scipy.signal.hilbert)] frequenza istantanea (Hz) ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale manca | Arriva un valore vuoto. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero singolo, un testo che non è JSON o un oggetto senza `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` manca o non è maggiore di 0. |
| Il segnale: il valore N non è un numero | Il campione N (da 1) della lista non è un numero. |
| Il segnale ha samples e im di lunghezze diverse | La parte immaginaria ha un numero di campioni diverso. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite `signalSamples` (65536 di serie). Vedi [i limiti](logicstudio-engine/limits). |
| Servono almeno 2 campioni | Il segnale ha meno di 2 campioni. |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft) per lo spettro del segnale
- [Misure (RMS, picco, media)](sig.measure) per l'RMS e il picco
- [Non linearità (clip, raddrizza)](sig.nonlinear) e [Filtro su campioni (media mobile, EMA)](sig.smooth) per un inviluppo "alla vecchia maniera" (raddrizza e filtra)
- [Per grafico](sig.toChart) per disegnare le uscite
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
