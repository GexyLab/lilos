# Console

`ui.console` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Mette una console del programma dentro la finestra: le righe scritte da [Print (console.log)](core.consoleWrite) e le domande di [Input (readline)](core.consoleRead), a cui l'utente risponde senza aprire un'altra finestra.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Console** | una delle console del progetto | Principale (`main`) | Quale console mostrare. L'elenco è quello di **Opzioni del progetto → Console**. |
| **Altezza (px)** | da 60 a 1200 | 160 | L'altezza della console nella finestra. Le righe in più scorrono. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara e non si può più rispondere alle domande. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

La Console non ha porte sue: le righe ci arrivano dai blocchi di console, non dal suo oggetto. L'oggetto serve solo per nasconderla o disabilitarla.

## Come funziona

- La console mostra le righe di quella console del programma, ognuna con la sua ora e il suo livello (normale, informazione, avviso, errore), comprese quelle scritte prima che la finestra si aprisse (quante ne tiene il programma, lo decidi in **Opzioni del progetto → Console**). Ne mostra al massimo le ultime 1000. Se sei in fondo, segue le righe nuove; se sei risalito a leggere, resta dove sei.
- Quando un blocco [Input (readline)](core.consoleRead) fa una domanda su quella console, in fondo compare la domanda con un campo: **Invio** manda la risposta, **Esc** annulla la domanda.
- In **Progetta** si vede solo un riquadro con l'icona del terminale e l'id della console (per esempio `main`).
- Nell'IDE, in **Anteprima** durante una Prova, la console mostra le righe della Prova.
- Fuori dall'IDE, le console seguono anche la scelta **Fuori dall'IDE** delle Opzioni del progetto: con «Solo quando chiedono un dato» (di serie), quando arriva una domanda si apre **anche** la finestra della console, oltre a questa componente. Puoi rispondere in una delle due. Se vuoi solo questa componente, scegli «Non mostrarle»… ma attenzione: con quella scelta le domande ricevono subito il loro valore predefinito. Di solito conviene lasciare la scelta di serie.
- Se la console scelta non esiste più nel progetto, la componente resta vuota.

## Esempi

### 1. Un registro sotto i comandi

```
Finestra «Backup»
└ Colonna (radice)
  ├ Pulsante  button1   Testo «Avvia il backup»
  └ Console   console1  Console Principale  Altezza 200
```

```
[Pulsante: Avvia il backup] premuto ──▶ leggi [readFile: ~/dati.txt] contenuto ──▶ contenuto [writeFile: ~/backup/dati.txt] scritto ──▶ invia [Costante · Variabile: «Backup fatto.»] valore ──▶ valore [Print (console.log): livello informazione]
[readFile] Eccezione ──▶ valore [Print (console.log): livello errore]
```

Ogni backup scrive una riga nella console della finestra: «Backup fatto.» o l'errore.

### 2. Una domanda dentro la finestra

```
Finestra «Quiz»
└ Colonna (radice)
  ├ Pulsante  button1   Testo «Nuova domanda»
  └ Console   console1  Altezza 120
```

```
[Pulsante: Nuova domanda] premuto ──▶ chiedi [Input (readline): «Quanto fa 7 × 8?» tipo numero] valore ──▶ a [Confronto (== ≠ < >): a = b] se vero ──▶ invia [Costante · Variabile: «Giusto!»] valore ──▶ valore [Print (console.log)]
[Costante · Variabile: 56] valore ──▶ b [Confronto (== ≠ < >)]                                                                se falso ──▶ invia [Costante · Variabile: «No, è 56.»] valore ──▶ valore [Print (console.log)]
```

La domanda compare in fondo alla console della finestra; l'utente scrive 56 e preme Invio.

## Accessibilità e tastiera

Il campo della risposta si raggiunge con **Tab**; **Invio** risponde, **Esc** annulla. Accanto alla domanda un suggerimento dice cosa serve (testo, numero, sì/no, un tasto); se la domanda ha un valore predefinito, lo vedi in grigio nel campo. Per le domande segrete il campo nasconde quello che scrivi.

## Vedi anche

- [Print (console.log)](core.consoleWrite), [Input (readline)](core.consoleRead)
- [Console](ide/consoles), nella guida dell'IDE
- [Componenti UI standard](logicstudio-ui)
