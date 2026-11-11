# Risposta in frequenza (freqz, Bode)

`sig.response` · Segnali · [Segnali](logicstudio-signals) · versione 1

Calcola come un filtro tratta ogni frequenza: **modulo** (guadagno, anche in dB), **fase** e **ritardo di gruppo**, cioè il diagramma di Bode, e in più **poli**, **zeri** e se il filtro è **stabile**. Si collega all'uscita **coefficienti** dei blocchi filtro e non ha bisogno di nessun segnale: i filtri mandano i coefficienti già all'avvio, quindi la risposta si vede subito.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **coefficienti** (`coefficients`) | qualsiasi | Il filtro: un oggetto `{ b, a }`, un oggetto `{ sos }` (sezioni del secondo ordine `[b0, b1, b2, a0, a1, a2]`), una lista di numeri (un filtro FIR: solo `b`), anche in un testo JSON. Se l'oggetto ha una `fs` (come quello dei blocchi filtro), è usata per le frequenze. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risposta** (`response`) | oggetto | `{ kind: "response", fs, f, mag, db, phase, groupDelay }`: le frequenze `f` (Hz), il modulo `mag` (rapporto), il modulo `db` (dB, mai sotto −300), la fase `phase` (**gradi**, svolta, senza salti di 360°) e il ritardo di gruppo `groupDelay` (**secondi**). Per [Per grafico](sig.toChart) e i grafici. |
| **poli** (`poles`) | lista | I poli di `H(z)`: una lista di oggetti `{ re, im, abs }` (parte reale, parte immaginaria, modulo). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **zeri** (`zeros`) | lista | Gli zeri di `H(z)`, nello stesso formato. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **stabile** (`stable`) | sì/no | Vero se tutti i poli sono dentro il cerchio unitario (`abs < 1`). Un filtro FIR è sempre stabile. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Coefficienti non validi. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Punti** (`points`) | da 8 a 8192 | 512 | Quante frequenze calcolare. |
| **Frequenze** (`scale`) | lineare, logaritmica (decadi) | lineare | Come sono distribuite le frequenze, da 0 (o dalla più bassa) a fs/2. Quella logaritmica va bene per il diagramma di Bode. |
| **Frequenza più bassa (Hz)** (`fmin`) | maggiore di 0 | 1 | Dove parte la scala logaritmica (non oltre fs/20). Si vede solo con **logaritmica**. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento da usare quando i coefficienti non portano una `fs` (una lista, o un `{ b, a }` scritto a mano). |

## Come funziona

- A ogni nuovo valore su **coefficienti** il blocco rifà tutto il calcolo. Non serve nessun segnale: i blocchi filtro mandano i coefficienti **all'avvio** (progettati alla loro **fs delle liste semplici**), poi di nuovo con il primo segnale (alla `fs` vera) e dopo ogni cambio di progetto.
- Le frequenze vanno da 0 (o da **Frequenza più bassa**) a **fs/2**, la frequenza di Nyquist. La `fs` è quella dei coefficienti, se c'è, altrimenti la **fs delle liste semplici**.
- Con le sezioni (`sos`) il modulo è il prodotto dei moduli delle sezioni e la fase è la somma. Poli e zeri sono quelli di tutte le sezioni.
- Il **modulo in dB** non scende sotto −300 dB (dove il filtro vale 0, per esempio nello zero di un notch). La fase è «svolta»: non fa salti di 360° quando passa da −180° a +180°.
- Il **ritardo di gruppo** è calcolato dalla pendenza della fase (`−Δφ/Δω`, con i campioni vicini) e arriva in secondi. In un FIR a fase lineare è costante.
- Per disegnare il diagramma: collega **risposta** a [Per grafico](sig.toChart) (di serie mostra il modulo in dB; con **Mostra** = Fase mostra la fase) e poi a un grafico a [Linee](charts.line). L'asse orizzontale è la frequenza.

## Un po' di teoria

La **risposta in frequenza** è la funzione di trasferimento calcolata sul cerchio unitario, `H(e^(jω))` con `ω = 2π·f/fs`:

`H(e^(jω)) = (b0 + b1·e^(−jω) + b2·e^(−2jω) + …) / (1 + a1·e^(−jω) + a2·e^(−2jω) + …)`

