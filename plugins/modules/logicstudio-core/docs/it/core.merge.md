# Primo che arriva

`core.merge` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Riunisce più ingressi in una sola uscita: ogni valore che arriva su uno qualsiasi degli ingressi passa subito su **valore**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| (gli ingressi aggiunti) | qualsiasi | I valori da riunire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Ogni valore arrivato, così com'è. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Porte aggiuntive

Il blocco nasce senza ingressi: aggiungili nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso**. Puoi averne fino a 16 (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo qualsiasi, chiamati **a**, **b**, **c**… Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Nonostante il nome, il blocco non fa passare solo il primo valore: **fa passare ogni valore, nell'ordine in cui arriva**, da qualunque ingresso venga. È il punto in cui due o più strade di uno schema tornano a essere una.

- Il valore passa così com'è, anche `null`, `false` o `0`.
- Non aspetta gli altri ingressi e non li ricorda: un valore arrivato su **a** non viene rimandato quando arriva qualcosa su **b**.
- Un ingresso a cui togli «lo avvia» non fa passare niente: i valori che arrivano lì vengono solo ricordati, e il blocco non li usa mai.
- Due valori che arrivano «insieme» passano uno dopo l'altro, nell'ordine in cui il blocco li riceve.

## Esempi

### 1. Due pulsanti per la stessa azione

```
[Pulsante: Salva]          premuto ──▶ a  [Primo che arriva] valore ──▶ invia [Notifica: Salvato]
[Pulsante: Salva e chiudi] premuto ──▶ b
```

Qualunque dei due pulsanti venga premuto, l'impulso arriva al blocco [Notifica](lilos.notify), che ti avvisa.

### 2. Le due strade di un Se tornano insieme

```
[Se] allora     ──▶ a [Moltiplica: × 1,22] risultato ──▶ a [Primo che arriva] valore ──▶ valore [Valore: prezzo]
     altrimenti ────────────────────────────────────────▶ b
```

La [Moltiplica](core.multiply) ha il valore iniziale 1,22 su **b**. Se il prezzo va tassato, passa dalla Moltiplica; altrimenti passa com'è. In ogni caso arriva alla componente [Valore](ui.value) dallo stesso blocco. Con 100 e la condizione sì, arriva 122; con la condizione no, arriva 100.

### 3. Valori da più sensori in una sola console

Con gli ingressi **a**, **b**, **c**: se arrivano 21 su **a**, poi 19 su **c**, poi 22 su **a**, il blocco manda 21, 19, 22, in quest'ordine.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Aspetta tutti](core.join) per partire solo quando sono arrivati tutti
- [Scegli](core.select) per far passare un solo ingresso, scelto con un numero
- [Come funziona un blocco](ide/blocks)
