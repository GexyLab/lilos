# Confronto (== ≠ < >)

`core.compare` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Confronta due valori (uguale, diverso, maggiore, minore…) e dice se il confronto è vero: con un sì/no e con un impulso su **se vero** o su **se falso**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | qualsiasi | Il primo valore. |
| **b** | qualsiasi | Il secondo valore. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | sì/no | **sì** se il confronto è vero, **no** se è falso. |
| **se vero** (`true`) | impulso | Un impulso quando il confronto è vero. |
| **se falso** (`false`) | impulso | Un impulso quando il confronto è falso. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | `a = b`, `a ≠ b`, `a > b`, `a ≥ b`, `a < b`, `a ≤ b` | `a > b` | Il confronto da fare. |

Nota: l'operazione predefinita è **a > b**, non «uguale».

## Come funziona

Ogni volta che arriva un valore su **a** o su **b**, il blocco confronta l'ultimo valore di **a** con l'ultimo di **b** e manda, in quest'ordine:

1. il risultato su **risultato** (sì o no);
2. un impulso su **se vero** oppure su **se falso** (mai su tutti e due).

Li manda a ogni confronto, anche se il risultato non è cambiato.

### Confronto tra numeri o tra testi

Il modo di confrontare dipende da cosa arriva:

- **Se almeno uno dei due è un numero** (un vero numero, non un testo con delle cifre), tutti e due vengono letti come numeri e confrontati come numeri. Le regole di lettura sono quelle di [Somma (+)](core.add): `"2,5"` vale 2,5, `true` vale 1, `null` e `""` valgono 0.
- **Altrimenti** tutti e due vengono letti come testi e confrontati come testi.

Confrontare come testi vuol dire **lettera per lettera**, come nel dizionario ma con regole da computer:

- `"10"` è **minore** di `"9"` (si confronta prima `1` con `9`). Se i tuoi numeri arrivano come testo (per esempio da un [Campo di testo](ui.text)), passa prima da [Cast in numero (Number())](core.toNumber).
- Le maiuscole contano e vengono prima delle minuscole: `"Z"` < `"a"`; `"Roma"` ≠ `"roma"`.
- Le lettere accentate vengono dopo tutte le lettere senza accento: `"è"` > `"z"`.
- Gli spazi contano: `"ciao "` ≠ `"ciao"`.
- `null` vale il testo vuoto `""`; sì/no valgono `"true"`/`"false"`; oggetti e liste vengono scritti in JSON (quindi due oggetti sono uguali se hanno gli stessi campi **nello stesso ordine**).

### Casi limite

| a | b | Come vengono confrontati | a = b |
|---|---|---|---|
| 10 | `"9"` | numeri: 10 e 9 | no |
| `"10"` | `"9"` | testi | no (e `a < b` è **sì**) |
| 5 | `"abc"` | numeri: `"abc"` non è un numero | no (con un valore che non è un numero, ogni confronto è **no**, tranne `a ≠ b` che è **sì**) |
| `null` | 0 | numeri: `null` vale 0 | sì |
| `true` | 1 | numeri: `true` vale 1 | sì |
| `true` | `"true"` | testi | sì |
| `{"x":1}` | `{"x":1}` | testi JSON | sì |
| 3 | (mai arrivato) | numeri: il valore mancante vale 0 | no (e `a > b` è **sì**) |
| `"ciao"` | (mai arrivato) | testi: il valore mancante vale `""` | no |

Un ingresso che non ha ancora ricevuto niente **conta**: vale 0 se l'altro è un numero, testo vuoto altrimenti. Per evitare confronti a metà, dai a **b** un valore iniziale, oppure togli «lo avvia» dall'ingresso che non deve far partire il confronto. Vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Una soglia fissa

Operazione `a > b`; su **b** il valore iniziale `30` e «lo avvia» tolto:

```
[Cursore: temperatura] valore ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ accesa [Spia: caldo]
```

Con il cursore a 25 la [Spia](ui.lamp) è spenta (**no**); a 31 si accende (**sì**). A ogni movimento parte anche un impulso su **se vero** o **se falso**.

### 2. Fare una cosa diversa nei due casi

```
[Campo numerico: età] valore ──▶ a [Confronto (== ≠ < >): a ≥ b] se vero  ──▶ invia [Costante · Variabile: "Benvenuto"]
                                                       se falso ──▶ invia [Costante · Variabile: "Accesso negato"]
```

Con **b** iniziale `18`: se l'utente scrive 20, parte **se vero** e il primo [Costante · Variabile](core.value) manda `Benvenuto`; se scrive 15, parte **se falso**.

### 3. Una parola uguale

Operazione `a = b`, **b** iniziale `"stop"` (scritto `stop` nel campo **iniziale**):

- arriva `"stop"` → **sì**;
- arriva `"Stop"` → **no** (le maiuscole contano). Per non badare alle maiuscole, passa prima da [Funzioni stringa](core.text) con **minuscolo**.

### 4. Il trucco dei numeri come testo

**a** = `"100"` e **b** = `"20"` arrivano tutti e due come testo da due campi di testo. Con `a > b` il risultato è **no** (`"1"` viene prima di `"2"`). Mettendo un blocco [Cast in numero (Number())](core.toNumber) su ciascuno, il risultato diventa **sì**.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [If · Else](core.if) per mandare un valore da una parte o dall'altra
- [Switch · Case](core.switch) per confrontare un valore con molti casi
- [Clamp (limita)](core.clamp) per tenere un numero tra un minimo e un massimo
- [AND](core.and), [OR](core.or), [NOT](core.not)
- [Come funziona un blocco](ide/blocks)
