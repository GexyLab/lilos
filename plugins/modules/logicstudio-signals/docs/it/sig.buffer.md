# Buffer (campioni → finestre)

`sig.buffer` · Segnali · [Segnali](logicstudio-signals) · versione 1

Raccoglie i campioni che arrivano uno alla volta (o a gruppi) e li manda **a finestre** di lunghezza fissa, anche sovrapposte. È il ponte tra una lettura continua (un sensore, un campo numerico) e i blocchi dei segnali, che lavorano su finestre.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **campione/i** (`value`) | qualsiasi | Un numero (anche un testo con un numero, come `"2,5"`), una lista di numeri o un segnale `{ fs, samples }`. Viene aggiunto in fondo a quello che il blocco ha già. |
| **azzera** (`reset`) | impulso | Svuota il buffer e riporta il tempo a 0. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Una finestra completa: `{ fs, t0, samples }`. |
| **campioni in attesa** (`waiting`) | numero | Quanti campioni sono nel buffer in attesa di completare una finestra. Si manda a ogni valore ricevuto. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Valore non valido, finestra senza campioni, finestra troppo lunga. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Lunghezza finestra N** (`size`) | da 1 | 256 | Quanti campioni ha ogni finestra mandata. |
| **Passo (0 = N, senza sovrapposizione)** (`hop`) | da 0 | 0 | Di quanti campioni avanza la finestra dopo ogni uscita. 0 o più di N vale N (finestre una dopo l'altra); meno di N sovrappone le finestre. |
| **fs dei valori singoli (Hz)** (`fs`) | più di 0 | 10 | La frequenza di campionamento dei numeri e delle liste che arrivano. Un segnale che arriva porta la sua. |

## Come funziona

- Ogni valore che arriva viene aggiunto al buffer. Appena i campioni sono almeno **N**, il blocco manda la finestra dei primi **N** e poi **scarta i primi `passo` campioni**; se ne restano ancora N, ne manda un'altra, e così via. Un valore con tanti campioni (una lista lunga) può quindi far uscire più finestre di fila.
- **Passo** uguale a N (o 0): le finestre sono una dopo l'altra, senza sovrapposizione. **Passo** N/2: sovrapposizione del 50 %, ogni campione compare in due finestre. Passo più grande di N vale N.
- Il `t0` di una finestra è il tempo del suo primo campione dall'ultimo azzeramento: `campioni scartati / fs`. Quindi le finestre successive formano un tempo continuo.
- Se la `fs` cambia (arriva un segnale con una fs diversa da quella dei campioni già nel buffer), il buffer viene **svuotato** e il tempo riparte da 0.
- Un segnale che arriva viene aggiunto come i suoi soli campioni reali (la parte immaginaria si perde).
- Con un impulso su **azzera**, il buffer si svuota e il tempo riparte da 0: **campioni in attesa** manda 0.

## Un po' di teoria

L'elaborazione in frequenza (FFT, densità spettrale, spettrogramma) lavora su blocchi di campioni, non sul flusso continuo. Il **buffering** taglia il flusso in finestre di `N` campioni. Più è lunga la finestra, più fine è la **risoluzione in frequenza**, `Δf = fs/N`; più è corta, più rapidamente si vedono i cambiamenti nel tempo. È il compromesso tempo-frequenza.

Con finestre sovrapposte si riduce la perdita di informazione che le finestre di tipo Hann o simili causano ai bordi: un campione che cade al bordo di una finestra (dove la finestra lo attenua) è al centro della successiva. Il **passo** è `N·(1 − sovrapposizione)`; una sovrapposizione del 50 % (con Hann) o del 75 % è una scelta classica. Il tempo tra una finestra e la successiva è `passo / fs`.

## Esempi

### 1. Da un valore alla volta a una FFT

Una lettura a 10 Hz (un valore ogni 0,1 s) entra nel buffer; ogni 256 valori esce una finestra per la FFT:

```
[Campo numerico] valore ──▶ campione/i [Buffer (campioni → finestre)] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

Con **fs dei valori singoli** 10 e **N** 256, lo spettro va da 0 a 5 Hz.

### 2. Sovrapposizione

Con **N** 4, **Passo** 2 e **fs** 10, ai valori `1, 2, 3, 4, 5, 6` il blocco manda due finestre: `{ fs: 10, t0: 0, samples: [1, 2, 3, 4] }` e `{ fs: 10, t0: 0.2, samples: [3, 4, 5, 6] }`. **Campioni in attesa** manda 2 (restano 5 e 6).

### 3. Una lista tutta insieme

Con **N** 4 e passo 0, una lista di 6 valori manda `[1, 2, 3, 4]` e lascia 2 campioni in attesa.

## Errori

| Messaggio | Quando |
|---|---|
| La finestra deve avere almeno un campione | **Lunghezza finestra N** è minore di 1. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | **N** (o un segnale in arrivo) supera il limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |
| Il valore deve essere un numero, una lista di numeri o un segnale | È arrivato altro (un testo che non è un numero, un sì/no, un oggetto che non è un segnale). |
| I campioni: il valore N non è un numero | Nella lista, l'elemento N non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida / Il segnale: il valore N non è un numero / Il segnale ha samples e im di lunghezze diverse | Il segnale in arrivo è sbagliato (come per gli altri blocchi dei segnali). |

## Vedi anche

- [Segnale da lista](sig.fromList) per una lista già completa
- [Riproduci campioni](sig.play) per l'operazione inversa (da finestra a valori)
- [FFT (np.fft.fft)](sig.fft), [Densità spettrale (Welch)](sig.psd), [Spettrogramma (STFT)](sig.spectrogram)
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
