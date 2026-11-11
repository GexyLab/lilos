# Rumore (np.random)

`sig.noise` · Segnali · [Segnali](logicstudio-signals) · versione 1

Genera rumore casuale: bianco (gaussiano o uniforme), rosa o marrone. Serve per provare filtri e misure su un segnale «sporco», o per sommarlo a un seno con [Somma · Prodotto di segnali](sig.combine).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **genera** (`generate`) | impulso | Un impulso genera una nuova finestra. Se **non è collegata**, il blocco manda una finestra all'avvio del programma. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | La finestra: `{ fs, t0, samples }`. |
| **Exception** (`error`) | oggetto | Frequenza di campionamento o numero di campioni non validi, segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tipo** (`color`) | Bianco, gaussiano / Bianco, uniforme / Rosa (1/f) / Marrone (1/f²) | Bianco, gaussiano | Il «colore» del rumore, cioè come si distribuisce la potenza tra le frequenze. |
| **Deviazione standard (RMS)** (`amplitude`) | 0 o più | 1 | Quanto è «forte» il rumore: il valore efficace attorno alla media. |
| **Media (continua)** (`mean`) | numero | 0 | Valore sommato a tutti i campioni. |
| **Seme (0 = ogni volta diverso)** (`seed`) | 0 o più, intero | 0 | Con un numero maggiore di 0 il rumore è sempre lo stesso a ogni avvio; con 0 è diverso a ogni avvio. |
| **Frequenza di campionamento fs (Hz)** (`fs`) | più di 0 | 1000 | Quanti campioni al secondo. |
| **Campioni N** (`samples`) | da 1 | 1000 | Quanti campioni ha ogni finestra. |
| **Il tempo continua (ogni finestra dopo l'ultima)** (`continue`) | sì / no | sì | Con sì, `t0` di ogni finestra riparte da dove è finita la precedente; con no, ogni finestra ha `t0 = 0`. |

## Come funziona

- All'avvio il tempo parte da 0 e, se **genera** non è collegata, esce una finestra. Con **genera** collegata esce una finestra a ogni impulso.
- Il generatore casuale è inizializzato **una volta per avvio** (con il **Seme**, o a caso se è 0) e **prosegue** tra una finestra e l'altra: due finestre di fila non si ripetono. Con lo stesso seme, ogni avvio dà la stessa sequenza.
- I quattro tipi:
  - **Bianco, gaussiano**: numeri con distribuzione normale (a campana), media 0 e deviazione standard 1, poi moltiplicati per **Deviazione standard** e sommati alla **Media**.
  - **Bianco, uniforme**: numeri distribuiti in modo uniforme, scalati perché anche qui la deviazione standard sia 1 (vanno da −√3 a +√3, prima della scala).
  - **Rosa (1/f)**: gaussiano filtrato (filtro di Paul Kellet) perché la potenza scenda di circa 3 dB per ottava; scalato per avere deviazione standard circa 1.
  - **Marrone (1/f²)**: gaussiano «integrato» con una perdita (coefficiente 0,998), cioè una passeggiata casuale che torna verso lo zero; scalato per avere deviazione standard circa 1.
- Il rumore non dipende dal tempo: **Il tempo continua** cambia soltanto il `t0` della finestra.
- Il valore efficace misurato su una finestra corta si discosta un po' da quello impostato (con 1000 campioni, di qualche percento); con più campioni si avvicina.

## Un po' di teoria

Il rumore è un segnale casuale: se ne descrive la **statistica**, non i singoli valori. Contano la **media** (la componente continua), la **deviazione standard** `σ` (il valore efficace, cioè RMS, attorno alla media; la **potenza** è `σ²`) e la **densità spettrale di potenza**, cioè come la potenza si distribuisce in frequenza.

- Il rumore **bianco** ha uno spettro piatto: ogni frequenza ha la stessa potenza (come la luce bianca ha tutti i colori). I campioni sono indipendenti tra loro. Se il rumore bianco ha deviazione standard `σ` e frequenza di campionamento `fs`, la sua densità di potenza (a una banda: da 0 a `fs/2`) è `2σ²/fs` per Hz. Gaussiano o uniforme cambia solo la forma della distribuzione dei valori, non lo spettro.
- Il rumore **rosa** ha densità proporzionale a `1/f`: −3 dB per ottava, la stessa potenza in ogni ottava. È tipico di molti fenomeni naturali ed elettronici (rumore di sfarfallio).
- Il rumore **marrone** (o rosso, browniano) ha densità proporzionale a `1/f²`: −6 dB per ottava. È l'integrale del rumore bianco.

Sommare un seno e un rumore bianco di deviazione standard `σ` dà un rapporto segnale/rumore `SNR = A²/2 / σ²` (in dB: `10·log10`). Per vedere lo spettro del rumore usa [Densità spettrale (Welch)](sig.psd): una sola FFT di rumore è molto irregolare, perché ogni valore è casuale, mentre la media di più segmenti la rende leggibile.

## Esempi

### 1. Un seno con rumore

```
[Generatore (oscillatore)] segnale ──▶ a [Somma · Prodotto di segnali] segnale ──▶ segnale [Per grafico] dati del grafico ──▶ dati [Linee]
[Rumore (np.random)]       segnale ──▶ b
```

Con **fs** e **Campioni N** uguali nei due blocchi (Somma accetta solo segnali con la stessa fs) e rumore con deviazione standard 0,2 si vede il seno «tremolante».

### 2. Rumore ripetibile

Con **Seme** 1, **Tipo** gaussiano, **N** 1000 e **Media** 0, ogni avvio dà la stessa sequenza, con media vicina a 0 e RMS vicino a 1 (circa 1,03 con questo seme). Con **Seme** 0 ogni avvio è diverso.

### 3. Il colore del rumore

Due [Rumore](sig.noise), uno bianco e uno rosa, con **N** 4096, a una [Densità spettrale (Welch)](sig.psd) ciascuno e poi a un [Per grafico](sig.toChart) con **Mostra** su Decibel: la retta del rosa scende, quella del bianco è piatta.

## Errori

| Messaggio | Quando |
|---|---|
| La frequenza di campionamento deve essere più di 0 | **fs** è 0 o negativa. |
| Serve almeno un campione | **Campioni N** è minore di 1. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | **Campioni N** supera il limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |

## Vedi anche

- [Generatore (oscillatore)](sig.oscillator) per un segnale pulito da sommare
- [Somma · Prodotto di segnali](sig.combine) per sommarli
- [Densità spettrale (Welch)](sig.psd) per vedere lo spettro del rumore
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
