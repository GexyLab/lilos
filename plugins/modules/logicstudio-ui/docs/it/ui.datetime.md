# Data e ora

`ui.datetime` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un campo per scegliere una data, un'ora, o tutte e due, con il calendario del browser. Il valore viaggia come testo nel formato ISO (`2026-11-11`, `14:30`, `2026-11-11T14:30`).

Non confonderla con il blocco [Data e ora](core.now) dei Blocchi di base, che legge l'ora attuale.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra il campo. |
| **Tipo** | data, ora, data e ora | data e ora | Cosa si sceglie. |

Il campo si apre sempre vuoto: per una data iniziale usa l'ingresso **valore (ISO)** con un valore iniziale.

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore (ISO)** (`value`) | testo | Mette una data o un'ora nel campo, senza che il campo mandi niente. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e non si può più cambiare. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore (ISO)** (`value`) | testo | La data o l'ora scelta, quando l'utente la cambia. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**Il formato** dipende dal **Tipo**:

| Tipo | Esce | Esempio |
|---|---|---|
| data | `AAAA-MM-GG` | `2026-11-11` |
| ora | `HH:MM` (24 ore) | `14:30` |
| data e ora | `AAAA-MM-GGTHH:MM` | `2026-11-11T14:30` |

Il campo si vede nella lingua e nel formato del browser (per esempio «11/11/2026, 14:30»), ma allo schema arriva sempre il formato ISO qui sopra. **È l'ora locale**, senza fuso orario.

**Quando manda.** Quando la data cambia ed è completa: scegliendola dal calendario, o finendo di scriverla, o uscendo dal campo. Se l'utente cancella il campo, manda `""`. Una data scritta a metà non manda niente.

**Dallo schema**, l'ingresso **valore (ISO)** accetta un testo ISO. Il campo ne prende solo l'inizio: i primi 10 caratteri per una data, i primi 5 per un'ora, i primi 16 per data e ora. Quindi:

| Arriva | Tipo data | Tipo ora | Tipo data e ora |
|---|---|---|---|
| `"2026-11-11"` | 11/11/2026 | vuoto | vuoto (manca l'ora) |
| `"14:30"` | vuoto | 14:30 | vuoto |
| `"2026-11-11T14:30:00"` | 11/11/2026 | vuoto | 11/11/2026 14:30 |
| un numero (millisecondi) | vuoto | vuoto | vuoto |

> **Attenzione al fuso orario.** L'uscita **ISO** del blocco [Data e ora](core.now) è in **UTC** (finisce con `Z`, per esempio `2026-11-11T13:30:00.000Z`). Il campo non converte: la mostra come se fosse ora locale. In Italia, d'inverno, vedresti le 13:30 invece delle 14:30. Per l'ora locale costruisci il testo con le **parti** del blocco Data e ora (vedi l'esempio 2).

Per il tipo **ora** serve un testo che cominci con l'ora: un testo con la data davanti (`2026-11-11T14:30`) lascia il campo vuoto.

## Esempi

### 1. Una scadenza

```
Finestra «Promemoria»
└ Colonna (radice)
  ├ Data e ora  datetime1  Etichetta «Scadenza»  Tipo data
  └ Valore      value1     Etichetta «Scade il:»
```

```
[Data e ora: Scadenza] valore (ISO) ──▶ valore [Valore: Scade il:]
```

Scegliendo l'11 novembre 2026 nel calendario, il Valore mostra «Scade il: 2026-11-11».

### 2. Oggi, all'apertura

Per far partire il campo con la data di oggi (le **parti** del blocco Data e ora sono nell'ora del computer su cui gira lilOS):

```
[All'avvio] impulso ──▶ leggi [blocco Data e ora] parti ──▶ oggetto [Scomponi oggetto] year  ──▶ a [Formatta testo: «{a}-{m}-{g}»] testo ──▶ valore (ISO) [Data e ora: Scadenza]
                                                                                    month ──▶ m
                                                                                    day   ──▶ g
```

Nel [Scomponi oggetto](core.decompose) aggiungi le uscite **year**, **month** e **day**; nel [Formatta testo](core.format) gli ingressi **a**, **m**, **g**, e togli «lo avvia» da **a** e **m** (così il testo parte una volta sola, con **g**).

> Mese e giorno devono avere due cifre (`2026-03-05`, non `2026-3-5`), altrimenti il campo resta vuoto. Per i mesi e i giorni sotto il 10, aggiungi lo zero nello schema (per esempio con un [Se](core.if) e un [Confronta](core.compare) `< 10`).

## Accessibilità e tastiera

- È il campo data/ora del browser: si raggiunge con **Tab**; le **frecce su/giù** cambiano la parte selezionata (giorno, mese, anno, ora…), le **frecce destra/sinistra** passano da una parte all'altra, e un'icona apre il calendario. Il comportamento preciso dipende dal browser.
- L'**Etichetta** sopra non è collegata al campo.

## Vedi anche

- [Data e ora](core.now) (il blocco), [Scomponi oggetto](core.decompose)
- [Campo di testo](ui.text)
- [Componenti UI standard](logicstudio-ui)
