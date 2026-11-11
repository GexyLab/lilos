# Interruttore

`ui.toggle` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un interruttore a levetta, acceso o spento. Quando l'utente lo sposta, manda il nuovo stato allo schema; lo schema può anche spostarlo.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | «Interruttore» | Il nome dell'interruttore per i lettori di schermo. **Oggi non si vede** nella finestra (vedi sotto). |
| **Acceso all'inizio** | sì/no | no | Come si vede l'interruttore quando la finestra si apre. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | sì/no | Accende o spegne l'interruttore, senza che mandi niente. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e non si può più spostare. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | sì/no | Quando l'utente lo sposta: `true` se ora è acceso, `false` se è spento. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**L'utente** lo sposta con un clic, o con **Spazio** / **Invio** quando ha il fuoco. A ogni spostamento l'interruttore manda subito `true` o `false` sull'uscita **valore**.

**Lo schema** lo sposta con l'ingresso **valore**, e in quel caso l'interruttore **non** manda niente sull'uscita. L'ingresso lo accende solo con questi valori:

| Arriva | L'interruttore |
|---|---|
| `true`, il testo `"true"`, il numero `1` | acceso |
| qualsiasi altra cosa: `false`, `0`, `"1"`, `"sì"`, `"on"`, `null` | spento |

> Attenzione: il **testo** `"1"` e il testo `"sì"` lo **spengono**. Se il valore viene da un file o da un testo, passalo prima da [Converti](core.convert) **In** sì/no.

**All'apertura** si vede lo stato di **Acceso all'inizio**, ma il programma non lo riceve: l'uscita manda qualcosa solo quando l'utente lo sposta. Se lo schema deve sapere lo stato iniziale, dagli lo stesso valore con un blocco [Valore](core.value). Con l'opzione «Una finestra riaperta mostra subito gli ultimi valori», riaprendo la finestra l'interruttore mostra l'ultimo stato (dell'utente o dello schema).

**L'etichetta non si vede.** L'interruttore disegna solo la levetta: il testo dell'**Etichetta** è solo per i lettori di schermo. Per una scritta visibile, metti l'interruttore in una [Riga](ui.row) con un'[Etichetta](ui.label) accanto, oppure usa una [Casella di spunta](ui.checkbox), che mostra il suo testo.

## Esempi

### 1. Accendere una lampada

```
Finestra «Salotto»
└ Colonna (radice)
  └ Riga  Allineamento centro
    ├ Interruttore  toggle1  Etichetta «Luce»
    └ Etichetta     label1   Testo «Luce»
```

```
[Interruttore: Luce] valore ──▶ dati [Evento a lilOS: luce.salotto]
```

Ogni volta che l'utente sposta l'interruttore, lilOS riceve l'evento `luce.salotto` con `true` o `false`.

### 2. Un programma che si ferma e riparte

```
Finestra «Raccolta»
└ Colonna (radice)
  ├ Interruttore  toggle1  Etichetta «Raccolta attiva»  Acceso all'inizio sì
  └ Valore        value1   Etichetta «Letture:»
```

```
[Interruttore: Raccolta attiva] valore ──▶ acceso [Ogni…: 5 s] impulso ──▶ più [Contatore] conteggio ──▶ valore [Valore: Letture:]
```

[Ogni…](core.every) parte da solo (come l'interruttore, che è acceso all'inizio). Spegnendo l'interruttore le letture si fermano; riaccendendolo ripartono.

### 3. Due interruttori che si escludono

```
[Interruttore: Estate] valore ──▶ valore [NON] risultato ──▶ valore [Interruttore: Inverno]
[Interruttore: Inverno] valore ──▶ valore [NON] risultato ──▶ valore [Interruttore: Estate]
```

Accendendo **Estate**, **Inverno** si spegne, e viceversa. Non c'è un giro senza fine: un valore che arriva sull'ingresso di un interruttore non esce dalla sua uscita.

## Accessibilità e tastiera

- È un pulsante con il ruolo di interruttore: si raggiunge con **Tab**, si sposta con **Spazio** o **Invio**, e il lettore di schermo dice il suo nome (l'**Etichetta**) e se è acceso.
- Quando lo schema lo sposta, l'interruttore viene ridisegnato e, se aveva il fuoco della tastiera, lo perde.

## Vedi anche

- [Casella di spunta](ui.checkbox), con il testo visibile
- [Spia](ui.lamp), per mostrare uno stato senza farlo cambiare
- [NON](core.not), [Converti](core.convert)
- [Componenti UI standard](logicstudio-ui)
