# AND

`core.and` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Manda **sì** solo se tutti gli ingressi che hanno un valore sono **sì**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | sì/no | La prima condizione. |
| **b** | sì/no | La seconda condizione. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | sì/no | **sì** se tutti gli ingressi con un valore sono sì, altrimenti **no**. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo sì/no, chiamati con le lettere che seguono: **c**, **d**, **e**… fino a **r**. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva un valore su un ingresso, il blocco rifà il conto con l'ultimo valore di ogni ingresso e manda il risultato su **risultato**. Lo manda sempre, anche se non è cambiato.

- Gli ingressi che non hanno ancora ricevuto niente **non contano**: con solo **a** = sì il risultato è **sì**, anche se **b** non è mai arrivato. Se vuoi che un ingresso mancante valga **no**, dagli il valore iniziale `false` nelle **Proprietà**.
- Ogni valore viene letto come sì/no:
  - un testo è **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` o `off`; ogni altro testo è **sì** (anche `"falso"`);
  - un numero è **no** se è 0, **sì** altrimenti;
  - `null` è **no**; oggetti e liste sono **sì**, anche vuoti.

| a | b | risultato |
|---|---|---|
| sì | sì | sì |
| sì | no | no |
| no | sì | no |
| no | no | no |
| sì | (mai arrivato) | sì |

## Esempi

### 1. Due condizioni insieme

```
[Interruttore: acceso]      valore ──▶ a  [AND] risultato ──▶ acceso [Intervallo (setInterval): 1 s]
[Casella di spunta: armato] valore ──▶ b
```

Il blocco [Intervallo (setInterval)](core.every) manda impulsi solo quando l'[Interruttore](ui.toggle) è acceso **e** la [Casella di spunta](ui.checkbox) è spuntata. Togli **Parte da solo** nelle impostazioni di Ogni…, così non parte prima che arrivi il risultato. Dai a **b** il valore iniziale `false`: così, se l'utente accende solo l'interruttore, il risultato resta **no**.

### 2. Tre controlli con un ingresso aggiunto

Aggiungi l'ingresso **c** e collega tre [Confronto (== ≠ < >)](core.compare):

```
[Confronto (== ≠ < >): temperatura < 30] risultato ──▶ a  [AND] risultato ──▶ condizione [If · Else]
[Confronto (== ≠ < >): umidità < 70]     risultato ──▶ b
[Confronto (== ≠ < >): vento < 40]       risultato ──▶ c
```

Con temperatura 25, umidità 80 e vento 10, il risultato è **no** (l'umidità non va). Quando l'umidità scende a 60, il blocco manda **sì**.

### 3. Valori che non sono sì/no

**a** = `1`, **b** = `"on"` → **sì**. **a** = `1`, **b** = `"off"` → **no**. **a** = `"falso"`, **b** = `true` → **sì** (la parola `falso` non è riconosciuta).

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [OR](core.or), [XOR](core.xor), [NOT](core.not)
- [Confronto (== ≠ < >)](core.compare) per ottenere un sì/no da due valori
- [If · Else](core.if) per scegliere una strada con un sì/no
- [Come funziona un blocco](ide/blocks)
