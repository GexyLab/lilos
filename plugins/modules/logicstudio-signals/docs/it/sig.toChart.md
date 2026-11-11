# Per grafico

`sig.toChart` · Segnali · [Segnali](logicstudio-signals) · versione 1

Trasforma un segnale, uno spettro o una risposta in frequenza nei **dati di un grafico** (una o più serie di punti `x, y`), da collegare alle componenti dei Grafici. Sceglie da solo l'asse (tempo o frequenza), sceglie cosa mostrare e, se i punti sono troppi, li riduce senza perdere i picchi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale o spettro** (`data`) | qualsiasi | Un segnale `{ fs, t0, samples }`, una lista di numeri (presa alla «fs delle liste semplici»), o un oggetto con le frequenze (`f`): lo spettro della [FFT](sig.fft), la densità spettrale, la risposta in frequenza. Diventa la prima serie. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati del grafico** (`chart`) | lista | Una lista di serie `[{ "name": …, "data": [{ "x": …, "y": … }, …] }, …]`, nella forma che i Grafici (per esempio [Linee](charts.line)) accettano su **dati**. |
| **Exception** (`error`) | oggetto | Un segnale non valido, uno spettro senza i valori da mostrare, segnale troppo lungo. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a **7** ingressi in più, di tipo qualsiasi, chiamati «serie 1», «serie 2»… Ognuno è un'altra serie nello stesso grafico (per confrontare, per esempio, un segnale prima e dopo un filtro). **Il nome della porta è il nome della serie** (lo puoi cambiare). Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Mostra** (`show`) | Automatico / Valore (parte reale) / Valore assoluto / Parte immaginaria / Decibel / Fase | Automatico | Cosa mettere sull'asse verticale (vedi sotto). |
| **Asse orizzontale** (`xAxis`) | Tempo o frequenza / Numero del campione | Tempo o frequenza | L'asse x: il tempo del campione (o la frequenza, per uno spettro), oppure 0, 1, 2… |
| **Punti per serie, al massimo** (`maxPoints`) | da 10 a 100000 | 2000 | Oltre questo numero i punti vengono ridotti (vedi sotto). |
| **Nome della prima serie** (`name`) | testo | vuoto | Il nome della serie che arriva da **segnale o spettro**. Vuoto: «segnale» (nella lingua del programma). |
| **fs delle liste semplici (Hz)** (`listFs`) | più di 0 | 1000 | Una lista semplice di numeri è un segnale con questa frequenza di campionamento. |

## Come funziona

Il blocco ricalcola **tutte le serie** a ogni valore che arriva su una qualsiasi delle sue porte, con l'ultimo valore di ciascuna. Le porte che non hanno ancora niente non fanno serie; se nessuna ha un valore, non esce niente.

**Cosa mostra l'asse y**, per **Automatico**:

- un **segnale**: la parte reale (un segnale complesso mostra solo la reale; per le altre parti scegli la voce in **Mostra**);
- uno **spettro** (FFT): il modulo (`mag`);
- una **densità spettrale** (Welch): la densità (`psd`);
- una **risposta in frequenza**: il guadagno in decibel (`db`).

Con le altre voci di **Mostra**: *Valore assoluto* è il modulo (`√(re² + im²)`), *Parte immaginaria*, *Decibel* è `20·log10(modulo)` (non scende sotto −300 dB) e *Fase* è l'angolo, in radianti per segnali e spettri. Per uno spettro, Valore e Valore assoluto danno il modulo. *Parte immaginaria* e *Fase* funzionano solo con gli oggetti che le hanno: lo spettro della FFT sì; la densità spettrale no (errore).

**L'asse x**: per un segnale è il tempo `t₀ + i/fs`, per uno spettro la frequenza; con **Numero del campione** sono gli interi 0, 1, 2…

**Riduzione dei punti**: se una serie ha più punti di **Punti per serie**, il blocco la divide in `Punti/2` gruppi di campioni vicini e di ogni gruppo tiene **il punto più basso e il più alto**. Così il grafico ha al massimo **Punti per serie** punti, e i picchi e le valli restano visibili (non si perdono come con un campione ogni tanto). Se i punti sono meno, passano tutti.

Un valore non finito (infinito o non un numero) diventa un punto vuoto, che interrompe la linea.

## Un po' di teoria

Un grafico può mostrare solo tanti punti quanti sono i pixel dello schermo (poche migliaia). Un segnale di 65000 campioni su uno schermo largo 1000 pixel va **decimato**. Prendere un campione ogni tanto (decimazione semplice) rischia di perdere i picchi brevi e di dare **aliasing visivo**, cioè forme che non esistono. Tenere minimo e massimo di ogni gruppo (**decimazione min-max**, quella che usano gli oscilloscopi) mostra sempre l'inviluppo reale del segnale.

Le scale scelte da **Automatico** seguono l'uso: uno spettro si guarda in modulo (lineare, o in dB per dinamiche grandi: `dB = 20·log10(A/A₀)`, +6 dB = ampiezza doppia, +20 dB = ampiezza 10 volte), la **risposta in frequenza** si guarda in dB (diagramma di Bode), e la fase in radianti (o gradi: quella delle risposte in frequenza è già in gradi).

## Esempi

### 1. Un segnale

```
[Generatore (oscillatore)] segnale ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati [Linee]
```

Con una lista `[1, 2, 3]` al posto del generatore e «fs delle liste semplici» 1000, il blocco manda `[{ "name": "segnale", "data": [{ "x": 0, "y": 1 }, { "x": 0.001, "y": 2 }, { "x": 0.002, "y": 3 }] }]`.

### 2. Prima e dopo un filtro

Con una porta aggiunta chiamata «filtrato», le due serie stanno nello stesso grafico:

```
[Generatore (oscillatore)] segnale ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati [Linee]
                           segnale ──▶ [Filtro IIR (butter, cheby1, cheby2)] segnale ──▶ filtrato [Per grafico: porta aggiunta]
```

Le serie si chiamano «segnale» e «filtrato».

### 3. Lo spettro

```
[Generatore (oscillatore)] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati [Linee]
```

Con **Automatico** si vede il modulo, con le frequenze in Hz sull'asse x; con **Decibel** si vede in dB.

### 4. Tanti punti

Con 100 campioni e **Punti per serie** 10, escono 10 punti: ogni gruppo è di 20 campioni e ne restano il minimo e il massimo (5 gruppi).

## Errori

| Messaggio | Quando |
|---|---|
| «…» deve essere una lista di numeri o un oggetto { fs, samples } | Su una porta (con il suo nome, per esempio «segnale») c'è un valore che non è un segnale, una lista o uno spettro. |
| «…» ha una frequenza di campionamento (fs) non valida | Nell'oggetto, `fs` è 0, negativa o non è un numero. |
| «…»: il valore N non è un numero | Un campione (il numero N) non è un numero. |
| «…» ha samples e im di lunghezze diverse | Nell'oggetto, `samples` e `im` non hanno la stessa lunghezza. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Un segnale ha più campioni del limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |
| Lo spettro non ha i valori da mostrare (…) | Con uno spettro, la voce scelta in **Mostra** non esiste in quell'oggetto (per esempio *Parte immaginaria* con una densità spettrale). Tra parentesi, il nome del valore mancante. |

## Vedi anche

- [Linee](charts.line) e gli altri grafici che ricevono i dati
- [FFT (np.fft.fft)](sig.fft), [Densità spettrale (Welch)](sig.psd), [Risposta in frequenza (freqz, Bode)](sig.response)
- [Riproduci campioni](sig.play) per un grafico che si disegna in tempo reale
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
