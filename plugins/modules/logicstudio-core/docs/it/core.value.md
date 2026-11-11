# Valore

`core.value` · Valori · [Blocchi di base](logicstudio-core) · versione 1

Manda un valore fisso, scritto nelle sue impostazioni: un numero, un testo, un sì/no o un valore JSON (oggetto, lista…). Lo manda all'avvio del programma e ogni volta che riceve qualcosa su **invia**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Qualsiasi valore che arriva qui fa mandare di nuovo il valore. Quello che arriva non conta: anche `false` o `0` fanno partire l'invio. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore scritto nelle impostazioni, convertito nel **Tipo** scelto. |
| **Eccezione** (`error`) | oggetto | Quando il tipo è **JSON** e il testo non è JSON valido. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tipo** (`kind`) | numero, testo, sì/no, JSON | numero | Come leggere il testo di **Valore** (vedi sotto). |
| **Valore** (`value`) | un testo (fino a 2000 caratteri) | `0` | Il valore da mandare, scritto come testo. |
| **Invia all'avvio** (`atStart`) | sì / no | sì | Se è spuntata, il blocco manda il valore appena il programma parte. |

## Come funziona

Il testo che scrivi in **Valore** viene letto secondo il **Tipo**:

| Tipo | Come viene letto | Esempi |
|---|---|---|
| **numero** | Gli spazi ai lati non contano e la prima virgola vale come punto decimale. | `42` → 42; `3,5` → 3,5; `1e3` → 1000; `0x10` → 16; vuoto → 0 |
| **testo** | Così com'è, spazi compresi. | `42` → il testo «42», non il numero |
| **sì/no** | È **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` oppure `off`. Qualsiasi altro testo è **sì**. | `no` → no; `OFF` → no; `sì` → sì; `falso` → **sì** |
| **JSON** | Il testo è letto come JSON. Vuoto vale `null`. | `{"nome":"Ada"}` → un oggetto; `[1,2,3]` → una lista; `"ciao"` → il testo ciao; `null` → null |

Attenzione ai casi limite:

- Con il tipo **numero**, un testo che non è un numero (per esempio `abc`, oppure `1.234,5` con due separatori) **non** dà errore: il blocco manda il valore speciale `NaN` («non è un numero»), che i blocchi di calcolo dopo di lui trattano come un numero sbagliato. Se vuoi un errore, usa il tipo **testo** e poi [Converti](core.convert).
- Con il tipo **sì/no**, la parola italiana `falso` vale **sì**: per il no scrivi `no`, `0`, `false` oppure `off`.
- Con il tipo **JSON** puoi mandare `null`: arriva ai blocchi collegati come valore vuoto.

Quando manda il valore:

- **All'avvio**, se **Invia all'avvio** è spuntata. Succede prima che gli ingressi dei blocchi ricevano i loro valori iniziali.
- **Ogni volta che arriva qualcosa su invia**, sempre (anche se **Invia all'avvio** è tolta).

Se il testo JSON non è valido, il blocco non manda niente su **valore** e manda su **Eccezione** il messaggio del lettore JSON (vedi **Errori**). Succede sia all'avvio sia a ogni **invia**.

Il valore non cambia mentre il programma gira: per un valore che cambia usa [Memoria](core.store). Per le regole generali (ingressi, «lo avvia», Eccezione) vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un numero fisso da sommare

```
[Valore: 2] valore ──▶ a  [Somma] risultato ──▶ valore [Scrivi in console]
[Valore: 3] valore ──▶ b
```

Tipo **numero**, **Invia all'avvio** spuntata. All'avvio la console mostra `2` e poi `5` (la [Somma](core.add) gira a ogni valore che arriva).

### 2. Un testo mandato quando premi un pulsante

```
[Pulsante: Saluta] premuto ──▶ invia [Valore] valore ──▶ valore [Scrivi in console]
```

Tipo **testo**, Valore `Ciao a tutti!`, **Invia all'avvio** tolta. A ogni clic sul [Pulsante](ui.button) la console scrive `Ciao a tutti!`; all'avvio non scrive niente.

### 3. Un oggetto di impostazioni

Tipo **JSON**, Valore:

```
{"soglia": 30, "unità": "°C", "allarme": true}
```

All'avvio il blocco manda l'oggetto. Con un blocco [Prendi campo](core.get) con Campo `soglia` ottieni il numero 30.

Se scrivi per sbaglio `{soglia: 30}` (senza virgolette intorno al nome), il valore non parte e l'Eccezione riceve un messaggio del tipo `Expected property name or '}' in JSON at position 1 (line 1 column 2)`.

### 4. Un interruttore di prova

Tipo **sì/no**, Valore `off`: manda **no**. Cambiando il Valore in `on` (o `1`, `sì`, `vero`…) manda **sì**.

## Errori

| Messaggio | Quando |
|---|---|
| Il messaggio del lettore JSON, in inglese: per esempio `Unexpected token 'a', "abc" is not valid JSON` | Tipo **JSON** e testo che non è JSON valido. |

## Vedi anche

- [Memoria](core.store) per un valore che cambia mentre il programma gira
- [Converti](core.convert) per cambiare il tipo di un valore che arriva
- [All'avvio](core.onStart) per un semplice impulso alla partenza
- [Come funziona un blocco](ide/blocks)
