# NOT

`core.not` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Rovescia un sì/no: manda **no** quando riceve sì, e **sì** quando riceve no.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | sì/no | Il valore da rovesciare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | sì/no | Il contrario del valore. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Come funziona

A ogni valore che arriva, il blocco lo legge come sì/no e manda il contrario.

| Valore che arriva | Letto come | risultato |
|---|---|---|
| `true` (sì), un impulso | sì | no |
| `false` (no) | no | sì |
| `0` | no | sì |
| `5`, `-1` | sì | no |
| `""`, `"0"`, `"false"`, `"no"`, `"off"`, `" OFF "` | no | sì |
| `"sì"`, `"on"`, `"ciao"`, `"0.0"`, `"falso"` | sì | no |
| `null` | no | sì |
| `[]`, `{}` (anche vuoti) | sì | no |

Per i testi: tolti gli spazi ai lati e senza badare alle maiuscole, solo vuoto, `0`, `false`, `no` e `off` sono **no**. La parola italiana `falso` è **sì**.

## Esempi

### 1. Un pulsante abilitato solo quando il programma è fermo

```
[Interruttore: in funzione] valore ──▶ valore [NOT] risultato ──▶ abilitato [Pulsante: Configura]
```

Quando l'[Interruttore](ui.toggle) è acceso, il [Pulsante](ui.button) **Configura** è disabilitato; quando è spento, si può premere.

### 2. «Se non…»

```
[Confronto (== ≠ < >): livello > 10] risultato ──▶ valore [NOT] risultato ──▶ condizione [If · Else]
```

Il blocco [If · Else](core.if) prende la strada **allora** quando il livello **non** è sopra 10. (Lo stesso risultato si ottiene scegliendo `a ≤ b` nel blocco [Confronto (== ≠ < >)](core.compare).)

### 3. Un testo

Arriva `"no"` → manda **sì**. Arriva `"No grazie"` → manda **no** (è un testo diverso da `no`, quindi vale sì).

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [AND](core.and), [OR](core.or), [XOR](core.xor)
- [Cast in sì/no (Boolean())](core.toBool) per trasformare un valore in sì/no senza rovesciarlo
- [Come funziona un blocco](ide/blocks)
