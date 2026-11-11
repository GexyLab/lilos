# Generatore (oscillatore)

`sig.oscillator` · Segnali · [Segnali](logicstudio-signals) · versione 1

Genera un segnale periodico: seno, onda quadra, triangolare, dente di sega o treno di impulsi. Il segnale esce **a finestre** di campioni (un oggetto con frequenza di campionamento, tempo iniziale e campioni), pronto per essere filtrato, misurato o disegnato.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **genera** (`generate`) | impulso | Un impulso genera una nuova finestra. Se **non è collegata**, il blocco manda una finestra all'avvio e una nuova a ogni valore che arriva sulle altre porte. |
| **frequenza** (`frequency`) | numero | Frequenza in Hz; prende il posto di quella delle Proprietà. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **ampiezza** (`amplitude`) | numero | Ampiezza; prende il posto di quella delle Proprietà. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

Un testo con un numero (`"2,5"`) va bene per **frequenza** e **ampiezza**.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | La finestra: `{ fs, t0, samples }`. |
| **Exception** (`error`) | oggetto | Frequenza di campionamento o numero di campioni non validi, segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Forma d'onda** (`wave`) | Seno / Quadra / Triangolo / Dente di sega / Treno di impulsi (0/1) | Seno | La forma di un periodo. |
| **Frequenza (Hz)** (`frequency`) | 0 o più | 50 | Quanti periodi al secondo. |
| **Ampiezza** (`amplitude`) | numero | 1 | Il picco della forma (poi si aggiunge l'offset). |
| **Fase (gradi)** (`phase`) | numero | 0 | Di quanto è anticipata la forma: 90 gradi = un quarto di periodo. |
| **Offset (continua)** (`offset`) | numero | 0 | Valore sommato a tutti i campioni. |
| **Duty cycle (%)** (`duty`) | da 0 a 100 | 50 | La parte del periodo in cui l'onda è «alta». Si vede solo con **Quadra** e **Treno di impulsi**. |
| **Frequenza di campionamento fs (Hz)** (`fs`) | più di 0 | 1000 | Quanti campioni al secondo. |
| **Campioni N** (`samples`) | da 1 | 1000 | Quanti campioni ha ogni finestra. |
| **Il tempo continua (ogni finestra dopo l'ultima)** (`continue`) | sì / no | sì | Con sì, ogni finestra riparte dove è finita la precedente (`t0` cresce e la fase non salta). Con no, ogni finestra comincia a `t0 = 0`. |

## Come funziona

- All'avvio del programma il tempo parte da 0. Se **genera** non è collegata, il blocco manda subito una finestra; ogni nuovo valore su **frequenza** o **ampiezza** ne manda un'altra. Se **genera** è collegata, il blocco manda una finestra **solo** a ogni impulso su **genera**, e i valori su **frequenza** e **ampiezza** valgono dalla finestra dopo.
- Ogni finestra dura `N / fs` secondi. Il campione numero `i` (da 0) si calcola al tempo `t = t0 + i / fs`, con la fase `u = frazione(frequenza · t + fase/360)` che va da 0 a 1 in un periodo, e vale `offset + ampiezza · forma(u)`:
  - **Seno**: `sin(2π·u)`; parte da 0 e sale.
  - **Quadra**: `+1` per `u` minore del duty cycle, `−1` dopo.
  - **Triangolo**: sale da 0 a 1 in un quarto di periodo, scende a −1 al tre quarti, risale a 0.
  - **Dente di sega**: sale da 0 a 1 a metà periodo, poi salta a −1 e risale a 0.
  - **Treno di impulsi**: `1` per `u` minore del duty cycle, `0` dopo.
- Con **Il tempo continua** spuntato e un impulso su **genera** a ogni finestra, i campioni di finestre successive si uniscono senza salti (per esempio con un [Buffer](sig.buffer) o un [Per grafico](sig.toChart) in coda). Il tempo si azzera a ogni avvio del programma.
- Il blocco non controlla che la frequenza sia sotto `fs/2`: sopra quel limite il segnale esce, ma con una frequenza sbagliata (vedi la teoria).

## Un po' di teoria

Un segnale a tempo continuo `x(t)` viene **campionato** prendendo il suo valore ogni `Ts = 1/fs` secondi: `x[n] = x(n·Ts)`. Il seno che genera questo blocco è

`x(t) = A·sin(2π·f·t + φ) + offset`

con `A` ampiezza, `f` frequenza in Hz e `φ` fase (in radianti: gradi · π/180). Il **periodo** è `T = 1/f`, e una finestra con `N` campioni contiene `f·N/fs` periodi.

**Teorema del campionamento (Nyquist–Shannon)**: un segnale si può ricostruire dai suoi campioni solo se contiene frequenze **sotto `fs/2`** (la frequenza di Nyquist). Un seno a frequenza `f` maggiore di `fs/2` produce gli stessi campioni di uno a frequenza più bassa, e si vede come quest'ultimo: è l'**aliasing**. Per esempio, con `fs = 1000` Hz un seno a 950 Hz dà gli stessi campioni (a meno del segno) di uno a 50 Hz.

Le onde quadra, triangolare e a dente di sega non sono sinusoidi: contengono la frequenza di base `f` e le sue **armoniche** (`2f`, `3f`…). La quadra ha solo armoniche dispari, con ampiezze `4A/(π·k)` (k = 1, 3, 5…); poiché le armoniche vanno all'infinito, quelle sopra `fs/2` fanno aliasing e si ripiegano nello spettro: per forme «pulite» tieni `fs` molto più alto della frequenza. Se la finestra non contiene un numero intero di periodi, lo spettro si «sporca» (dispersione): vedi [FFT](sig.fft) e [Finestra](sig.window).

## Esempi

### 1. Un seno da disegnare

Con le impostazioni di serie (50 Hz, `fs` 1000, 1000 campioni) il blocco manda 1 secondo di segnale, cioè 50 periodi:

```
[Generatore (oscillatore)] segnale ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

### 2. Quattro campioni per periodo

Con **Frequenza** 1, **fs** 8 e **Campioni** 8, la finestra è un periodo intero. Con **Seno** i campioni sono `0; 0,7071; 1; 0,7071; 0; −0,7071; −1; −0,7071`. Con **Triangolo**: `0; 0,5; 1; 0,5; 0; −0,5; −1; −0,5`. Con **Dente di sega**: `0; 0,25; 0,5; 0,75; −1; −0,75; −0,5; −0,25`. Con **Quadra** e duty cycle 25: `1; 1; −1; −1; −1; −1; −1; −1`.

### 3. Un flusso continuo a finestre

Un [Intervallo (setInterval)](core.every) manda un impulso ogni secondo a **genera**; ogni impulso fa uscire una nuova finestra che continua la precedente:

```
[Intervallo (setInterval)] impulso ──▶ genera [Generatore (oscillatore)] segnale ──▶ segnale [FFT (np.fft.fft)] ──▶ …
```

## Errori

| Messaggio | Quando |
|---|---|
| La frequenza di campionamento deve essere più di 0 | **fs** è 0 o negativa. |
| Serve almeno un campione | **Campioni N** è minore di 1. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | **Campioni N** supera il limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |

## Vedi anche

- [Rumore (np.random)](sig.noise), [Impulso · Gradino · Rampa](sig.elementary), [Chirp (scipy.signal.chirp)](sig.chirp) per altri segnali di prova
- [FFT (np.fft.fft)](sig.fft) per vedere le frequenze del segnale
- [Per grafico](sig.toChart) per disegnarlo
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
