# Picchi (find_peaks)

`sig.peaks` · Segnali · [Segnali](logicstudio-signals) · versione 1

Trova i **picchi** di uno spettro, di una densità spettrale o di un segnale: i punti più alti rispetto ai vicini. In uno spettro dà le **frequenze principali** (con l'interpolazione tra i punti, più precise della griglia della FFT); in un segnale dà gli istanti dei massimi locali.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **spettro o segnale** (`data`) | qualsiasi | Uno spettro di [FFT](sig.fft), una PSD di [Densità spettrale](sig.psd), un segnale `{ fs, t0, samples }` oppure una lista semplice di numeri (presa come segnale a **fs delle liste semplici**). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **picchi** (`peaks`) | lista | I picchi trovati, dal più alto al più basso. Da uno spettro o una PSD ogni picco è `{ f, value, db }` (frequenza in Hz, valore, valore in dB). Da un segnale è `{ t, value, index }` (tempo in secondi, valore del campione, numero del campione da 0). Se non c'è nessun picco, la lista è vuota. |
| **posizione del più alto (Hz o s)** (`position`) | numero | La frequenza (o il tempo) del picco più alto. Non esce se non ci sono picchi. |
| **valore del più alto** (`value`) | numero | Il valore del picco più alto. Non esce se non ci sono picchi. |
| **Exception** (`error`) | oggetto | Dato mancante o non valido, troppo lungo, o con `f` e valori di lunghezze diverse. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Quanti, al massimo** (`count`) | da 1 a 1000 | 5 | Quanti picchi tenere, a partire dal più alto. |
| **Non più bassi di (dB sotto il più alto)** (`minDb`) | 0 o meno | −60 | Scarta i picchi più bassi di così rispetto al più alto. −60 tiene fino a un millesimo dell'ampiezza del più alto; 0 tiene solo il più alto (e quelli uguali). |
| **Distanza minima (Hz o s)** (`distance`) | 0 o più | 0 | Due picchi più vicini di così non contano entrambi: resta il più alto. 0 non scarta nulla. |
| **Salta 0 Hz (continua)** (`skipDC`) | sì / no | sì | Solo per spettri e PSD: non considera il punto a 0 Hz, dove di solito sta la media del segnale. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri. |

## Come funziona

Un punto è un picco se è **più alto del vicino a sinistra e non più basso di quello a destra** (i punti di un tratto piatto contano come un picco solo, il primo). Poi:

1. **Interpolazione** (solo spettri e PSD): per ogni picco si guardano i dB del punto e dei due vicini e si passa per i tre punti una parabola; il vertice dà la frequenza e il valore **più precisi** del punto della griglia. Per questo la frequenza trovata può cadere tra due punti della FFT.
2. **Soglia**: si scartano i picchi con dB inferiori a `più alto + minDb`.
3. I rimasti sono messi in ordine di valore, dal più alto. Si scorre l'elenco: un picco più vicino di **Distanza minima** a uno già preso è saltato; ci si ferma a **Quanti**.

Per la PSD il valore è la potenza e i dB sono 10·log10; per lo spettro il valore è il modulo e i dB 20·log10.

> Con un segnale, i valori sono quelli dei campioni, senza interpolazione, e la soglia usa i dB del valore assoluto.

## Un po' di teoria

Lo spettro di un tono puro, osservato con una FFT, non è una riga ma un picco con la forma della trasformata della finestra. Se il tono non cade su un punto della griglia (`k·fs/N`), il massimo dei punti sta vicino alla frequenza vera ma non coincide con essa: l'errore può arrivare a `Δf/2`.

L'**interpolazione parabolica** sul logaritmo dell'ampiezza (cioè in dB) sfrutta il fatto che la cima del picco di una finestra Gaussiana-simile è quasi una parabola. Con 3 punti si stima la posizione `δ = ½·(a − c) / (a − 2b + c)` rispetto al punto centrale, in frazioni di `Δf`, e la frequenza è `f = (k + δ)·Δf`. Con una finestra liscia (Hann, Blackman-Harris) l'errore scende a una piccola frazione di `Δf`; con la Rettangolare è meno buona.

La regola della **distanza minima** serve perché una finestra con code lunghe, o un tono che ha delle armoniche vicine, genera picchi secondari ai lati di quello vero; così si tiene solo il più alto di ogni gruppo.

## Esempi

### 1. Le due frequenze di un segnale

Un segnale con un seno di ampiezza 2 a 50,3 Hz e uno di ampiezza 0,5 a 120 Hz, a fs 1000 Hz e 1000 campioni, passa in una FFT con finestra Hann:

```
[Somma · Prodotto di segnali] segnale ──▶ segnale [FFT (np.fft.fft): Hann] spettro ──▶ dati [Picchi (find_peaks)] picchi ──▶ valore [Print (console.log)]
[Generatore (oscillatore): 50,3 Hz, ampiezza 2] segnale ──▶ a [Somma · Prodotto di segnali]
[Generatore (oscillatore): 120 Hz, ampiezza 0,5] segnale ──▶ b [Somma · Prodotto di segnali]
```

Con **Quanti** = 3 scrive due picchi: circa 50,32 Hz (valore 2,03; 6,15 dB) e 120,00 Hz (valore 0,5; −6,02 dB). La posizione è precisa a una frazione di Δf (1 Hz), il valore leggermente sopra 2 per l'interpolazione.

### 2. Solo il tono più alto, ma non le sue code

Con una FFT a finestra rettangolare i picchi secondari sono code del principale. Con **Non più bassi di** = −40 le code più basse sono scartate; con una **Distanza minima** di 5 Hz, tra due picchi vicini resta solo il più alto.

### 3. I massimi nel tempo

Con un segnale al posto dello spettro, **picchi** dà `{ t, value, index }`: per esempio gli istanti dei battiti in un segnale cardiaco, con una **Distanza minima** di 0,3 s per non contare due volte lo stesso battito.

## Errori

| Messaggio | Quando |
|---|---|
| Il dato manca | Arriva un valore vuoto. |
| Il dato deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero singolo, un testo che non è JSON o un oggetto senza `samples` e senza `f`. |
| Il dato ha una frequenza di campionamento (fs) non valida | Il segnale ha `fs` mancante o non maggiore di 0. |
| Il dato: il valore N non è un numero | Il campione N (da 1) della lista non è un numero. |
| Il dato ha samples e im di lunghezze diverse | La parte immaginaria ha un numero di campioni diverso. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite `signalSamples` (65536 di serie). Vedi [i limiti](logicstudio-engine/limits). |
| Lo spettro ha f e valori di lunghezze diverse | Le liste `f` e `mag` (o `psd`) non sono lunghe uguali. |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft) per ottenere lo spettro
- [Densità spettrale (scipy.signal.welch)](sig.psd) per una PSD più pulita
- [Frequenza · Periodo](sig.frequency) per la frequenza di un solo tono periodico
- [Goertzel (toni, DTMF)](sig.goertzel) per misurare frequenze note
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
