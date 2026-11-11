# Componente UI

`core.component` · Componenti UI · [Blocchi di base](logicstudio-core) · versione 1

È l'**oggetto** di una componente di una finestra (un pulsante, un campo, un grafico…) dentro uno schema. Gli schemi non toccano mai le finestre direttamente: parlano con una componente solo attraverso il suo oggetto, che ha le stesse porte della componente.

## Ingressi e uscite

Le porte non sono fisse: sono **quelle della componente** che l'oggetto rappresenta (più quelle che la componente ha aggiunto). Per esempio:

| Componente | Ingressi (← quello che lo schema imposta) | Uscite (→ quello che fa l'utente) |
|---|---|---|
| [Pulsante](ui.button) | **testo**, **abilitato**, **visibile** | **premuto** |
| [Interruttore](ui.toggle) | **valore**, **abilitato**, **visibile** | **valore** |
| [Campo di testo](ui.text) | **testo**, **abilitato**, **visibile** | **testo**, **invio** |
| [Etichetta](ui.label) | **testo**, **abilitato**, **visibile** | nessuna |

Ogni componente ha gli ingressi **abilitato** e **visibile**. Le porte di ogni componente sono descritte nella sua pagina: con l'oggetto selezionato, **F1** (o **?** nelle Proprietà) apre la pagina della componente.

L'oggetto ha anche l'uscita **Eccezione**, che però non manda mai niente: l'oggetto non fa calcoli suoi.

## Impostazioni

Si vedono nelle Proprietà dell'oggetto, sezione **Componente UI**:

| Impostazione | Valori | Cosa fa |
|---|---|---|
| **Finestra** (`window`) | le finestre del progetto | La finestra della componente. Se la cambi, **Componente** si svuota e va scelta di nuovo. |
| **Componente** (`component`) | le componenti di quella finestra (con la loro etichetta e il loro tipo) | Quale componente rappresenta. |

In uno schema aperto da solo (senza progetto) le Proprietà dicono «Uno schema da solo non ha finestre.»

## Come si crea

L'oggetto **non** è nella scheda **Blocchi**: si crea dalla finestra.

1. Apri la finestra e, in **Progetta**, seleziona la componente.
2. Nelle Proprietà, sezione **Oggetto nello schema**, scegli lo schema in **Nello schema** e premi **Crea il suo oggetto**.
3. L'IDE mette l'oggetto in mezzo allo schema, gli dà come titolo l'etichetta o il testo della componente, e lo apre selezionato.

Da lì in poi, nelle Proprietà della componente, **Oggetto nello schema** dice dove sta l'oggetto (schema › blocco) e **Aprilo nello schema** lo mostra. Anche un **doppio clic** sulla componente, in Progetta, apre il suo oggetto. Dal tasto destro sull'oggetto, **Apri la sua finestra** fa il contrario. Finché una componente non ha il suo oggetto, le Proprietà avvisano: «Nessuno schema ha ancora il suo oggetto: senza, la componente si vede ma non fa niente.»

Sul foglio l'oggetto mostra come titolo la sua etichetta (o il nome del tipo di componente) e sotto `finestra › componente`. Nelle Proprietà non c'è il campo **Etichetta**: per cambiarla usa il tasto destro, **Etichetta…**.

Le **Colonne**, **Righe** e gli altri contenitori non hanno la sezione **Oggetto nello schema**: dall'IDE non si crea un oggetto per loro.

## Come funziona

### Dallo schema alla finestra (ingressi)

- Un valore che arriva su un ingresso dell'oggetto **va dritto alla componente**, in ogni copia aperta della finestra. Non esce niente dall'oggetto e non c'è un calcolo: l'oggetto passa il valore e basta.
- Gli ingressi dell'oggetto **non hanno** le opzioni **lo avvia** e **valore iniziale**: i valori di partenza della componente si impostano nelle sue proprietà, nell'editor della finestra.
- Se la finestra **non è aperta**, l'ultimo valore di ogni ingresso viene tenuto e la finestra lo mostra quando si apre (con l'opzione del progetto **Una finestra riaperta mostra subito gli ultimi valori**, accesa di serie). Il programma tiene al massimo 2000 valori di questo tipo.
- Impostare un valore da uno schema **non** fa mandare niente alla componente: per esempio, mandare sì all'ingresso **valore** di un Interruttore lo accende, ma la sua uscita **valore** non manda niente. Escono solo i gesti dell'utente.
- **abilitato** e **visibile** reagiscono solo al valore **no** vero e proprio (`false`): `false` disabilita o nasconde la componente, qualsiasi altro valore la riabilita o la mostra. Il testo `"no"` o il numero 0 **non** la nascondono: per un testo usa prima [Cast (converti tipo)](core.convert) in sì/no, o un blocco [Costante · Variabile](core.value) di tipo sì/no.

