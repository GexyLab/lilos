# Somma · Prodotto di segnali

`sig.combine` · Segnali · [Segnali](logicstudio-signals) · versione 1

Mette insieme due o più segnali campione per campione: somma, differenza, prodotto, rapporto, media, minimo o massimo. Uno o più ingressi possono essere semplici numeri, che valgono per tutti i campioni.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** (`a`) | qualsiasi | Il primo operando: un segnale, una lista di numeri o un numero. |
| **b** (`b`) | qualsiasi | Il secondo operando, come **a**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale risultato, sempre un segnale vero `{ fs, t0, samples }` (anche se in ingresso ci sono liste). |
| **Exception** (`error`) | oggetto | Un operando che non è un segnale né un numero, fs diverse, divisione per zero, segnale troppo lungo. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più, di tipo qualsiasi, chiamati con le lettere che seguono: **c**, **d**, **e**… Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | somma, sottrai, moltiplica, dividi, media, minimo, massimo | somma | L'operazione tra gli operandi, nell'ordine **a**, **b**, **c**… (vedi la tabella sotto). |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso. Un segnale vero porta già la sua fs. |

| Operazione | Risultato di ogni campione |
|---|---|
| **Somma** a + b + … | la somma degli operandi |
| **Sottrai** a − b − … | **a** meno tutti gli altri |
| **Moltiplica** a · b · … | il prodotto |
| **Dividi** a / b / … | **a** diviso, uno dopo l'altro, per gli altri |
| **Media** | la somma divisa per il **numero degli operandi** (i numeri semplici contano) |
| **Minimo** / **Massimo** | il più piccolo / il più grande degli operandi |

## Come funziona

A ogni nuovo valore su un ingresso il blocco ricalcola il risultato con l'ultimo valore di ogni ingresso. Gli ingressi che non hanno ancora ricevuto niente non contano.

- **Numeri e segnali insieme.** Un numero (anche un testo come `"2,5"`) vale per ogni campione: sommare `5` a un segnale lo alza di 5. Serve almeno un operando che sia un segnale o una lista; se sono tutti numeri il blocco dà un'eccezione.
- **Lunghezza.** Il risultato è lungo quanto il segnale **più corto**: i campioni in più degli altri vengono scartati. Con `[1, 2, 3, 4]` e `[10, 20]` si ottengono 2 campioni.
- **fs e tempo.** Tutti i segnali devono avere la **stessa fs**, altrimenti c'è un'eccezione (usa prima [Ricampiona](sig.resample)). Il risultato prende la fs e l'istante iniziale `t0` del **primo** segnale (in ordine **a**, **b**, **c**…).
- **Liste semplici.** Una lista prende la fs di **fs delle liste semplici**: se la mescoli con un segnale che ha un'altra fs (per esempio 100 Hz con la lista a 1000 Hz) hai l'eccezione sulle fs. La parte immaginaria di un segnale complesso non viene usata.
- **Dividi.** Se un divisore vale 0 il blocco si ferma con un'eccezione che dice il campione.

## Un po' di teoria

- **Somma.** Il sistema è lineare: lo spettro della somma è la somma degli spettri. Sommare due seni di frequenza diversa dà uno spettro con due righe.
- **Prodotto.** Moltiplicare nel tempo vuol dire "mescolare" le frequenze: `cos(2πf₁t) · cos(2πf₂t) = ½·cos(2π(f₁−f₂)t) + ½·cos(2π(f₁+f₂)t)`. È la base della modulazione di ampiezza (portante · messaggio) e dei mixer. Moltiplicare per una finestra o per una costante cambia solo l'ampiezza.
- **Media di più registrazioni.** Se i segnali hanno lo stesso contenuto e rumore indipendente, la media di N segnali riduce l'ampiezza del rumore di `√N` e la potenza di N: il rapporto segnale/rumore sale di `10·log₁₀(N)` dB (4 registrazioni: circa +6 dB).
- **Stessa fs.** Sommare campione per campione ha senso solo se i campioni stanno sulla stessa griglia di tempi: per questo le fs devono coincidere.

## Esempi

### 1. Un segnale e un valore continuo

```
[Generatore (oscillatore)] segnale ──▶ a [Somma · Prodotto di segnali] segnale ──▶ segnale [Per grafico]
[Costante · Variabile: 2]  valore  ──▶ b
```

Con **Somma**, un seno da −1 a +1 diventa un seno da 1 a 3. Il numero 2 vale per ogni campione.

### 2. Un segnale più rumore, per provare un filtro

```
[Generatore (oscillatore)] segnale ──▶ a [Somma · Prodotto di segnali] segnale ──▶ segnale [Filtro IIR (butter, cheby1, cheby2)]
[Rumore (np.random)]       segnale ──▶ b
```

I due generatori devono avere la stessa **frequenza di campionamento fs**; il risultato è lungo quanto il più corto dei due.

### 3. Modulazione di ampiezza

Con **Moltiplica**, **a** = portante a 1000 Hz e **b** = messaggio a 50 Hz: nello spettro ([FFT (np.fft.fft)](sig.fft)) compaiono le righe a 950, 1000 e 1050 Hz, se il messaggio è sommato a 1 (con un secondo blocco **Somma**) prima del prodotto.

### 4. Numeri

`a` = segnale `[1, 2, 3, 4]` a 100 Hz, `b` = `5`: **Somma** → `[6, 7, 8, 9]`; **Moltiplica** con `b` = segnale `[1, 0, 1, 0, 9]` → `[1, 0, 3, 0]` (4 campioni, il più corto).

## Errori

| Messaggio | Quando |
|---|---|
| Serve almeno un segnale (gli altri possono essere numeri) | Tutti gli operandi sono numeri semplici. |
| I segnali hanno fs diverse (… e … Hz): usa prima Ricampiona | Due segnali (o un segnale e una lista a **fs delle liste semplici**) con fs diverse. |
| Divisione per zero (campione …) | Con **Dividi**, un divisore vale 0 in quel campione (si conta da 1). |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | Un operando non è né un numero, né una lista, né un segnale. |
| Il segnale: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il segnale ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Un segnale più lungo del limite (vedi [Limiti del motore](logicstudio-engine/limits)). |

## Vedi anche

- [Guadagno · Offset](sig.gain) per moltiplicare o sommare una costante a un solo segnale
- [Ricampiona (resample)](sig.resample) per portare due segnali alla stessa fs
- [Ritardo · Taglia · Zero-padding](sig.edit) per allineare o accorciare i segnali
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