Un segnale sinusoidale a frequenza `f` esce dal filtro con l'ampiezza moltiplicata per il **modulo** `|H|` e la fase aumentata della **fase** `arg H`. Il guadagno in decibel è `20·log10(|H|)`: −3 dB vuol dire circa 0,707 volte l'ampiezza, −6 dB la metà, −20 dB un decimo.

Il **ritardo di gruppo** `τg = −dφ/dω` è il ritardo (in secondi) con cui viaggia un gruppo di frequenze vicine, cioè l'inviluppo del segnale. Se è costante, la forma del segnale non si deforma (fase lineare); se varia con la frequenza (un IIR), frequenze diverse arrivano in tempi diversi.

I **poli** (radici del denominatore) e gli **zeri** (del numeratore) spiegano la risposta: un polo vicino al cerchio unitario, alla frequenza `f`, crea una cresta; uno zero sul cerchio crea un azzeramento. Un filtro causale è **stabile** se tutti i poli stanno dentro il cerchio unitario, `|p| < 1`; un polo fuori fa crescere l'uscita senza fine.

## Esempi

### 1. Il diagramma di Bode di un filtro IIR

```
[Filtro IIR (butter, cheby1, cheby2)] coefficienti ──▶ coefficienti [Risposta in frequenza (freqz, Bode)] risposta ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
```

Con **Frequenze** logaritmica il diagramma è come quello dei libri. Nel filtro IIR le impostazioni cambiano la curva subito.

### 2. Una media di due campioni

Sull'ingresso **coefficienti** arriva la lista `[0.5, 0.5]` (con **fs delle liste semplici** = 1000 Hz, **Punti** 9):

```
[Costante · Variabile: [0.5, 0.5]] valore ──▶ coefficienti [Risposta in frequenza (freqz, Bode)]
```

Le frequenze sono 0, 62,5, 125 … 500 Hz; il modulo è 0 dB a 0 Hz, −3,01 dB a 250 Hz e −300 dB (zero) a 500 Hz; la fase scende da 0° a −90° (a 500 Hz); il ritardo di gruppo è 0,0005 s (mezzo campione); **poli** vuota, **zeri** `[{ re: -1, im: 0, abs: 1 }]`, **stabile** vero.

### 3. Un filtro scritto a mano e il controllo della stabilità

Con `{ "b": [1], "a": [1, -0.5], "fs": 8000 }` le frequenze arrivano a 4000 Hz, c'è un solo polo in `0.5` e **stabile** è vero. Con `"a": [1, -1.1]` il polo è in 1,1 e **stabile** diventa falso:

```
[Equazione alle differenze (lfilter)] coefficienti ──▶ coefficienti [Risposta in frequenza (freqz, Bode)] stabile ──▶ valore [Print (console.log)]
```

## Errori

| Messaggio | Quando |
|---|---|
| I coefficienti non sono JSON valido | Su **coefficienti** è arrivato un testo che non è JSON. |
| I coefficienti devono essere una lista (FIR), { b, a } o { sos } | Non c'è né una lista né un oggetto con `b` o `sos`. |
| La sezione N deve avere 6 coefficienti [b0, b1, b2, a0, a1, a2] | In `sos`, la sezione N non ha 6 numeri. |
| La sezione N ha a0 = 0 | In `sos`, la sezione N ha `a0` = 0. |
| I coefficienti: il valore N non è un numero | Un coefficiente di una lista o di una sezione non è un numero. |
| I coefficienti b: il valore N non è un numero | Come sopra, nella lista `b` di `{ b, a }`. |
| I coefficienti a: il valore N non è un numero | Come sopra, nella lista `a` di `{ b, a }`. |
| Serve almeno un coefficiente b | In `{ b, a }`, la lista `b` è vuota. |
| Il primo coefficiente a (a0) non può essere 0 | In `{ b, a }`, `a` è vuota o comincia con 0. |

## Vedi anche

- [Filtro IIR (butter, cheby1, cheby2)](sig.iir), [Biquad (RBJ, equalizzatore)](sig.biquad), [Filtro FIR (firwin)](sig.fir) e [Equazione alle differenze (lfilter)](sig.difference), che mandano i coefficienti
- [Per grafico](sig.toChart) e [Linee](charts.line) per disegnare il diagramma
- [FFT (np.fft.fft)](sig.fft) per lo spettro di un segnale vero
- [Segnali](logicstudio-signals)
- [Come funziona un blocco](ide/blocks)
