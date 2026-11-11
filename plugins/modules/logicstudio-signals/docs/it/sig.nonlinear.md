# Non linearità (clip, raddrizza)

`sig.nonlinear` · Segnali · [Segnali](logicstudio-signals) · versione 1

Applica a ogni campione una funzione non lineare: taglio netto, saturazione morbida, raddrizzatore a semionda o a onda intera, zona morta, quadrato o segno.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale: un segnale vero `{ fs, t0, samples }` o una lista di numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale cambiato, con la stessa fs e lo stesso `t0`. Se in ingresso c'era una lista semplice, esce una lista semplice. |
| **Exception** (`error`) | oggetto | Un massimo minore del minimo in **Taglia**, un segnale troppo lungo, o un ingresso che non è un segnale. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | vedi la tabella sotto | taglia | La funzione da applicare. |
| **Minimo** (`min`) | numero | −0,5 | Il livello più basso. Si vede solo con **taglia**. |
| **Massimo** (`max`) | numero | 0,5 | Il livello più alto. Si vede solo con **taglia**. |
| **Spinta (drive)** (`drive`) | da 0 in su | 2 | Quanto è forte la saturazione. Si vede solo con **saturazione morbida (tanh)**. |
| **Soglia** (`threshold`) | da 0 in su | 0,1 | La larghezza della zona morta da ogni lato dello zero. Si vede solo con **zona morta**. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso. Un segnale vero porta già la sua fs. |

| Operazione | Funzione per ogni campione `x` | Esempio (con le impostazioni predefinite) su `[−1, −0,3, 0, 0,05, 0,3, 1]` |
|---|---|---|
| **Taglia** (`clip`) | `x` tenuto tra **Minimo** e **Massimo** | `[−0,5, −0,3, 0, 0,05, 0,3, 0,5]` |
| **Saturazione morbida** (`tanh`) | `tanh(drive·x) / tanh(drive)` | `[−1, −0,557, 0, 0,103, 0,557, 1]` |
| **Raddrizzatore a semionda** (`halfWave`) | `max(0, x)` | `[0, 0, 0, 0,05, 0,3, 1]` |
| **Raddrizzatore a onda intera** (`fullWave`) | `abs(x)` | `[1, 0,3, 0, 0,05, 0,3, 1]` |
| **Zona morta** (`deadzone`) | 0 se `abs(x) ≤ soglia`, altrimenti `x` meno `soglia` verso lo zero | `[−0,9, −0,2, 0, 0, 0,2, 0,9]` |
| **Quadrato** (`square`) | `x²` | `[1, 0,09, 0, 0,0025, 0,09, 1]` |
| **Segno** (`sign`) | −1, 0 o +1 | `[−1, −1, 0, 1, 1, 1]` |

## Come funziona

Ogni campione è trattato da solo, senza memoria: l'uscita dipende solo dal valore che entra in quel momento. Il segnale esce con la stessa lunghezza, fs e `t0`.

- **Taglia** con **Massimo** minore di **Minimo** dà un'eccezione; con i due uguali il segnale diventa una costante.
- **Saturazione morbida** è divisa per `tanh(drive)`, quindi un ingresso di ±1 esce sempre a ±1 qualunque sia la spinta. Con **Spinta** 0 il segnale passa invariato. Per valori piccoli di `x` la curva è quasi una retta con pendenza `drive / tanh(drive)`.
- **Zona morta** toglie la parte del segnale dentro ±soglia e accorcia di `soglia` tutto il resto (così non c'è un salto).
- **Segno** dà 0 per un campione esattamente a 0.
- Una parte immaginaria di un segnale complesso non viene mantenuta.

## Un po' di teoria

Un sistema è *lineare* se l'uscita per una somma è la somma delle uscite. Le operazioni di questo blocco non lo sono, e il risultato lo si vede nello spettro: **nascono frequenze nuove**.

- **Saturazione (taglia, tanh).** Una curva simmetrica crea solo armoniche **dispari** (3f, 5f, 7f…). Il taglio netto ne crea molte e forti (un seno molto tagliato tende a un'onda quadra); la tanh ne crea di meno e che scendono in fretta: suono più "caldo". Più la spinta è alta, più il segnale si avvicina a un'onda quadra.
- **Raddrizzatore a onda intera `|x|`.** Un seno di frequenza `f` diventa un segnale di frequenza `2f` (più una componente continua `2A/π ≈ 0,637·A` e le sue armoniche pari).
- **Semionda.** Ha una continua `A/π`, la fondamentale `f` e armoniche **pari**. È il primo passo per estrarre un inviluppo (poi si filtra passa-basso).
- **Quadrato.** `sin²(ωt) = ½ − ½·cos(2ωt)`: una continua e il doppio della frequenza. Con due frequenze `f₁` e `f₂` nascono `f₁ ± f₂` (intermodulazione); con il quadrato di una somma di toni si rivelano le frequenze di battimento.
- **Zona morta.** Taglia i segnali piccoli: lo si vede in un amplificatore senza polarizzazione (*crossover distortion*) o come una soglia di rumore.
- **Segno (comparatore).** Trasforma qualsiasi segnale in un'onda a due livelli: ne conserva solo gli attraversamenti dello zero. Un seno diventa un'onda quadra.

## Esempi

### 1. Un seno tagliato

```
[Generatore (oscillatore)] segnale ──▶ segnale [Non linearità (clip, raddrizza): taglia −0,5 … 0,5] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ dati [Per grafico]
```

Il seno da ±1 resta schiacciato a ±0,5; nello spettro, oltre alla riga di partenza, compaiono righe a 3f, 5f, 7f…

### 2. Raddrizzare e filtrare

```
[Generatore (oscillatore)] segnale ──▶ segnale [Non linearità (clip, raddrizza): onda intera] segnale ──▶ segnale [Filtro IIR (butter, cheby1, cheby2): passa-basso] segnale ──▶ segnale [Per grafico]
```

Il passa-basso toglie i picchi: resta la media del valore assoluto, un segnale quasi continuo (un indicatore di livello).

### 3. Un comparatore con soglia

Collega [Somma · Prodotto di segnali](sig.combine) in **Sottrai** (segnale − soglia) a un blocco **Segno**: l'uscita è +1 quando il segnale supera la soglia, −1 sotto.

## Errori

| Messaggio | Quando |
|---|---|
| Il massimo deve essere almeno il minimo | In **Taglia**, **Massimo** è minore di **Minimo**. |
| Operazione sconosciuta: … | L'operazione salvata nel progetto non esiste (non succede scegliendola dal menu). |
| Il segnale manca | Il blocco parte senza segnale in ingresso. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero, un testo o un oggetto che non è un segnale. |
| Il segnale: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il segnale ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Più campioni del limite (vedi [Limiti del motore](logicstudio-engine/limits)). |

## Vedi anche

- [Inviluppo (scipy.signal.hilbert)](sig.envelope) per l'inviluppo di un segnale senza raddrizzare
- [Distorsione (THD, SNR, SINAD)](sig.distortion) per misurare le armoniche che nascono
- [Quantizza (ADC)](sig.quantize) per arrotondare ai livelli di un convertitore
- [Guadagno · Offset](sig.gain) per portare il segnale al livello giusto prima di saturarlo
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
