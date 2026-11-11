# Modula (AM, FM, PM)

`sig.modulate` · Segnali · [Segnali](logicstudio-signals) · versione 1

Imprime un **messaggio** (un segnale lento: voce, una misura) su una **portante** (una sinusoide veloce): modulazione di ampiezza **AM**, **DSB-SC** (portante soppressa), di frequenza **FM** o di fase **PM**. È il modo in cui si manda un messaggio su un canale radio o su un cavo. [Demodula (AM, FM, PM)](sig.demodulate), con le stesse impostazioni, lo recupera.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **messaggio** (`signal`) | qualsiasi | Il messaggio: un oggetto `{ fs, t0, samples }` o una lista di numeri (presa come segnale alla **fs delle liste semplici**). Di solito vale tra −1 e 1. La parte immaginaria `im`, se c'è, viene ignorata. |
| **azzera** (`reset`) | impulso | Riparte da capo (serve solo per la FM, che ricorda l'integrale del messaggio). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale modulato** (`signal`) | oggetto | Il segnale modulato `{ fs, t0, samples }`, con la `fs` e il `t0` del messaggio. Esce sempre come segnale, anche se è arrivata una lista. |
| **Exception** (`error`) | oggetto | Portante non valida, ampiezza non valida, messaggio non valido o troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Modulazione** (`kind`) | AM (con portante), DSB-SC (portante soppressa), FM, PM | AM | Il tipo di modulazione. |
| **Frequenza della portante (Hz)** (`carrier`) | 0 o più, sotto fs/2 | 100 | La frequenza della sinusoide veloce. |
| **Ampiezza della portante** (`amplitude`) | maggiore di 0 | 1 | L'ampiezza A della portante. |
| **Indice di modulazione m** (`index`) | 0 o più | 0,5 | Quanto il messaggio fa variare l'ampiezza. Si vede solo con **AM**. |
| **Deviazione (Hz per unità del messaggio)** (`deviation`) | maggiore di 0 | 100 | Di quanti Hz si sposta la frequenza per ogni unità del messaggio. Si vede solo con **FM**. |
| **Deviazione di fase (rad per unità)** (`phaseDev`) | maggiore di 0 | 1,5708 | Di quanti radianti si sposta la fase per ogni unità del messaggio (1,5708 = π/2). Si vede solo con **PM**. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri. |

**Modula** e **Demodula** hanno le **stesse impostazioni** (Demodula ne ha una in più per il DSB-SC): con gli stessi valori fanno una coppia che funziona. Il passa-basso della demodulazione DSB-SC compare solo in Demodula.

## Come funziona

Con `x[n]` il messaggio, `t = t0 + n/fs` il tempo, `A` l'ampiezza e `fc` la portante:

| Modulazione | Segnale modulato |
|---|---|
| **AM** | `A · (1 + m · x) · cos(2π·fc·t)` |
| **DSB-SC** | `A · x · cos(2π·fc·t)` |
| **FM** | `A · cos(2π·fc·t + 2π·kf · ∫x dt)`, con `kf` la deviazione in Hz per unità |
| **PM** | `A · cos(2π·fc·t + kp · x)`, con `kp` la deviazione di fase in rad per unità |

- La portante dipende dal **tempo vero** `t = t0 + n/fs`, quindi finestre consecutive (con `t0` che continua) si uniscono senza salti nella fase della portante.
- La **FM** ricorda l'**integrale** del messaggio tra una finestra e la successiva (somma `x/fs`): finestre consecutive si uniscono senza salti. Se `t0` di una finestra **non continua** quella di prima (più di 1,5 campioni di scarto), l'integrale riparte da 0. **azzera** lo riporta a 0.
- AM, DSB-SC e PM non ricordano niente: ogni campione dipende solo dal messaggio in quel punto.
- La portante deve stare **sotto fs/2**: altrimenti c'è aliasing e il blocco dà un errore. Ma serve di più: anche le bande laterali devono starci (la fs deve essere almeno più del doppio di `fc + banda del messaggio`; per la FM, più del doppio di `fc + deviazione + banda`).

## Un po' di teoria

Un messaggio `x(t)` è lento; per trasmetterlo si cambia una caratteristica di una portante `A·cos(2π·fc·t + φ)`:

- **AM**: cambia l'**ampiezza**. L'indice `m` dice quanto: con `|m·x| ≤ 1` l'inviluppo non diventa mai negativo e si recupera con un semplice rivelatore di inviluppo. Con `m·|x|` oltre 1 c'è **sovramodulazione** e il messaggio si deforma. Occupa una banda di `2·B` (B = banda del messaggio): due bande laterali attorno alla portante, che resta nello spettro.
- **DSB-SC** (double side band, suppressed carrier): `A·x·cos(2π·fc·t)`, senza la portante. Risparmia potenza, ma per recuperarlo serve la portante di riferimento (demodulazione **coerente**).
- **FM**: cambia la **frequenza istantanea**: `f(t) = fc + kf·x(t)`. La fase è l'integrale della frequenza, per questo c'è l'integrale. L'ampiezza è costante. L'indice è `β = Δf/B`, con `Δf = kf·max|x|`, e la banda vale circa `2·(Δf + B)` (regola di Carson). È meno sensibile al rumore dell'AM.
- **PM**: cambia direttamente la **fase**: `φ(t) = kp·x(t)`. La frequenza istantanea è `fc + (kp/2π)·dx/dt`, quindi la PM è come una FM con il messaggio derivato.

## Esempi

### 1. Una AM

`fs` = 10000 Hz, messaggio sinusoidale 50 Hz di ampiezza 1, **Modulazione** AM, portante 1000 Hz, `m` = 0,5:

```
[Generatore (oscillatore): 50 Hz] segnale ──▶ messaggio [Modula (AM, FM, PM)] segnale modulato ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
```

Il segnale oscilla a 1000 Hz con un inviluppo che va da 0,5 a 1,5: `A·(1 ± 0.5)`. Sul messaggio `[1, 1, 1, -1, -1]` il segnale modulato è `[1.5, 1.2135, 0.4635, −0.1545, −0.4045]`.

### 2. Una FM

Lo stesso messaggio, **Modulazione** FM, **Deviazione** 200 Hz per unità: la frequenza istantanea oscilla tra 800 e 1200 Hz, l'ampiezza resta 1. Con messaggio a 50 Hz l'indice è `β = 200/50 = 4`, la banda circa `2·(200 + 50)` = 500 Hz.

### 3. Una coppia Modula e Demodula

```
[Generatore (oscillatore): 50 Hz] segnale ──▶ messaggio [Modula (AM, FM, PM)] segnale modulato ──▶ segnale modulato [Demodula (AM, FM, PM)] messaggio ──▶ segnale o spettro [Per grafico]
```

Con le stesse impostazioni in tutti e due i blocchi, il messaggio torna uguale a quello iniziale (in AM e PM praticamente senza errore; in FM con un piccolo errore di calcolo), tranne ai bordi della finestra.

## Errori

| Messaggio | Quando |
|---|---|
| La portante (… Hz) deve stare sotto fs/2 (… Hz), altrimenti c'è aliasing | **Frequenza della portante** non è minore di fs/2. |
| L'ampiezza della portante deve essere più di 0 | **Ampiezza della portante** è 0 o meno. |
| Il messaggio manca | Su **messaggio** è arrivato un valore vuoto (`null`). |
| Il messaggio deve essere una lista di numeri o un oggetto { fs, samples } | È arrivato un altro tipo di valore. |
| Il messaggio ha una frequenza di campionamento (fs) non valida | `fs` non è maggiore di 0. |
| Il messaggio ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il messaggio: il valore N non è un numero | Il campione numero N non è un numero. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il messaggio supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Demodula (AM, FM, PM)](sig.demodulate) per recuperare il messaggio
- [Generatore (oscillatore)](sig.oscillator) per messaggio e portante
- [FFT (np.fft.fft)](sig.fft) per vedere le bande laterali
- [Inviluppo (scipy.signal.hilbert)](sig.envelope) per l'inviluppo di un segnale
- [Filtro IIR (butter, cheby1, cheby2)](sig.iir) per limitare la banda
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
