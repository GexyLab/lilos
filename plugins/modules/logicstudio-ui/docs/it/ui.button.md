# Pulsante

`ui.button` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un pulsante: quando l'utente lo preme, manda un impulso allo schema. Può anche, da solo, aprire un'altra finestra del progetto o chiudere quella in cui sta.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Testo** | testo (traducibile) | «Pulsante» | La scritta sul pulsante. |
| **Icona** | —, drop, play, stop, power, gear, bell, check, x, plus, minus, refresh, save, trash, warning, info, home, window, link | — (nessuna) | Un'icona prima del testo. |
| **Aspetto** | principale, normale, pericolo | principale | **principale**: colorato, per l'azione più importante. **normale**: neutro. **pericolo**: rosso, per le azioni che cancellano o fermano. |
| **Azione al clic** | Niente, Apri una finestra, Chiudi questa finestra | Niente | Cosa fa il pulsante da solo, oltre a mandare **premuto**. Con **Apri una finestra** scegli quale, tra le altre finestre del progetto. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | Cambia la scritta sul pulsante. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e non si può più premere. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **premuto** (`pressed`) | impulso | Ogni volta che l'utente preme il pulsante. Il valore è `true`. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**premuto.** A ogni clic (o **Invio** / **Spazio** con il pulsante in primo piano) il pulsante manda `true` su **premuto**. Due clic veloci sono due impulsi. Quando la finestra si apre, il pulsante non manda niente.

**testo.** Un valore su **testo** sostituisce la scritta: un numero o un sì/no si vedono come testo (`3`, `true`), un oggetto come JSON, `null` lascia il pulsante senza scritta. L'icona resta. Il testo che arriva dallo schema non viene tradotto.

**Azione al clic.** L'azione la fa la finestra, anche se il pulsante non ha un oggetto in nessuno schema:

| Azione | In lilOS | Nell'IDE (Anteprima) |
|---|---|---|
| **Apri una finestra** | Apre la finestra scelta del progetto. Se è già aperta, la porta davanti invece di aprirne una seconda. | Apre un'anteprima di quella finestra in una finestra a parte. |
| **Chiudi questa finestra** | Chiude la finestra del pulsante. Se era l'ultima finestra di un'app fatta con **Crea app**, il programma dell'app si ferma. Un programma attivo invece continua a girare. | Non fa niente. |

- Prima il pulsante manda **premuto**, poi fa l'azione: anche con **Chiudi questa finestra** lo schema riceve l'impulso.
- Se la finestra scelta è stata eliminata o rinominata, **Apri una finestra** non fa niente: scegline di nuovo una nelle Proprietà.
- In **Progetta** il pulsante non reagisce.

## Esempi

### 1. Avvia e ferma

```
Finestra «Pompa»
└ Colonna (radice)
  ├ Riga
  │ ├ Pulsante  button1  Testo «Avvia»  Icona play  Aspetto principale
  │ └ Pulsante  button2  Testo «Ferma»  Icona stop  Aspetto pericolo
  └ Spia        lamp1    Etichetta «In funzione»
```

```
[Pulsante: Avvia] premuto ──▶ invia [Costante · Variabile: sì]  valore ──▶ accesa [Spia: In funzione]
[Pulsante: Ferma] premuto ──▶ invia [Costante · Variabile: no]  valore ──▶ accesa [Spia: In funzione]
```

I due blocchi [Costante · Variabile](core.value) sono di tipo sì/no e hanno l'ingresso **invia** collegato (mostralo con l'occhio accanto alla porta, nelle Proprietà): mandano il valore solo quando premi, non all'avvio. **Avvia** accende la spia, **Ferma** la spegne.

Per non poter premere due volte **Avvia**, collega anche lo stato ai pulsanti:

```
[Pulsante: Avvia] premuto ──▶ valore [NOT] risultato ──▶ abilitato [Pulsante: Avvia]
[Pulsante: Ferma] premuto ──▶ invia [Costante · Variabile: sì] valore ──▶ abilitato [Pulsante: Avvia]
```

Dopo **Avvia** il pulsante si spegne (il blocco [NOT](core.not) di `true` è `false`); **Ferma** lo riabilita.

### 2. Un pulsante che apre le impostazioni

```
Finestra «Principale»
└ Colonna (radice)
  ├ Valore    value1   Etichetta «Temperatura:»
  └ Pulsante  button1  Testo «Impostazioni…»  Icona gear  Aspetto normale  Azione al clic «Apri una finestra: Impostazioni»

Finestra «Impostazioni»
└ Colonna (radice)
  ├ Cursore   slider1  Etichetta «Soglia»
  └ Pulsante  button1  Testo «Chiudi»  Aspetto normale  Azione al clic «Chiudi questa finestra»
```

Non servono oggetti: il primo pulsante apre la finestra **Impostazioni**, il secondo la chiude. Le due finestre hanno entrambe un pulsante `button1`: gli id valgono dentro la propria finestra.

### 3. Un pulsante che conta i clic sul suo testo

```
[Pulsante: Premi] premuto ──▶ più [Contatore (++ −−)] conteggio ──▶ n [Template (formatta): «Premuto {n} volte»] testo ──▶ testo [Pulsante: Premi]
```

Nel [Template (formatta)](core.format) aggiungi l'ingresso **n**. A ogni clic il pulsante cambia scritta: «Premuto 1 volte», «Premuto 2 volte»…

## Accessibilità e tastiera

- È un pulsante vero: si raggiunge con **Tab** e si preme con **Invio** o **Spazio**; il lettore di schermo legge il suo testo.
- Un pulsante con solo l'icona e senza testo non ha un nome per i lettori di schermo: scrivi sempre un **Testo**.
- Quando lo schema cambia il **testo**, il pulsante viene ridisegnato e, se aveva il fuoco della tastiera, lo perde.

## Vedi anche

- [Interruttore](ui.toggle), per uno stato acceso/spento
- [Contatore (++ −−)](core.counter), [Costante · Variabile](core.value)
- [Finestre](ide/windows)
- [Componenti UI standard](logicstudio-ui)
