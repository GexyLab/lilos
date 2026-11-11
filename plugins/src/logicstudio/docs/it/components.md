# L'oggetto di una componente

Gli schemi **non toccano direttamente** le componenti di una finestra. Ogni componente ha il suo **oggetto** in uno schema: un blocco **Componente UI** (`core.component`, categoria Componenti UI) che ha **le stesse porte della componente**. Gli altri blocchi si collegano all'oggetto, e l'oggetto parla con la componente.

```
schema «main»                                         finestra «Principale»
[Intervallo (setInterval)] impulso ──▶ più [Contatore (++ −−)] conteggio ──▶ valore [Valore: contatore]  ═══  ┌──────────────┐
                                                                                    │ contatore 12 │
[Pulsante: Azzera] premuto ──▶ azzera [Contatore (++ −−)]                            ═══  │ [ Azzera ]   │
                                                                                    └──────────────┘
```

Qui **[Valore: contatore]** e **[Pulsante: Azzera]** sono gli oggetti delle due componenti della finestra.

## Le porte e il loro verso

Un oggetto ha:

- **ingressi** (← nelle Proprietà della componente): **quello che imposta uno schema**. Un valore che arriva lì va alla componente. Per esempio **testo** di un'**Etichetta**, **valore** di un **Indicatore**, **righe** di una **Tabella**, **opzioni** di una **Selezione**;
- **uscite** (→): **quello che fa l'utente**. Escono quando qualcuno usa la componente in una finestra aperta: **premuto** di un **Pulsante**, **valore** di un **Interruttore** o di un **Cursore**, **testo** e **invio** di un **Campo di testo**, **riga scelta** di una **Tabella**;
- l'uscita **Exception**, come ogni blocco.

Ogni componente (tranne i contenitori) ha anche due ingressi in più:

| Ingresso | Tipo | Cosa fa |
|---|---|---|
| **abilitato** (`enabled`) | sì/no | `false`: la componente si vede spenta e non si può usare; `true`: torna usabile. |
| **visibile** (`visible`) | sì/no | `false`: la componente sparisce dalla finestra; `true`: torna. |

Alcune componenti hanno lo stesso nome su un ingresso e un'uscita (per esempio **valore** di un **Interruttore**): l'ingresso lo imposta dallo schema, l'uscita dice quando l'ha cambiato l'utente.

Le porte di ogni componente sono nella sua pagina, per esempio [Pulsante](ui.button), [Etichetta](ui.label), [Indicatore](ui.gauge), [Linee](charts.line).

## Creare l'oggetto

Dalla finestra:

1. Apri la finestra e, in **Progetta**, seleziona la componente.
2. Nelle **Proprietà**, sezione **Oggetto nello schema**, leggi «Nessuno schema ha ancora il suo oggetto: senza, la componente si vede ma non fa niente.»
3. In **Nello schema** scegli lo schema (di serie il primo del progetto).
4. Premi **Crea il suo oggetto**.

L'IDE mette l'oggetto nello schema, più o meno in alto a sinistra della parte visibile, gli dà come etichetta il testo o l'etichetta della componente (per esempio «Saluta» per un pulsante), apre lo schema e lo seleziona. Lo schema risulta modificato: ricordati di salvare.

Una componente ha **un solo oggetto in tutto il progetto**. Puoi metterlo nello schema che preferisci; se lo sposti in un altro schema, togli quello vecchio.

I contenitori (Colonna, Riga, Griglia, Riquadro, Schede, Area libera) **non hanno oggetto** nell'IDE: non puoi spegnerli, nasconderli o cambiare la scheda aperta di **Schede** da uno schema. Per nascondere un gruppo di componenti, manda **visibile** a ognuna.

## Trovare l'oggetto

- Nella finestra, **doppio clic** sulla componente (in Progetta), oppure Proprietà → **Aprilo nello schema**: l'IDE apre lo schema, seleziona l'oggetto e lo mette in vista. Le Proprietà mostrano anche dove sta: «main › button1».
- Nello schema, **doppio clic** sull'oggetto, oppure tasto destro → **Apri la sua finestra**: apre la finestra.
- Nella **Mappa**, ogni finestra dice in quali schemi stanno gli oggetti delle sue componenti.

## L'oggetto nello schema

Sul foglio l'oggetto ha come titolo la sua etichetta (o il nome della componente) e sotto «Principale › button1» (finestra › id della componente). Nelle **Proprietà**, sezione **Componente UI**:

| Campo | Cosa fa |
|---|---|
| **Finestra** | Una finestra del progetto. Cambiandola, la componente torna vuota (—). |
| **Componente** | Una componente di quella finestra, mostrata come «testo o etichetta · tipo» (per esempio «Saluta · Pulsante»). |

