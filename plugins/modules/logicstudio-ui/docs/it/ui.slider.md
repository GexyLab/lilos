# Cursore

`ui.slider` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Una barra con una manopola da trascinare: l'utente sceglie un numero tra un minimo e un massimo. Accanto si vede il numero scelto, con la sua unità.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra il cursore. |
| **Minimo** | numero | 0 | Il valore a sinistra. |
| **Massimo** | numero | 100 | Il valore a destra. |
| **Passo** | numero | 1 | Di quanto si muove il cursore a ogni scatto: con 5, i valori sono 0, 5, 10… Con 0 o vuoto vale 1. |
| **Unità** | testo | vuoto | Scritta **attaccata** al numero mostrato: con `%` si vede «50%». Per uno spazio, scrivilo tu all'inizio: ` °C` dà «50 °C». |
| **All'inizio** | numero | 0 | La posizione del cursore quando la finestra si apre. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Sposta il cursore, senza che mandi niente. |
| **min** (`min`) | numero | Cambia il minimo. |
| **max** (`max`) | numero | Cambia il massimo. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e non si può più spostare. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Quando l'utente **lascia** il cursore in una nuova posizione: il numero scelto. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**Quando manda.** Mentre l'utente trascina la manopola, il numero accanto cambia ma **non parte niente**: il cursore manda il valore **una volta, quando l'utente lo lascia**. Un clic in un punto della barra lo sposta lì e manda subito. Con la tastiera, ogni pressione di una freccia sposta di un passo e manda il nuovo valore. Se l'utente lo lascia dove era, non manda niente.

**Il valore** è sempre un multiplo del **Passo** contato dal minimo, tra minimo e massimo: con minimo 0, massimo 10 e passo 3, i valori possibili sono 0, 3, 6, 9.

**Dallo schema.**

- **valore**: sposta la manopola. Un testo come `"42"` o `"4,5"` va bene; `null` e `""` valgono 0. Un valore che non è un numero (`"ciao"`, `true`, `false`) mette la manopola a metà e accanto si legge «NaN». Un valore fuori dall'intervallo porta la manopola al bordo, ma **il numero accanto mostra il valore ricevuto** (per esempio «150» con la manopola tutta a destra) finché l'utente non la tocca.
- **min** e **max**: cambiano l'intervallo e ridisegnano il cursore, che tiene l'ultimo valore. Se il minimo supera il massimo, il cursore resta bloccato al minimo.
- Il **Passo** non si può cambiare dallo schema.

**All'apertura** il cursore mostra **All'inizio**, ma il programma non lo riceve: se lo schema deve conoscerlo, dagli lo stesso numero con un blocco [Valore](core.value).

## Esempi

### 1. Una soglia

```
Finestra «Allarme»
└ Colonna (radice)
  ├ Cursore  slider1  Etichetta «Soglia»  Minimo 0  Massimo 50  Passo 0.5  Unità « °C»  All'inizio 25
  └ Spia     lamp1    Etichetta «Sopra la soglia»  Colore rosso
```

```
[Valore: 25]      valore ──▶ b [Confronta: a > b] risultato ──▶ accesa [Spia: Sopra la soglia]
[Cursore: Soglia] valore ──▶ b
[Ogni…: 10 s] impulso ──▶ leggi [Leggi file: ~/temperatura.txt] contenuto ──▶ valore [Converti: numero] risultato ──▶ a [Confronta]
```

Il [Valore](core.value) 25 dà al confronto la soglia iniziale, uguale a quella mostrata. Quando l'utente sposta il cursore su 30,5 e lo lascia, la soglia diventa 30,5.

### 2. Un volume con il massimo che cambia

```
Finestra «Audio»
└ Colonna (radice)
  ├ Casella di spunta  checkbox1  Etichetta «Modalità notte»
  └ Cursore            slider1    Etichetta «Volume»  Unità «%»  All'inizio 50
```

Con un [Se](core.if):

```
[Casella di spunta: Modalità notte] valore ──▶ condizione [Se] allora  ──▶ invia [Valore: 30]  valore ──▶ max [Cursore: Volume]
                                                               altrimenti ──▶ invia [Valore: 100] valore ──▶ max
```

Con la modalità notte il cursore va al massimo fino a 30; se era su 50, la manopola va in fondo a destra ma il numero mostra ancora «50%» finché l'utente non lo tocca. Nota: il cursore non manda niente quando cambia il massimo, quindi lo schema continua a credere che il volume sia 50. Se ti serve il valore ridotto, calcolalo anche nello schema con un [Limita](core.clamp).

## Accessibilità e tastiera

- È un cursore vero: si raggiunge con **Tab**; **freccia destra** e **su** aumentano di un passo, **sinistra** e **giù** diminuiscono, **Pagina su/giù** fanno salti più grandi, **Home** e **Fine** vanno al minimo e al massimo (secondo il browser). Ogni pressione manda il valore.
- L'**Etichetta** sopra non è collegata al cursore: il lettore di schermo legge il valore ma non il nome.
- Quando lo schema manda un valore o un nuovo minimo o massimo, il cursore viene ridisegnato e, se aveva il fuoco della tastiera, lo perde.

## Vedi anche

- [Campo numerico](ui.number), per scrivere un numero preciso
- [Barra di avanzamento](ui.progress), [Indicatore](ui.gauge)
- [Limita](core.clamp)
- [Componenti UI standard](logicstudio-ui)
