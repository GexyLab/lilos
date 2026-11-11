# XOR

`core.xor` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Manda **sì** se gli ingressi che valgono **sì** sono in numero dispari: con due ingressi, se uno solo dei due è sì.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | sì/no | La prima condizione. |
| **b** | sì/no | La seconda condizione. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | sì/no | **sì** se il numero di ingressi a sì è dispari, altrimenti **no**. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo sì/no, chiamati con le lettere che seguono: **c**, **d**, **e**… fino a **r**. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva un valore su un ingresso, il blocco conta quanti ingressi valgono **sì** (con l'ultimo valore di ognuno) e manda **sì** se sono 1, 3, 5…, **no** se sono 0, 2, 4…

- Con **due** ingressi è il classico «o l'uno o l'altro, non tutti e due».
- Con **tre o più** ingressi **non** vuol dire «uno solo»: con **a**, **b** e **c** tutti a sì il risultato è **sì** (sono 3, dispari). Per sapere se ce n'è esattamente uno, contali con un blocco [Somma (+)](core.add) (sì vale 1, no vale 0) e controlla il totale con un blocco [Confronto (== ≠ < >)](core.compare) con operazione `a = b` e valore iniziale 1 su **b**.
- Gli ingressi che non hanno ancora ricevuto niente non contano.
- Ogni valore viene letto come sì/no: un testo è **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` o `off` (ogni altro testo è **sì**, anche `"falso"`); un numero è **no** se è 0; `null` è **no**; oggetti e liste sono **sì**.

| a | b | c | risultato |
|---|---|---|---|
| sì | no | — | sì |
| sì | sì | — | no |
| no | no | — | no |
| sì | sì | sì | sì |
| sì | sì | no | no |

## Esempi

### 1. Una luce con due interruttori (deviatore)

```
[Interruttore: in basso] valore ──▶ a  [XOR] risultato ──▶ accesa [Spia: luce]
[Interruttore: in alto]  valore ──▶ b
```

Come le luci delle scale: cambiare **uno qualsiasi** dei due interruttori cambia lo stato della luce. Entrambi spenti: luce spenta; uno acceso: luce accesa; entrambi accesi: luce spenta.

### 2. Due valori diversi

Con **a** = sì e **b** = no il risultato è **sì**: i due valori sono diversi. Con due sì/no, il blocco XOR vale **sì** proprio quando sono diversi.

### 3. Il controllo di parità

Con quattro ingressi (aggiungi **c** e **d**): sì, no, sì, sì → tre sì → **sì**; sì, sì, no, no → due sì → **no**.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [AND](core.and), [OR](core.or), [NOT](core.not)
- [Al cambio (fronte ↑↓)](core.edge) per sapere quando un sì/no cambia
- [Come funziona un blocco](ide/blocks)
