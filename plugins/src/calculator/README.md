# Calcolatrice

Una semplice calcolatrice da tavolo.

## Cosa fa

- **Le quattro operazioni**: somma (+), differenza (−), moltiplicazione (×) e divisione (÷). Come su una calcolatrice da tavolo, ogni operazione si esegue appena premi la successiva: 2 + 3 × 4 = dà 20.
- **Percentuale (%)**: dopo + o − è la percentuale del primo numero (200 + 10 % = dà 220); dopo × o ÷ divide il numero per 100 (50 × 10 % = dà 5).
- **Quadrato (x²)** e **radice quadrata (√x)** del numero mostrato.
- **Cambio di segno (±)**, **CE** (azzera il numero), **C** (azzera tutto) e **⌫** (cancella l'ultima cifra).
- Premendo di nuovo **=** si ripete l'ultima operazione: 5 + 3 = = dà 11.

Sopra il risultato una riga piccola mostra il calcolo in corso, per esempio `200 + 20` o `2 + √(9) =`. Il pulsante in alto a sinistra (o **Ctrl C**) copia il risultato negli appunti.

## Tastiera

| Tasto | Funzione |
| --- | --- |
| 0-9, `,` o `.` | Cifre e separatore decimale |
| `+` `-` `*` `/` | Operazioni (anche `x` per moltiplicare) |
| Invio o `=` | Risultato |
| `%` | Percentuale |
| `Q` | Quadrato |
| `@` | Radice quadrata |
| F9 | Cambio di segno |
| Backspace | Cancella l'ultima cifra |
| Canc | CE |
| Esc | C |
| Ctrl C | Copia il risultato |

## Da sapere

- I numeri si scrivono con al massimo 16 cifre; i risultati tengono 15 cifre significative (0,1 + 0,2 dà 0,3). Oltre le 16 cifre prima della virgola, o sotto 0,0000001, compare l'esponente (`1e+21`).
- Dividere per zero, la radice di un numero negativo e un risultato troppo grande mostrano un messaggio: si riparte con una cifra, **C**, **CE** o **⌫**.
- I numeri seguono la lingua del sistema (in italiano 1.234,5).
- Il simbolo della calcolatrice nel menu di avvio c'è da lilOS con il simbolo `calculator`; con una versione precedente l'app compare con il punto di domanda.
