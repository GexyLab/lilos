# Limita

`core.clamp` · Matematica · [Blocchi di base](logicstudio-core) · versione 1

Tiene un numero tra un minimo e un massimo: se è più piccolo del minimo manda il minimo, se è più grande del massimo manda il massimo, altrimenti lo manda com'è.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il numero da limitare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il numero, portato dentro i limiti. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Minimo** (`min`) | un numero | 0 | Il valore più piccolo che può uscire. |
| **Massimo** (`max`) | un numero | 100 | Il valore più grande che può uscire. |

## Come funziona

A ogni valore che arriva, il blocco lo converte in numero e lo porta dentro i limiti:

| Valore (Minimo 0, Massimo 100) | risultato |
|---|---|
| 50 | 50 |
| 150 | 100 |
| −5 | 0 |
| `"7,5"` | 7,5 |
| `""` o `null` | 0 (valgono 0) |
| `"ciao"` | `NaN`, senza errore |

Cose da sapere:

- La conversione segue le regole della [Somma](core.add): `"2,5"` vale 2,5; `true` vale 1 e `false` 0; un testo vuoto e `null` valgono 0.
- Un valore che non si può convertire non dà errore: esce `NaN` («non è un numero»), non limitato.
- Se il **Minimo** è più grande del **Massimo**, esce **sempre il Massimo**, qualunque valore arrivi (con Minimo 80 e Massimo 20, esce sempre 20).
- Se lasci **vuoto** il Minimo o il Massimo, quel limite vale **0**: con Minimo 0 e Massimo vuoto, ogni numero positivo diventa 0.
- I limiti sono fissi: si cambiano solo nelle impostazioni, non con un collegamento.

## Esempi

### 1. Una percentuale tra 0 e 100

```
[Dividi] risultato ──▶ a [Moltiplica: × 100] risultato ──▶ valore [Limita: 0–100] risultato ──▶ valore [Barra di avanzamento]
```

Se il calcolo dà 104 (per esempio perché sono stati fatti più passi del previsto), la [Barra di avanzamento](ui.progress) riceve 100; se dà −3, riceve 0.

### 2. Una temperatura impostata dall'utente

Minimo 16, Massimo 28. L'utente scrive 35 → esce 28; scrive 10 → esce 16; scrive `"21,5"` → esce 21,5.

### 3. Solo un limite

Per avere solo un massimo (per esempio 1000), metti come Minimo un numero molto piccolo, per esempio −1000000000: 1500 → 1000; −20 → −20.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Minimo · Massimo · Media](core.stat) per il più piccolo o il più grande di più numeri
- [Calcola](core.math) per arrotondare
- [Confronta](core.compare) per sapere se un numero è fuori dai limiti
- [Come funziona un blocco](ide/blocks)
