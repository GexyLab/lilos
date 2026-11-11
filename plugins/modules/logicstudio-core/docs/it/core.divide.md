# Dividi

`core.divide` · Matematica · [Blocchi di base](logicstudio-core) · versione 1

Divide **a** per **b** e manda il quoziente e il resto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | numero | Il dividendo. |
| **b** | numero | Il divisore. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | a ÷ b, con i decimali. |
| **resto** (`rest`) | numero | Il resto della divisione di a per b. |
| **Eccezione** (`error`) | oggetto | Quando **b** vale 0. |

Questo blocco ha solo due ingressi: non se ne possono aggiungere.

## Come funziona

Ogni volta che arriva un valore su **a** o su **b**, il blocco divide l'ultimo **a** per l'ultimo **b** e manda, insieme, **risultato** e **resto**.

- I valori vengono convertiti in numero con le stesse regole della [Somma](core.add): `"2,5"` vale 2,5; `true` vale 1 e `false` 0; un testo vuoto e `null` valgono 0.
- Un ingresso che non ha ancora ricevuto niente vale **0**.
- **Se b vale 0** (anche perché non è ancora arrivato, o è `""`, `null`, `false`, `"0,0"`), il blocco non manda niente e manda su **Eccezione** «Divisione per zero».
- **risultato** è la divisione con i decimali: 7 ÷ 2 = 3,5 (non 3).
- **resto** è quello che avanza togliendo **b** da **a** quante più volte possibile: 7 e 2 → 1; 17 e 5 → 2; 7,5 e 2 → 1,5. Il resto ha il **segno di a**: −7 e 3 → −1; 7 e −3 → 1.
- Un valore che non è un numero (`"ciao"`, un oggetto) non dà errore: **risultato** e **resto** sono `NaN` («non è un numero»).
- Il quoziente intero non c'è come uscita: per averlo usa [Calcola](core.math) con **arrotonda per difetto** sul **risultato** (per numeri positivi).

### Attenzione all'ordine di arrivo

Visto che un **b** mancante vale 0, se **a** arriva prima di **b** il blocco dà subito «Divisione per zero». Per evitarlo:

- dai a **b** un valore iniziale diverso da 0, oppure
- togli «lo avvia» da **a**, se **a** arriva sempre prima di **b**.

Se non colleghi l'**Eccezione**, il messaggio finisce nella console principale.

Vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Dividere un conto

```
[Campo numerico: totale]  valore ──▶ a  [Dividi] risultato ──▶ valore [Calcola: arrotonda, 2 decimali] risultato ──▶ valore [Valore: a testa]
[Campo numerico: persone] valore ──▶ b
```

Con **b** iniziale `1`: totale 100 e 3 persone → risultato 33,333333333333336 → arrotondato 33,33. Se l'utente scrive 0 persone, l'Eccezione riceve «Divisione per zero».

### 2. Pari o dispari

Dai a **b** il valore iniziale `2` e togli «lo avvia» da **b**. Collega **resto** a un [Confronta](core.compare) con `a = b` e **b** = 0:

- 10 → resto 0 → **sì** (pari);
- 7 → resto 1 → **no** (dispari).

### 3. Minuti e secondi

**a** = 135 secondi, **b** = 60 → risultato 2,25, resto 15: sono 2 minuti (il risultato arrotondato per difetto) e 15 secondi.

## Errori

| Messaggio | Quando |
|---|---|
| Divisione per zero | **b** vale 0, anche perché non è ancora arrivato o è vuoto. |

## Vedi anche

- [Somma](core.add), [Sottrai](core.subtract), [Moltiplica](core.multiply)
- [Calcola](core.math) per arrotondare il risultato
- [Come funziona un blocco](ide/blocks)
