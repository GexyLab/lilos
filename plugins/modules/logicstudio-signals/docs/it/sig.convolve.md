# Convoluzione (np.convolve)

`sig.convolve` · Segnali · [Segnali](logicstudio-signals) · versione 1

Fa la **convoluzione** di due segnali: il segnale **a** con la risposta all'impulso **h** (porta **b**). È quello che fa un filtro lineare: l'uscita è l'ingresso «spalmato» sulla risposta all'impulso. Serve per applicare a un segnale una risposta all'impulso qualsiasi (un filtro FIR, un'eco, un riverbero, un lisciamento), anche lunga. Funziona su due finestre intere, senza ricordare niente tra una chiamata e la successiva.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`a`) | qualsiasi | Il segnale: un oggetto `{ fs, t0, samples }` o una lista di numeri (presa come segnale alla **fs delle liste semplici**). |
| **risposta all'impulso h** (`b`) | qualsiasi | La risposta all'impulso, nello stesso formato. Se sono tutti e due segnali (oggetti), devono avere la stessa `fs`. |

Il blocco calcola quando **tutti e due** gli ingressi hanno un valore, e di nuovo a ogni nuovo valore su uno dei due.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il risultato, un segnale `{ fs, t0, samples }` con la `fs` di **a**. Esce sempre come segnale, anche se sono arrivate liste. |
| **Exception** (`error`) | oggetto | Segnali non validi, vuoti o con `fs` diverse; risultato troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Modo** (`mode`) | completa (N + M − 1), stessa lunghezza di a, valida (solo sovrapposizione piena), circolare (lunghezza di a) | completa | Quale parte del risultato tenere (vedi sotto). |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri. |

## Come funziona

Con N campioni in **a** e M in **b**:

| Modo | Lunghezza | Cosa tiene |
|---|---|---|
| **completa** | N + M − 1 | Tutto il risultato, comprese le code all'inizio e alla fine. |
| **stessa lunghezza di a** | N | La parte centrale, allineata ad **a**: la risposta all'impulso è «centrata». |
| **valida** | \|N − M\| + 1 | Solo dove i due segnali si sovrappongono del tutto, senza i bordi. L'istante `t0` avanza di conseguenza. |
| **circolare** | N | La convoluzione «che si arrotola» (ciclica), calcolata con la FFT: **b** è tagliata, o completata con zeri, fino a N campioni. È quella dei filtri fatti con la FFT. |

- Il tempo `t0` del risultato è quello di **a** (nel modo valida, avanza di `(min(N, M) − 1)/fs`).
- Se **a** e **b** sono tutti e due oggetti con `fs` diverse, il blocco dà un errore: porta prima uno dei due alla stessa `fs` con [Ricampiona (resample)](sig.resample). Una lista di numeri è sempre presa alla **fs delle liste semplici**, senza controllo.
- Per segnali lunghi il calcolo passa dalla FFT, ed è veloce; nel modo circolare i risultati possono avere un piccolo rumore di arrotondamento (dell'ordine di 1e-15).
- Nei modi diversi da circolare, la lunghezza `N + M − 1` non può superare il limite del motore.

## Un po' di teoria

La **convoluzione** di `x` con `h` è

`y[n] = Σ x[k] · h[n − k]`   (somma su tutti i k per cui i due indici esistono)

Ogni campione di `x` mette sull'uscita una copia di `h`, spostata nel tempo e moltiplicata per quel campione; l'uscita è la somma di tutte le copie. Se `h` ha M campioni, la convoluzione completa ne ha `N + M − 1`.

- È **commutativa** (`x * h = h * x`), associativa e distributiva rispetto alla somma.
- L'uscita di un sistema lineare e invariante nel tempo (LTI) è la convoluzione dell'ingresso con la sua **risposta all'impulso**. Per questo un filtro FIR con coefficienti `b` è la convoluzione con `b`.
- **Teorema della convoluzione**: la convoluzione nel tempo è il prodotto nella frequenza, `Y(f) = X(f) · H(f)`. La convoluzione **circolare** è proprio il prodotto delle FFT, mentre quella completa richiede di completare con zeri a `N + M − 1` campioni.
- Convolvere con un impulso `[1]` non cambia niente; con un impulso ritardato di k campioni ritarda il segnale di k campioni.

## Esempi

### 1. I modi su tre numeri

**a** = `[1, 2, 3]`, **h** = `[0, 1, 0.5]`:

- completa → `[0, 1, 2.5, 4, 1.5]`;
- stessa lunghezza di a → `[1, 2.5, 4]`;
- valida → `[2.5]` (un solo punto: la sovrapposizione piena);
- circolare → `[4, 2.5, 2.5]`.

Con le liste `[1, 2, 3]` e `[1, 1]` (somma di due vicini) la completa dà `[1, 3, 5, 3]`.

### 2. Un'eco

Un segnale con una risposta all'impulso `[1, 0, 0, 0, 0.5]`: l'uscita è il segnale più una copia, ritardata di 4 campioni e a metà ampiezza.

```
[Segnale da lista] segnale ──▶ segnale (a) [Convoluzione (np.convolve)] segnale ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
[Segnale da lista: eco] segnale ──▶ risposta all'impulso h (b)
```

### 3. Una media mobile con la risposta all'impulso

Una [Costante · Variabile](core.value) di tipo JSON con `[0.2, 0.2, 0.2, 0.2, 0.2]` come risposta all'impulso **h**: l'uscita è la media mobile di 5 campioni del segnale (come un [Filtro FIR (firwin)](sig.fir) di tipo media mobile, ma su una finestra intera e senza stato tra una finestra e la successiva).

```
[Generatore (oscillatore)] segnale ──▶ segnale (a) [Convoluzione (np.convolve)] segnale ──▶ segnale o spettro [Per grafico]
[Costante · Variabile: [0.2, 0.2, 0.2, 0.2, 0.2]] valore ──▶ risposta all'impulso h (b)
```

Con il modo **stessa lunghezza di a** l'uscita ha la lunghezza e il tempo del segnale.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale a manca / Il segnale b manca | Un valore vuoto (`null`) su **a** o su **b**. |
| Il segnale a deve essere una lista di numeri o un oggetto { fs, samples } | Su **a** è arrivato un altro tipo di valore. |
| Il segnale b deve essere una lista di numeri o un oggetto { fs, samples } | Su **b** è arrivato un altro tipo di valore. |
| Il segnale a ha una frequenza di campionamento (fs) non valida | In **a** (o **b**: «Il segnale b …»), `fs` non è maggiore di 0. |
| Il segnale a ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il segnale a: il valore N non è un numero | Il campione numero N di **a** (o di **b**: «Il segnale b: …») non è un numero. |
| I segnali hanno fs diverse (… e … Hz): usa prima Ricampiona | **a** e **b** sono oggetti con `fs` diverse. |
| I segnali non possono essere vuoti | Una delle due liste non ha campioni. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | **a** o **b**, o la convoluzione completa `N + M − 1`, supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Correlazione (np.correlate)](sig.correlate) per misurare quanto due segnali si somigliano e il loro ritardo
- [Filtro FIR (firwin)](sig.fir) per filtrare con un FIR a stato continuo tra le finestre
- [Ricampiona (resample)](sig.resample) per portare due segnali alla stessa `fs`
- [FFT (np.fft.fft)](sig.fft) e [IFFT (np.fft.ifft)](sig.ifft) per fare lo stesso calcolo nella frequenza
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