### Dalla finestra allo schema (uscite)

- Quando l'utente usa la componente (clic, scrittura, spostamento del cursore…), il valore esce dalle uscite dell'oggetto e va ai blocchi collegati.
- Quando una finestra **si apre**, non esce niente: nessun pulsante viene «ripremuto».
- Se la stessa finestra è aperta in più copie (due schermi, due browser), il gesto fatto in una esce una volta sola dall'oggetto e, con l'opzione **Le copie della stessa finestra restano allineate**, si vede anche nelle altre.

### Un oggetto per componente

Ogni componente ha **un solo oggetto**, in uno solo degli schemi del progetto. Se ce ne sono due (per esempio dopo aver duplicato l'oggetto con **Ctrl D**), il programma non parte: «La componente *finestra* › *componente* ha già il suo oggetto in *schema*/*blocco*». Se ti serve il valore di una componente in più schemi, portalo con le [porte di schema](core.schemaOut).

Se elimini la componente dalla finestra, il suo oggetto resta nello schema e segna un errore finché non togli anche lui (l'IDE te lo ricorda quando elimini la componente).

Per le regole generali vedi [Come funziona un blocco](ide/blocks) e [L'oggetto di una componente](ide/components).

## Esempi

### 1. Un pulsante che conta

Finestra con un [Pulsante](ui.button) **Conta** e un [Valore](ui.value) **totale**. Crea l'oggetto di tutti e due nello stesso schema:

```
[Pulsante: Conta] premuto ──▶ più [Contatore (++ −−)] conteggio ──▶ valore [Valore: totale]
```

A ogni clic il valore mostrato nella finestra cresce di 1: 1, 2, 3… Chiudendo e riaprendo la finestra, si vede subito l'ultimo numero.

### 2. Un campo che si abilita con un interruttore

```
[Interruttore: modifica] valore ──▶ abilitato [Campo di testo: nome]
```

Quando l'utente spegne l'[Interruttore](ui.toggle), esce no e il [Campo di testo](ui.text) si disabilita; riaccendendolo, esce sì e il campo torna usabile. All'apertura della finestra non esce niente: imposta lo stato iniziale del campo nelle sue proprietà.

### 3. Nascondere un'etichetta

```
[Casella di spunta: avanzate] valore ──▶ valore [Cast (converti tipo): sì/no] risultato ──▶ visibile [Etichetta: suggerimento]
```

La [Casella di spunta](ui.checkbox) manda già sì/no, quindi qui [Cast (converti tipo)](core.convert) non sarebbe necessario; diventa necessario se il valore arriva come testo, per esempio `"false"` letto da un file: senza conversione il testo `"false"` **non** nasconderebbe l'etichetta.

### 4. Il testo di un pulsante dallo schema

```
[Intervallo (setInterval): 1 s] impulso ──▶ più [Contatore (++ −−)] conteggio ──▶ s [Template (formatta): "Attendi… {s}"] testo ──▶ testo [Pulsante: Avvia]
```

Su [Template (formatta)](core.format) aggiungi un ingresso e rinominalo **s**. Il testo del pulsante cambia ogni secondo (`Attendi… 1`, `Attendi… 2`…); il pulsante resta cliccabile e il suo **premuto** continua a uscire.

## Errori

Sono errori del progetto, non dell'Eccezione: il programma non parte, oppure li segnala il pannello **Problemi**.

| Messaggio | Quando |
|---|---|
| Il blocco *id* rappresenta una componente della finestra «*finestra*», che non c'è | (Problemi) La finestra scelta non c'è più nel progetto. |
| Il blocco *id* rappresenta la componente «*componente*», che non c'è | (Problemi) La componente è stata eliminata dalla finestra, o **Componente** è vuoto. |
| Il blocco *id* rappresenta una componente che non c'è (*finestra* › *componente*) | Il programma non parte, per lo stesso motivo. |
| La componente *finestra* › *componente* ha già il suo oggetto in *schema*/*blocco* | Due oggetti per la stessa componente. |
| La componente *componente* (*tipo*) non c'è: manca il suo pacchetto | Il pacchetto della componente (per esempio [Componenti UI standard](logicstudio-ui)) non è installato. |

## Vedi anche

- [L'oggetto di una componente](ide/components) e [Le finestre](ide/windows)
- Le componenti: [Pulsante](ui.button), [Campo di testo](ui.text), [Interruttore](ui.toggle), [Valore](ui.value) e le altre in [Componenti UI standard](logicstudio-ui)
- [Parametro (ingresso di schema)](core.schemaIn) e [Return (uscita di schema)](core.schemaOut)
- [Come funziona un blocco](ide/blocks)
