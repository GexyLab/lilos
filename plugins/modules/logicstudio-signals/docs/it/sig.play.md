# Riproduci campioni

`sig.play` · Segnali · [Segnali](logicstudio-signals) · versione 1

Prende un segnale e lo «suona» **un campione alla volta**, a un ritmo che scegli, mandando ogni valore a un'uscita. Serve per portare un segnale registrato su un grafico che si disegna in tempo reale, su un indicatore o su un'uscita di una macchina, come se il segnale arrivasse in diretta.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale da riprodurre: un oggetto `{ fs, t0, samples }`, una lista di numeri (presa alla «fs delle liste semplici») o un testo JSON di uno dei due. Un nuovo segnale ferma quello che sta suonando e ricomincia da capo. |
| **ferma** (`stop`) | impulso | Ferma la riproduzione, senza mandare «finito». Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il campione corrente. Il primo esce subito, gli altri al ritmo scelto. |
| **tempo (s)** (`time`) | numero | Il tempo del campione nel segnale: `t₀ + i/fs`. Non è l'orologio: è il tempo scritto nel segnale. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **finito** (`done`) | impulso | Un impulso dopo l'ultimo campione (se non è attivo **Ricomincia alla fine**), o subito se il segnale è vuoto. |
| **Exception** (`error`) | oggetto | Segnale non valido, ritmo troppo alto. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Campioni al secondo (0 = fs del segnale)** (`rate`) | da 0 a 100 | 10 | Quanti campioni escono ogni secondo. Con 0 il ritmo è la fs del segnale (utile solo se è 100 o meno). |
| **Ricomincia alla fine** (`loop`) | sì / no | no | Con sì, dopo l'ultimo campione si ricomincia dal primo, senza fine, finché non arriva **ferma** o un altro segnale. |
| **fs delle liste semplici (Hz)** (`listFs`) | più di 0 | 1000 | Se arriva una lista semplice di numeri, la considera un segnale con questa frequenza di campionamento. |

## Come funziona

- Quando arriva un segnale, il blocco ferma l'eventuale riproduzione in corso, manda **subito** il primo campione su **valore** (e il suo tempo su **tempo**) e poi un campione ogni `1/ritmo` secondi.
- Dopo l'ultimo campione, manda un impulso su **finito** e si ferma. Con **Ricomincia alla fine** non manda **finito**: riparte dal primo campione.
- Un impulso su **ferma** blocca la riproduzione e non manda niente; per ripartire serve di nuovo un segnale su **segnale**.
- Il ritmo massimo è **100 campioni al secondo**: ogni campione fa lavorare i blocchi collegati, e il motore ferma un programma che fa troppe esecuzioni (vedi [Limiti](logicstudio-engine/limits)).
- Se **Campioni al secondo** è 0, il ritmo è la fs del segnale: con le impostazioni di serie una lista semplice vale 1000 Hz e il blocco dà errore. Imposta un ritmo, o metti nella «fs delle liste semplici» un valore fino a 100.
- Il ritmo è quello di un temporizzatore: se il computer è occupato qualche campione può arrivare in ritardo.

## Un po' di teoria

Un segnale campionato a `fs` rappresenta un fenomeno che dura `N/fs` secondi. Riprodurlo a un ritmo diverso da `fs` ne cambia la **scala dei tempi** (per l'orecchio, una registrazione a velocità doppia suona un'ottava più alta): i valori restano gli stessi, cambia il tempo reale tra due campioni, `1/ritmo` invece di `1/fs`. Per questo l'uscita **tempo** dà il tempo del segnale (`t₀ + i/fs`), non quello vero.

Riprodurre a un ritmo minore di `fs` è un modo di «rallentare» un segnale veloce per guardarlo (un segnale a 1000 Hz a 10 campioni al secondo è rallentato 100 volte). Il ritmo di 100 campioni al secondo è il limite pratico di un'interfaccia che si aggiorna: oltre, conviene disegnare tutta la finestra insieme con [Per grafico](sig.toChart).

## Esempi

### 1. Un segnale su un grafico in diretta

```
[Generatore (oscillatore)] segnale ──▶ segnale [Riproduci campioni] valore ──▶ serie aggiunta [Tempo reale]
```

Con il generatore a 1 Hz, `fs` 100 e 100 campioni (un periodo), e **Campioni al secondo** 20, il periodo del seno viene disegnato in 5 secondi. La serie del grafico è una porta aggiunta del componente [Tempo reale](charts.live).

### 2. Tre campioni

Con **Campioni al secondo** 10 e la lista `[5, 6, 7]`: subito **valore** 5 e **tempo** 0; dopo 0,1 s **valore** 6, **tempo** 0,001 (a 1000 Hz); dopo 0,2 s **valore** 7 e un impulso su **finito**.

### 3. Ripetere all'infinito

Con **Ricomincia alla fine** il segnale gira in loop: utile per simulare un sensore. Un impulso su **ferma** lo interrompe.

## Errori

| Messaggio | Quando |
|---|---|
| Troppo veloce: … campioni al secondo, al massimo 100 (imposta «Campioni al secondo») | **Campioni al secondo** è 0 e la fs del segnale è più di 100. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | Su **segnale** non c'è né una lista né un segnale. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Nell'oggetto, `fs` è 0, negativa o non è un numero. |
| Il segnale: il valore N non è un numero | Un campione (il numero N) non è un numero. |
| Il segnale ha samples e im di lunghezze diverse | Nell'oggetto, `samples` e `im` non hanno la stessa lunghezza. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale ha più campioni del limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |

## Vedi anche

- [Buffer (campioni → finestre)](sig.buffer) per l'operazione inversa
- [Scomponi segnale](sig.info) per avere tutti i campioni in una volta, come lista
- [Per grafico](sig.toChart) per disegnare un segnale intero
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
