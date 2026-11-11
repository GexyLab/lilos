# Scegli per indice (MUX)

`core.select` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Ha più ingressi di valori e ne fa passare uno solo, quello indicato da un numero su **quale**: 1 per il primo, 2 per il secondo…

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **quale** (`which`) | numero | La posizione dell'ingresso da far passare, tra quelli aggiunti: 1 è il primo. |
| (gli ingressi aggiunti) | qualsiasi | I valori tra cui scegliere. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | L'ultimo valore dell'ingresso scelto. |
| **Exception** (`error`) | oggetto | Quando **quale** non indica un ingresso che c'è. |

## Porte aggiuntive

Il blocco nasce senza ingressi tra cui scegliere: aggiungili nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso**. Puoi averne fino a 16 (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo qualsiasi. Si vedono in corsivo sul blocco; si possono spostare su e giù e togliere.

**Attenzione ai nomi.** L'IDE chiama gli ingressi aggiunti con dei numeri che **partono da 2**: **2**, **3**, **4**… (contando anche **quale**). Ma **quale** conta la **posizione** tra gli ingressi aggiunti, a partire da 1:

| Ingresso aggiunto (nome sul blocco) | Si sceglie con **quale** = |
|---|---|
| primo (**2**) | 1 |
| secondo (**3**) | 2 |
| terzo (**4**) | 3 |

Conta sempre la posizione dall'alto, non il nome: se sposti o togli un ingresso, cambia anche il numero con cui si sceglie. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva qualcosa su **quale** **o su uno qualsiasi degli ingressi aggiunti**, il blocco:

1. legge **quale** come numero (con le regole di [Somma (+)](core.add): `"2"` vale 2, `"2,0"` vale 2) e toglie la parte decimale: 2,7 vale 2, -1,5 vale -1;
2. prende l'ingresso aggiunto in quella posizione;
3. manda su **valore** l'ultimo valore arrivato su quell'ingresso.

Casi limite:

- Se l'ingresso scelto non ha ancora ricevuto niente, il blocco non manda niente (e non dà errore).
- Se **quale** è 0, negativo, più grande del numero di ingressi o non è un numero, il blocco manda su **Exception** «Non c'è l'ingresso …» con il valore arrivato su **quale** (per esempio `Non c'è l'ingresso 0`, `Non c'è l'ingresso abc`).
- Se arriva un valore su un ingresso aggiunto quando **quale** non è ancora arrivato, l'errore è `Non c'è l'ingresso undefined`. Per evitarlo, dai a **quale** un valore iniziale (per esempio `1`).
- Ogni valore che arriva sull'ingresso scelto passa subito; anche i valori che arrivano sugli altri ingressi fanno ripartire il blocco, che **rimanda il valore dell'ingresso scelto**. Se non vuoi questi invii ripetuti, togli «lo avvia» dagli ingressi aggiunti: il blocco partirà solo quando cambia **quale**.

## Esempi

### 1. Una lingua scelta con un numero

Aggiungi tre ingressi e dai loro come valore iniziale `"Ciao"`, `"Hello"`, `"Hola"` (in quest'ordine). Togli «lo avvia» dai tre ingressi.

```
[Campo numerico: lingua] valore ──▶ quale [Scegli per indice (MUX)] valore ──▶ testo [Etichetta: saluto]
```

Se l'utente scrive 1 nel [Campo numerico](ui.number), l'[Etichetta](ui.label) mostra `Ciao`; con 2 `Hello`; con 3 `Hola`; con 4 l'Exception riceve `Non c'è l'ingresso 4`.

### 2. Una sorgente scelta da un cursore

```
[Sensore A] valore ──▶ 2  [Scegli per indice (MUX)] valore ──▶ valore [Valore: misura]
[Sensore B] valore ──▶ 3
[Cursore: 1-2] valore ──▶ quale
```

Con il cursore a 1 passano le misure del sensore A (l'ingresso chiamato **2**); a 2 quelle del sensore B. Ogni nuova misura del sensore scelto passa subito; una nuova misura dell'altro sensore fa rimandare l'ultima del sensore scelto.

### 3. Da sì/no a uno di due valori

Un sì/no letto come numero vale 1 (sì) o 0 (no), e 0 non è una posizione valida. Per scegliere tra due valori con un sì/no, usa piuttosto [If · Else](core.if).

## Errori

| Messaggio | Quando |
|---|---|
| Non c'è l'ingresso … (con il valore di **quale**) | **quale** non indica un ingresso aggiunto: 0, negativo, troppo grande, non un numero o non ancora arrivato (`undefined`). |

## Vedi anche

- [Instrada per indice (DEMUX)](core.route) per il contrario: un valore verso una di molte uscite
- [Switch · Case](core.switch) per scegliere con un valore invece che con una posizione
- [Merge (unisci flussi)](core.merge) per far passare tutto quello che arriva da più ingressi
- [Come funziona un blocco](ide/blocks)
