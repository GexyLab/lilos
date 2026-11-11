# Guadagno · Offset

`sig.gain` · Segnali · [Segnali](logicstudio-signals) · versione 1

Cambia il livello di un segnale: lo moltiplica per un guadagno (in volte o in dB), gli aggiunge un offset, può togliergli la media, portarlo a un picco o a un RMS stabilito, o invertirlo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale: un segnale vero `{ fs, t0, samples }` o una lista di numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale cambiato, con la stessa fs e lo stesso `t0`. Se in ingresso c'era una lista semplice, esce una lista semplice. |
| **Exception** (`error`) | oggetto | Un ingresso che non è un segnale, o un segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Guadagno** (`gain`) | numero | 1 | Il fattore per cui si moltiplica. |
| **Guadagno in** (`unit`) | volte (×) / decibel (dB) | volte | Come leggere il guadagno. Con **dB** il fattore è `10^(guadagno/20)`: 6 dB sono circa ×2, −20 dB sono ×0,1. |
| **Offset (aggiunto alla fine)** (`offset`) | numero | 0 | Un valore sommato a ogni campione dopo il guadagno. |
| **Togli prima la media (continua)** (`removeMean`) | sì / no | no | Prima di tutto sottrae la media del segnale (la componente continua). |
| **Normalizza** (`normalize`) | no / picco al livello / RMS al livello | no | Porta il valore massimo `abs(x)` (picco) o il valore efficace (RMS) al **Livello**. |
| **Livello** (`level`) | numero da 0 in su | 1 | Il picco o l'RMS voluti. Si vede solo con **Normalizza** su picco o RMS. |
| **Inverti (× −1)** (`invert`) | sì / no | no | Cambia il segno del guadagno. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso. Un segnale vero porta già la sua fs. |

## Come funziona

Per ogni segnale che arriva, i passi sono sempre in quest'ordine:

1. **Togli la media**, se è acceso;
2. **Normalizza**, se è acceso: moltiplica per `livello / picco` (o `livello / RMS`);
3. **Guadagno** (e **Inverti**): moltiplica per il guadagno, preso in volte o convertito da dB;
4. **Offset**: somma la costante.

In formula: `y = (x' · normalizzazione) · guadagno · (±1) + offset`.

- Un segnale tutto a zero non si può normalizzare (picco o RMS 0): in quel caso la normalizzazione viene saltata.
- Una lista semplice entra a **fs delle liste semplici** ed esce come lista semplice; un segnale esce come segnale con la stessa fs e lo stesso `t0`. Una parte immaginaria di un segnale complesso non viene mantenuta.

## Un po' di teoria

- **dB.** Un guadagno in decibel è `G_dB = 20·log₁₀(guadagno)` per le ampiezze. Quindi +6,02 dB = ×2, +20 dB = ×10, −6,02 dB = ×0,5, 0 dB = ×1. Per le *potenze* la formula è `10·log₁₀`, che dà la stessa tabella perché la potenza è l'ampiezza al quadrato. Vedi [dB ↔ lineare](sig.db).
- **Offset.** Aggiungere una costante cambia solo la componente continua (la riga a 0 Hz dello spettro); non cambia le altre frequenze né l'ampiezza picco-picco.
- **Togliere la media** azzera la riga a 0 Hz ed è utile prima di una FFT, per non nascondere le basse frequenze sotto la continua.
- **Picco o RMS.** Normalizzare al picco usa tutto l'intervallo senza saturare; normalizzare all'RMS porta segnali diversi alla stessa energia media (stessa "sonorità"). Un seno ha picco = `√2 · RMS` (fattore di cresta 1,414).
- **Guadagno negativo** (o **Inverti**) ruota la fase di 180°: lo spettro in ampiezza non cambia.

## Esempi

### 1. Un seno da ±1 a ±0,5, spostato verso l'alto

```
[Generatore (oscillatore)] segnale ──▶ segnale [Guadagno · Offset] segnale ──▶ segnale [Per grafico]
```

Con **Guadagno** 0,5 e **Offset** 0,5 il seno da −1…+1 diventa un'onda da 0 a 1.

### 2. Preparare un segnale per la FFT

```
[Segnale da lista] segnale ──▶ segnale [Guadagno · Offset] segnale ──▶ segnale [Finestra (scipy.signal.get_window)] segnale ──▶ segnale [FFT (np.fft.fft)]
```

Con **Togli prima la media** acceso la riga a 0 Hz sparisce e le frequenze basse si vedono.

### 3. Numeri

- Lista `[1, −1, 0,5]` con **Guadagno** 6,0206 **dB** → circa `[2, −2, 1]`.
- Lista `[2, 4, 6, 4]` con **Togli la media**, **Normalizza** sul picco a 1 e **Offset** 0,5 → `[−0,5, 0,5, 1,5, 0,5]`.
- Segnale `[3, −3, 3, −3]` con **Normalizza** a RMS 1 → `[1, −1, 1, −1]`.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale manca | Il blocco parte senza segnale in ingresso. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero, un testo o un oggetto che non è un segnale. |
| Il segnale: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il segnale ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Più campioni del limite (vedi [Limiti del motore](logicstudio-engine/limits)). |

## Vedi anche

- [Somma · Prodotto di segnali](sig.combine) per combinare due segnali
- [dB ↔ lineare](sig.db) per convertire valori da e verso i dB
- [Non linearità (clip, raddrizza)](sig.nonlinear) per saturare o raddrizzare
- [Misure (RMS, picco, media)](sig.measure) per leggere picco, RMS e media prima di normalizzare
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
