# Campo di testo

`ui.text` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un campo in cui l'utente scrive una riga di testo. Manda il testo quando l'utente ha finito di scrivere, e un impulso **invio** quando preme Invio.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra il campo. |
| **Suggerimento** | testo (traducibile) | vuoto | Testo grigio dentro il campo vuoto, che sparisce appena l'utente scrive (per esempio «nome e cognome»). |
| **Nascondi quello che si scrive** | sì/no | no | Mostra pallini al posto delle lettere, per le password. |

Il campo si apre sempre vuoto: non c'è una proprietà per un testo iniziale (usa l'ingresso **testo** con un valore iniziale).

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`value`) | testo | Sostituisce il testo nel campo, senza che il campo mandi niente. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e non si può più scrivere. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`value`) | testo | Il testo del campo, quando l'utente **conferma** una modifica: preme Invio o esce dal campo. |
| **invio** (`enter`) | impulso | Ogni volta che l'utente preme **Invio** nel campo. Il valore è `true`. |
| **Exception** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**Il campo non manda a ogni lettera.** Mentre l'utente scrive non parte niente. Il testo parte su **testo** quando la modifica è confermata:

- l'utente preme **Invio**;
- oppure esce dal campo (con **Tab**, o facendo clic altrove, per esempio su un pulsante).

Se il testo non è cambiato dall'ultima conferma, **testo** non manda niente.

**Invio** fa due cose, in quest'ordine:

1. se il testo è cambiato, lo manda su **testo**;
2. manda `true` su **invio**, **sempre**, anche se il testo non è cambiato o è vuoto.

Dopo Invio il campo perde il fuoco della tastiera (l'utente deve fare clic di nuovo per scrivere ancora).

Così puoi usare **invio** come «Invia» senza pulsante: quando arriva, l'ultimo testo è già arrivato prima.

**Il testo può essere vuoto**: se l'utente cancella tutto ed esce dal campo, manda `""`.

**Dallo schema**, un valore su **testo** sostituisce quello che c'è nel campo (un numero o un oggetto si vedono come testo, `null` svuota il campo). Attenzione: il campo viene ridisegnato, e **se l'utente sta scrivendo, perde quello che non ha confermato e il fuoco della tastiera**. Non mandare valori al campo mentre l'utente lo usa (per esempio non collegare la sua uscita **testo** al suo ingresso **testo**).

## Esempi

### 1. Una chat minima

```
Finestra «Messaggi»
└ Colonna (radice)
  ├ Console         console1  Altezza 200
  └ Campo di testo  text1     Suggerimento «Scrivi e premi Invio»
```

```
[Campo di testo: text1] testo ──▶ valore [If · Else] allora ──▶ valore [Print (console.log)]
[Campo di testo: text1] invio ──▶ condizione [If · Else]
```

Nel blocco [If · Else](core.if) togli «lo avvia» da **valore**: il blocco parte con **invio** (sempre `true`) e manda alla console l'ultimo testo confermato. Quindi l'utente scrive, preme Invio e la riga compare nella console. Per svuotare il campo dopo l'invio, collega anche **allora** a un blocco [Costante · Variabile](core.value) di testo vuoto (con l'ingresso **invia** collegato, mostrato con l'occhio accanto alla porta) e quello all'ingresso **testo** del campo:

```
[If · Else] allora ──▶ invia [Costante · Variabile: «»] valore ──▶ testo [Campo di testo: text1]
```

### 2. Una password per sbloccare

```
Finestra «Accesso»
└ Colonna (radice)
  ├ Campo di testo  text1    Etichetta «Password»  Nascondi quello che si scrive sì
  ├ Pulsante        button1  Testo «Entra»
  └ Etichetta       label1   Testo «»
```

```
[Campo di testo: Password] testo ──▶ a [Confronto (== ≠ < >): a = b] risultato ──▶ condizione [If · Else] allora     ──▶ invia [Costante · Variabile: «Benvenuto!»]          valore ──▶ testo [Etichetta: label1]
[Costante · Variabile: «segreta»] valore ──▶ b                                                      altrimenti ──▶ invia [Costante · Variabile: «Password sbagliata.»] valore ──▶ testo [Etichetta: label1]
[Pulsante: Entra]          premuto ──▶ valore [If · Else]
[Campo di testo: Password] invio   ──▶ valore [If · Else]
```

Nel blocco [If · Else](core.if) togli «lo avvia» da **condizione**: il blocco parte quando l'utente preme **Entra** o Invio nel campo, con l'ultimo risultato del confronto. Facendo clic su **Entra** il campo perde il fuoco e conferma la password **prima** del clic, quindi il confronto è già aggiornato. I due blocchi [Costante · Variabile](core.value) dei messaggi hanno l'ingresso **invia** collegato.

> Questo è solo un esempio: una password scritta in un blocco [Costante · Variabile](core.value) si legge aprendo il progetto.

## Accessibilità e tastiera

- È un campo di testo vero: si raggiunge con **Tab**; **Invio** conferma e manda **invio**.
- L'**Etichetta** sopra non è collegata al campo: il lettore di schermo legge il suggerimento (se c'è) ma non il nome del campo. Per questo è utile scrivere anche un **Suggerimento**.
- Il correttore ortografico del browser è spento nel campo.

## Vedi anche

- [Campo numerico](ui.number), per i numeri
- [Input (readline)](core.consoleRead), per fare una domanda e aspettare la risposta
- [Template (formatta)](core.format), [Funzioni stringa](core.text)
- [Componenti UI standard](logicstudio-ui)
