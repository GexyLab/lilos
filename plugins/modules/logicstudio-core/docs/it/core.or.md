# OR

`core.or` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Manda **sì** se almeno uno degli ingressi che hanno un valore è **sì**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | sì/no | La prima condizione. |
| **b** | sì/no | La seconda condizione. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | sì/no | **sì** se almeno un ingresso con un valore è sì, altrimenti **no**. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo sì/no, chiamati con le lettere che seguono: **c**, **d**, **e**… fino a **r**. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva un valore su un ingresso, il blocco rifà il conto con l'ultimo valore di ogni ingresso e manda il risultato su **risultato**, anche se non è cambiato.

- Gli ingressi che non hanno ancora ricevuto niente non contano: con solo **a** = no il risultato è **no**.
- Ogni valore viene letto come sì/no:
  - un testo è **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` o `off`; ogni altro testo è **sì** (anche `"falso"`);
  - un numero è **no** se è 0, **sì** altrimenti;
  - `null` è **no**; oggetti e liste sono **sì**, anche vuoti.

| a | b | risultato |
|---|---|---|
| sì | sì | sì |
| sì | no | sì |
| no | sì | sì |
| no | no | no |

## Esempi

### 1. Un allarme da due sensori

```
[Confronto (== ≠ < >): fumo > 50]         risultato ──▶ a  [OR] risultato ──▶ accesa [Spia: allarme]
[Confronto (== ≠ < >): temperatura > 60]  risultato ──▶ b
```

La [Spia](ui.lamp) si accende se c'è troppo fumo **oppure** fa troppo caldo. Con fumo 10 e temperatura 70 il risultato è **sì**; quando la temperatura torna a 40 diventa **no**.

### 2. Più pulsanti che fanno la stessa cosa

Con tre pulsanti di emergenza, aggiungi l'ingresso **c**. Ogni pulsante manda un impulso (che vale **sì**): ogni volta che uno viene premuto, il blocco manda **sì**.

```
[Pulsante: Stop 1] premuto ──▶ a  [OR] risultato ──▶ valore [Print (console.log)]
[Pulsante: Stop 2] premuto ──▶ b
[Pulsante: Stop 3] premuto ──▶ c
```

> Per far passare semplicemente ogni impulso, senza calcolare niente, è più adatto [Merge (unisci flussi)](core.merge).

### 3. Numeri e testi

**a** = `0`, **b** = `""` → **no**. **a** = `0`, **b** = `"ok"` → **sì**. **a** = `null` → **no**.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [AND](core.and), [XOR](core.xor), [NOT](core.not)
- [Confronto (== ≠ < >)](core.compare)
- [Come funziona un blocco](ide/blocks)