Poi la tabella delle **Porte**: le porte aggiuntive della componente sono indicate **della componente**. Per l'oggetto non ci sono **lo avvia**, i valori iniziali né i pulsanti per aggiungere porte.

In uno schema da solo: «Uno schema da solo non ha finestre.»

## Come lavora

- Un valore che arriva a un **ingresso** dell'oggetto va subito alla componente in **ogni finestra aperta** di quel programma, e il motore lo ricorda.
- Quando l'utente usa la componente, il valore **esce dall'uscita** dell'oggetto e va lungo i collegamenti.
- Le componenti mandano qualcosa **solo quando qualcuno le usa** in una finestra aperta. Aprire una finestra non «ripreme» niente: un interruttore acceso all'apertura non manda il suo valore.
- Il motore ricorda l'**ultimo valore** mandato a ogni componente: con l'opzione **Una finestra riaperta mostra subito gli ultimi valori** (di serie), chi apre o riapre la finestra vede subito gli ultimi valori. Vedi [Progetti](ide/projects), Opzioni → L'app e le sue finestre.
- Con **Le copie della stessa finestra restano allineate** (di serie), la stessa finestra aperta in due posti mostra gli stessi valori.

Un **Pulsante** con **Azione al clic** (Apri una finestra, Chiudi questa finestra) fa la sua azione e manda anche **premuto** all'oggetto. Vedi [Finestre](ide/windows).

## Quando qualcosa non torna

| Problema | Cosa vedi | Cosa fare |
|---|---|---|
| La componente non ha oggetto | Si vede ma non fa niente. | **Crea il suo oggetto**. |
| Hai eliminato la componente | L'oggetto resta nello schema; alla prova: «Il blocco component1 rappresenta la componente «button1», che non c'è». | Elimina l'oggetto, o scegli un'altra **Componente**. |
| Hai eliminato o rinominato la finestra | Alla prova: «Il blocco component1 rappresenta una componente della finestra «Vecchio nome», che non c'è». | Scegli di nuovo **Finestra** e **Componente**. |
| Due oggetti per la stessa componente (per esempio dopo **Duplica**) | Il motore rifiuta: «La componente Principale › button1 ha già il suo oggetto in main/component1». | Elimina uno dei due. |
| L'oggetto non ha componente (—) | Alla prova: «Il blocco component2 rappresenta la componente «», che non c'è». | Scegli la **Componente**. |
| Il pacchetto della componente non è installato | Il motore: «La componente button1 (ui.button) non c'è: manca il suo pacchetto». | Installa il pacchetto dall'AppStore → Kernel. |

## Componenti con porte aggiuntive

Alcuni grafici (**Tempo reale**, una serie per porta; **Gradini**, uno stato per porta) prevedono porte aggiuntive. In questa versione l'IDE non ha il pulsante per aggiungerle a una componente: le porte aggiunte scritte nel file `.lsui` si vedono sull'oggetto in corsivo, ma non si aggiungono né si tolgono dall'IDE.

## Esempi

### 1. Un pulsante che conta

Nella finestra: un **Pulsante** (**Testo** = `+1`) e un **Valore** (**Etichetta** = `Pressioni`). Crea i due oggetti nello schema **main**, poi:

```
[Pulsante: +1] premuto ──▶ più [Contatore (++ −−)] conteggio ──▶ valore [Valore: Pressioni]
```

**Prova** → **Anteprima**: ogni clic su **+1** fa salire il numero.

### 2. Abilitare un pulsante solo con un nome scritto

```
[Campo di testo: nome] testo ──▶ testo [Funzioni stringa: lunghezza] risultato ──▶ a [Confronto (== ≠ < >): a > b, b = 0] risultato ──▶ abilitato [Pulsante: Invia]
```

Su **Confronto**, **b** ha valore iniziale `0` e **lo avvia** tolto. Appena scrivi qualcosa il pulsante si accende; se cancelli tutto, si spegne. All'apertura della finestra il pulsante è acceso finché non scrivi niente: se vuoi che parta spento, collega anche un blocco **Costante · Variabile** (**Tipo** = **sì/no**, **Valore** = `no`, niente collegato a **invia**) ad **abilitato**.

### 3. Una tabella da un file

```
[All'avvio (main)] impulso ──▶ leggi [readFile: ~/spesa.json, JSON] contenuto ──▶ righe [Tabella]
[Tabella] riga scelta ──▶ valore [Print (console.log): JSON leggibile]
```

`~/spesa.json` contiene `[{"cosa": "pane", "quanto": 2}, {"cosa": "latte", "quanto": 1}]`. La tabella mostra le due righe; un clic su una riga la scrive in console. **readFile** è nel pacchetto [Blocchi di lilOS](logicstudio-lilos).

## Vedi anche

- [Finestre](ide/windows)
- [Componenti UI](logicstudio-ui)
- [Componente UI](core.component)
- [Collegamenti e tipi delle porte](ide/links)
