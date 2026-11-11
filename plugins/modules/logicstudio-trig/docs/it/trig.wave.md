# Onda (sinusoide, quadra, triangolare, dente di sega)

`trig.wave` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Dà il valore di un'onda (sinusoide, cosinusoide, quadra, triangolare o dente di sega): a un tempo che gli dai, oppure il tempo che passa da quando il programma è partito.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **t (secondi)** (`t`) | numero | Il tempo in secondi a cui calcolare l'onda. Un testo con un numero va bene. |
| **adesso** (`tick`) | impulso | Calcola l'onda al tempo passato dalla partenza del programma (in secondi). Quello che arriva non conta, anche `false` o `0`. |

Tutte e due le porte fanno partire il blocco: collega **t** per un tempo tuo, **adesso** (di solito a un [Intervallo (setInterval)](core.every)) per seguire l'orologio.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore dell'onda. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Un valore non è un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Forma** (`shape`) | Sinusoide, Cosinusoide, Quadra, Triangolare, Dente di sega | Sinusoide | La forma dell'onda. |
| **Ampiezza** (`amplitude`) | un numero | 1 | Di quanto l'onda sale e scende dal centro. |
| **Frequenza (Hz)** (`frequency`) | un numero, 0 o più | 1 | Quante volte l'onda si ripete in un secondo. |
| **Fase** (`phase`) | un numero | 0 | Di quanto è spostata l'onda nel tempo, nell'unità scelta qui sotto. Un numero positivo la anticipa. |
| **Unità della fase** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità della **Fase**. |
| **Spostamento (offset)** (`offset`) | un numero | 0 | Un numero aggiunto al risultato: sposta il centro dell'onda. |

## Come funziona

A ogni tempo t il blocco calcola l'angolo `θ = 360° × frequenza × t + fase` (cioè un giro per periodo) e il valore

`valore = ampiezza × forma(θ) + offset`

dove `forma(θ)` va sempre da −1 a 1, secondo la **Forma**:

| Forma | Come è fatta |
|---|---|
| **Sinusoide** | `sin θ`: parte da 0, sale a 1 dopo un quarto di periodo, scende a −1 dopo tre quarti. |
| **Cosinusoide** | `cos θ`: parte da 1, scende a −1 a metà periodo. |
| **Quadra** | 1 nella prima metà del periodo e −1 nella seconda. |
| **Triangolare** | Sale e scende in linea retta: parte da 0, arriva a 1 dopo un quarto di periodo, a −1 dopo tre quarti. |
| **Dente di sega** | Sale in linea retta da −1 a 1 e poi torna di colpo a −1: parte da 0, arriva a 1 a metà periodo e salta a −1. |

- Il **periodo** è `1 ÷ frequenza` secondi: a 2 Hz l'onda si ripete ogni mezzo secondo.
- La **Fase** sposta l'onda: una sinusoide con fase 90° è una cosinusoide.
- Con **adesso**, il tempo è contato dalla partenza del programma: la prima volta che arriva un impulso il tempo è quello passato da allora. Con [Intervallo (setInterval)](core.every) a 0,1 secondi il blocco lavora a ogni decimo di secondo.
- Con **t** il tempo è quello che dai, anche negativo; nessun orologio.
- Il risultato è arrotondato a **15 cifre significative**.

## Esempi

### 1. Una sinusoide a un tempo dato

```
[Costante · Variabile: 0.25] valore ──▶ t (secondi) [Onda: sinusoide, 1 Hz] valore ──▶ valore [Print (console.log)]
```

Scrive `1` (un quarto di periodo). Con t = 0,125 scrive `0.707106781186547`.

### 2. Una quadra a 2 Hz

**Forma** quadra, **Ampiezza** 5, **Frequenza** 2: con t = 0,1 scrive `5`, con t = 0,3 scrive `-5`.

### 3. Una triangolare spostata

**Forma** triangolare, **Ampiezza** 10, **Spostamento** 5, t = 0,125 (un ottavo di periodo, a metà salita): scrive `10`.

### 4. Il dente di sega e la fase

**Forma** dente di sega: con t = 0,25 scrive `0.5`, con t = 0,75 scrive `-0.5`. Una sinusoide con **Fase** 90 e t = 0 scrive `1`; con **Fase** 30 scrive `0.5`.

### 5. Un'onda che segue l'orologio

```
[Intervallo (setInterval): 0.1 secondi] impulso ──▶ adesso [Onda: sinusoide, 1 Hz] valore ──▶ valore [Print (console.log)]
```

A ogni impulso il blocco calcola l'onda al tempo passato dalla partenza. Se i tempi fossero esatti scriverebbe, a 0,1, 0,2 e 0,3 secondi, `0.587785252292473`, `0.951056516295154`, `0.951056516295154`. In pratica gli impulsi arrivano con un piccolo ritardo, quindi le ultime cifre cambiano.

### 6. Una sinusoide a 50 Hz

**Frequenza** 50, t = 0,001: scrive `0.309016994374947`; con t = 0,005 scrive `1`.

## Errori

| Messaggio | Quando |
|---|---|
| t: serve un numero | **t** non è un numero (per esempio un testo come `"abc"`). |
| Ampiezza e frequenza devono essere numeri | **Ampiezza** o **Frequenza** nelle Proprietà non sono numeri. |

## Vedi anche

- [Intervallo (setInterval)](core.every) per far arrivare gli impulsi a **adesso**
- [Funzioni trigonometriche (Math.sin, Math.cos…)](trig.fn) per seno e coseno di un angolo
- [Converti e normalizza angolo](trig.convert)
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
