# Casella di spunta

`ui.checkbox` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Una casella con il suo testo accanto, spuntata o no. Quando l'utente la cambia, manda il nuovo stato allo schema; lo schema può anche spuntarla o togliere la spunta.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | «Casella» | Il testo accanto alla casella. Anche un clic sul testo cambia la spunta. |
| **Spuntata all'inizio** | sì/no | no | Come si vede la casella quando la finestra si apre. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | sì/no | Mette o toglie la spunta, senza che la casella mandi niente. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara e non si può più cambiare. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | sì/no | Quando l'utente la cambia: `true` se ora è spuntata, `false` se non lo è. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**L'utente** la cambia con un clic sulla casella o sul suo testo, o con **Spazio** quando ha il fuoco. A ogni cambio la casella manda subito `true` o `false`.

**Lo schema** la cambia con l'ingresso **valore**, e in quel caso la casella **non** manda niente. Come per l'[Interruttore](ui.toggle), la spunta c'è solo con `true`, il testo `"true"` o il numero `1`; ogni altro valore (anche il testo `"1"` o `"sì"`) la toglie.

**All'apertura** si vede lo stato di **Spuntata all'inizio**, ma il programma non lo riceve finché l'utente non cambia la casella. Se lo schema deve conoscerlo, dagli lo stesso valore con un blocco [Valore](core.value).

La differenza con l'Interruttore è solo nell'aspetto: la Casella mostra il suo testo, l'Interruttore no. Di solito la casella si usa per una scelta da confermare dopo (in un modulo), l'interruttore per qualcosa che ha effetto subito.

## Esempi

### 1. Accetto le condizioni

```
Finestra «Iscrizione»
└ Colonna (radice)
  ├ Casella di spunta  checkbox1  Etichetta «Ho letto e accetto le condizioni»
  └ Pulsante           button1    Testo «Invia»
```

Il pulsante deve funzionare solo con la casella spuntata. Dai all'ingresso **abilitato** dell'oggetto del pulsante il **valore iniziale** `false`, poi:

```
[Casella di spunta: Ho letto…] valore ──▶ abilitato [Pulsante: Invia]
```

All'avvio il pulsante è spento; spuntando la casella si accende, togliendo la spunta si spegne di nuovo.

### 2. Più opzioni in un oggetto

```
Finestra «Esporta»
└ Colonna (radice)
  ├ Casella di spunta  checkbox1  Etichetta «Includi le note»
  ├ Casella di spunta  checkbox2  Etichetta «Includi le immagini»
  └ Pulsante           button1    Testo «Esporta»
```

```
[Valore: no] valore ──▶ note     [Componi oggetto] oggetto ──▶ valore [Scrivi in console]
[Valore: no] valore ──▶ immagini
[Casella di spunta: Includi le note]      valore ──▶ note
[Casella di spunta: Includi le immagini]  valore ──▶ immagini
[Pulsante: Esporta] premuto ──▶ esporta
```

Nel [Componi oggetto](core.compose) aggiungi i campi **note**, **immagini** (senza «lo avvia») ed **esporta**. I due [Valori](core.value) sì/no danno lo stato iniziale (`false`), così il campo c'è anche se l'utente non tocca la casella. Premendo **Esporta** la console mostra per esempio `{"note":true,"immagini":false,"esporta":true}`.

## Accessibilità e tastiera

- È una casella di spunta vera, con il suo testo collegato: si raggiunge con **Tab**, si cambia con **Spazio**, e il lettore di schermo legge il testo e lo stato.
- Quando lo schema la cambia, la casella viene ridisegnata e, se aveva il fuoco della tastiera, lo perde.

## Vedi anche

- [Interruttore](ui.toggle)
- [Pulsanti di opzione](ui.radios), per una scelta tra più possibilità
- [Componi oggetto](core.compose)
- [Componenti UI standard](logicstudio-ui)
