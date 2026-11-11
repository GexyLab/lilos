# Goertzel (toni, DTMF)

`sig.goertzel` · Segnali · [Segnali](logicstudio-signals) · versione 1

Misura l'**ampiezza di alcune frequenze scelte** in un segnale, senza calcolare tutto lo spettro. È più semplice e leggero di una [FFT](sig.fft) quando si cercano poche frequenze note, e ha una modalità pronta per riconoscere i **toni DTMF**, quelli dei tasti del telefono.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Un segnale `{ fs, t0, samples }` oppure una lista semplice di numeri (presa come segnale a **fs delle liste semplici**). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **ampiezze** (`amplitudes`) | lista | Un'ampiezza per ogni frequenza, nello stesso ordine. Un seno di ampiezza A alla frequenza cercata dà circa A. In modalità DTMF sono 8 valori: le 4 frequenze delle righe (697, 770, 852, 941 Hz) e poi le 4 delle colonne (1209, 1336, 1477, 1633 Hz). |
| **tasto DTMF** (`key`) | testo | Il tasto riconosciuto (`0`–`9`, `*`, `#`, `A`–`D`) in modalità DTMF; testo vuoto se non ce n'è uno chiaro e sempre vuoto nella modalità Frequenze della lista. |
| **frequenza → ampiezza** (`table`) | oggetto | Un oggetto con una chiave per frequenza (come testo, per esempio `"50"`) e l'ampiezza come valore. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Segnale mancante, non valido o vuoto, frequenze scritte male o oltre fs/2. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Toni** (`mode`) | Frequenze della lista, DTMF (tasti del telefono) | Frequenze della lista | Quali frequenze misurare: quelle che scrivi tu o i 8 toni DTMF. |
| **Frequenze (Hz)** (`frequencies`) | lista JSON di numeri | `[50, 100, 150]` | Le frequenze da misurare, per esempio `[50, 100]`. Si accetta anche un testo con numeri separati da spazi, virgole o punti e virgola. Si vede solo con **Toni** = Frequenze della lista. |
| **Ampiezza minima di un tono del tasto** (`minLevel`) | 0 o più | 0,05 | Il tono più forte di righe e colonne deve avere almeno questa ampiezza perché il tasto sia riconosciuto. Si vede solo con **Toni** = DTMF. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri. |

## Come funziona

Per ogni frequenza `f` il blocco passa i campioni una volta sola con la **ricorrenza di Goertzel** e ricava l'ampiezza. Nessuna finestra viene applicata.

- Ogni frequenza deve stare tra **0 e fs/2**. La frequenza 0 dà il valore medio del segnale.
- **DTMF**: la riga è la frequenza più forte tra le prime 4, la colonna la più forte tra le ultime 4; il tasto è dove si incontrano: righe 697/770/852/941 Hz, colonne 1209/1336/1477/1633 Hz, nell'ordine `1 2 3 A / 4 5 6 B / 7 8 9 C / * 0 # D`. Il tasto è riconosciuto solo se **sia** la riga **sia** la colonna sono almeno **Ampiezza minima** e il secondo tono di ciascun gruppo è meno della metà del primo (cioè la riga e la colonna sono chiare, non due toni uguali). Per i toni DTMF serve `fs` almeno 3266 Hz (1633 Hz sono fs/2); in telefonia si usano 8000 Hz.
- Il risultato è più preciso con finestre che contengono un numero **intero di periodi** del tono: altrimenti l'ampiezza esce un po' più bassa del vero.

## Un po' di teoria

Per una sola frequenza `f`, calcolare la DFT intera costa N·log N. Goertzel fa molto meno con una **ricorrenza** di secondo ordine: con `c = 2·cos(2πf/fs)`

`s[n] = x[n] + c·s[n−1] − s[n−2]`

cominciando da `s = 0`. Dopo gli N campioni, la potenza della componente alla frequenza f è `P = s[N−1]² + s[N−2]² − c·s[N−1]·s[N−2]`, ed è uguale a `|X(f)|²` della DFT calcolata a quella frequenza. L'ampiezza di un tono è `2·√P / N`. Serve un solo moltiplicatore per campione e nessuna memoria per lo spettro: per questo è usato nei telefoni, nei microcontrollori e nei rilevatori di toni.

I **toni DTMF** (dual-tone multi-frequency) sono la somma di due seni, uno di una frequenza "riga" e uno di una "colonna": la coppia identifica il tasto. Le frequenze sono scelte in modo che le armoniche e i prodotti di intermodulazione di una non coincidano con le altre.

## Esempi

### 1. Quanto c'è di 50 e 100 Hz

**Frequenze (Hz)** = `[50, 100]`, un seno di 50 Hz e ampiezza 2, a fs 1000 Hz, 1000 campioni:

```
[Generatore (oscillatore)] segnale ──▶ segnale [Goertzel (toni, DTMF)] ampiezze ──▶ valore [Print (console.log)]
```

Scrive `[2, 0]` (circa: 2 e 3·10⁻¹⁶). **frequenza → ampiezza** darebbe `{"50": 2, "100": 0}`.

### 2. Un tasto del telefono

Modalità **DTMF**, un segnale a fs 8000 Hz con seni di 770 Hz e 1336 Hz, ognuno di ampiezza 0,5, lungo 800 campioni (0,1 s): le ampiezze delle due frequenze valgono circa 0,5 e il tasto è `5` (riga 770, colonna 1336).

```
[Somma · Prodotto di segnali] segnale ──▶ segnale [Goertzel (toni, DTMF)] tasto DTMF ──▶ testo [Etichetta]
[Generatore (oscillatore): 770 Hz] segnale ──▶ a [Somma · Prodotto di segnali]
[Generatore (oscillatore): 1336 Hz] segnale ──▶ b [Somma · Prodotto di segnali]
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
| Il segnale è vuoto | La lista non ha campioni. |
| Scrivi le frequenze come lista, per esempio [50, 100] | **Frequenze (Hz)** non è una lista o è vuota. |
| Le frequenze devono stare tra 0 e fs/2 (… Hz) | Una frequenza è negativa, non è un numero o supera fs/2. In DTMF succede se fs è sotto 3266 Hz. |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft) per tutto lo spettro
- [Picchi (find_peaks)](sig.peaks) per trovare le frequenze che non conosci
- [Buffer (campioni → finestre)](sig.buffer) per tagliare un flusso di campioni in finestre da analizzare
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
