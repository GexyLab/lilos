# Instrada per indice (DEMUX)

`core.route` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Manda il valore che riceve su una delle sue uscite, quella indicata da un numero su **quale**: 1 per la prima, 2 per la seconda…

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da smistare. È l'unico ingresso che fa partire il blocco. |
| **quale** (`which`) | numero | La posizione dell'uscita, tra quelle aggiunte: 1 è la prima. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| (le uscite aggiunte) | qualsiasi | Il valore, sull'uscita scelta. |
| **Exception** (`error`) | oggetto | Quando **quale** non indica un'uscita che c'è. |

## Porte aggiuntive

Il blocco nasce senza uscite: aggiungile nelle **Proprietà**, sezione **Porte**, con **Aggiungi uscita**. Puoi averne fino a 16 (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo qualsiasi, chiamate **1**, **2**, **3**… Si vedono in corsivo sul blocco; si possono spostare su e giù e togliere.

**quale** conta la **posizione** dall'alto tra le uscite aggiunte, non il nome. Finché aggiungi soltanto, posizione e nome coincidono. Se togli o sposti un'uscita, i nomi restano quelli di prima: per esempio, con le uscite **1**, **2**, **3**, se togli la **2** restano **1** e **3**, e la **3** si sceglie con **quale** = 2. Se poi aggiungi un'altra uscita, l'IDE la chiama di nuovo **3**: due uscite con lo stesso nome (la seconda si sceglie con **quale** = 3). Questi nomi non si possono cambiare: ricorda che conta solo l'ordine dall'alto. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Solo un valore su **valore** fa partire il blocco. Un valore su **quale** viene soltanto ricordato: decide dove andranno i valori **dopo**, ma non rimanda niente (anche se «lo avvia» è acceso).

Quando arriva un valore, il blocco:

1. legge l'ultimo **quale** come numero (con le regole di [Somma (+)](core.add): `"2"` vale 2, `"2,0"` vale 2, `true` vale 1) e toglie la parte decimale: 2,9 vale 2;
2. manda il valore, così com'è (anche `null`), sull'uscita aggiunta in quella posizione.

Se **quale** è 0, negativo, troppo grande, non è un numero o non è ancora arrivato, il valore non va da nessuna parte e su **Exception** arriva «Non c'è l'uscita …» con il valore di **quale**: per esempio `Non c'è l'uscita 5`, oppure `Non c'è l'uscita undefined` se **quale** non è mai arrivato. Per evitarlo, dai a **quale** un valore iniziale.

## Esempi

### 1. Tre console per tre livelli

Aggiungi tre uscite (**1**, **2**, **3**):

```
[Campo di testo: messaggio] testo  ──▶ valore [Instrada per indice (DEMUX)] 1 ──▶ valore [Print (console.log): info]
[Campo numerico: livello]   valore ──▶ quale           2 ──▶ valore [Print (console.log): avvisi]
                                                       3 ──▶ valore [Print (console.log): errori]
```

Con **quale** = 2, ogni messaggio va nella console degli avvisi. Cambiare **quale** in 3 non rimanda l'ultimo messaggio: vale per i messaggi che arrivano dopo.

### 2. Un numero da 1 a N

**quale** = `"1"` (testo) → uscita **1**. **quale** = 3,7 → uscita **3**. **quale** = 0 → `Non c'è l'uscita 0` sull'Exception.

### 3. Due strade con un sì/no

Un sì/no letto come numero vale 1 (sì) o 0 (no): **no** dà quindi l'errore `Non c'è l'uscita false`. Per scegliere tra due strade con un sì/no usa [If · Else](core.if).

## Errori

| Messaggio | Quando |
|---|---|
| Non c'è l'uscita … (con il valore di **quale**) | **quale** non indica un'uscita aggiunta: 0, negativo, troppo grande, non un numero, o non ancora arrivato (`undefined`). Succede anche se il blocco non ha nessuna uscita aggiunta. |

## Vedi anche

- [Scegli per indice (MUX)](core.select) per il contrario: uno di molti ingressi verso un'uscita
- [Switch · Case](core.switch) per scegliere l'uscita con un valore (un nome) invece che con un numero
- [If · Else](core.if) per due sole strade
- [Come funziona un blocco](ide/blocks)
