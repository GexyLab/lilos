# Costante · Variabile

`core.value` · Valori · [Blocchi di base](logicstudio-core) · versione 2

Dà un valore scritto nelle sue impostazioni: un numero, un testo, un sì/no o un valore JSON (oggetto, lista…). Di serie è una **costante**: il valore esce all'avvio dello schema e non cambia. Se colleghi qualcosa al suo ingresso **imposta** diventa una **variabile**: il valore che arriva prende il posto di quello attuale.

Fino alla versione 1 il blocco si chiamava **Valore** e aveva l'impostazione **Invia all'avvio**: ora lo decide il collegamento su **invia** (vedi sotto). Gli schemi salvati prima si aggiornano da soli.

## Ingressi

Tutti e due gli ingressi sono **nascosti di serie**: per collegarli, mostrali prima con l'**occhio** accanto alla porta nelle **Proprietà**.

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (non più all'avvio). Quello che arriva non conta: anche `false` o `0` fanno partire l'invio. Se non è collegato, il valore esce una volta all'avvio dello schema. |
| **imposta** (`set`) | qualsiasi | Se è collegato, il blocco è una variabile: il valore che arriva, convertito nel **Tipo** scelto, diventa il nuovo valore. Esce subito se **invia** non è collegato, altrimenti al prossimo impulso su **invia**. Se non è collegato, il blocco è una costante. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore attuale: quello delle impostazioni, o l'ultimo arrivato su **imposta**. |
| **Eccezione** (`error`) | oggetto | Quando il tipo è **JSON** e il testo non è JSON valido, o quando su **imposta** arriva un valore che non è un numero con il tipo **numero**. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tipo** (`kind`) | numero, testo, sì/no, JSON | numero | Come leggere il testo di **Valore** e come convertire quello che arriva su **imposta** (vedi sotto). |
| **Valore** (`value`) | un testo (fino a 2000 caratteri) | `0` | Il valore da mandare, scritto come testo. Per una variabile è il valore di partenza. |

## Come funziona

### Quando manda il valore

| invia | imposta | Cosa fa |
|---|---|---|
| non collegato | non collegato | **Costante**: manda il valore una volta, all'avvio dello schema. |
| collegato | non collegato | **Costante a comando**: manda il valore a ogni impulso su **invia**, mai all'avvio. |
| non collegato | collegato | **Variabile**: manda il valore di partenza all'avvio, poi ogni nuovo valore appena arriva su **imposta**. |
| collegato | collegato | **Variabile a comando**: **imposta** cambia il valore senza mandarlo; esce solo a ogni impulso su **invia** (il valore di quel momento). |

L'invio all'avvio succede prima che gli ingressi dei blocchi ricevano i loro valori iniziali. Un **valore iniziale** dato a **imposta** nelle Proprietà conta come un valore arrivato all'avvio, ma non lo rende una variabile: per esserlo, **imposta** deve essere collegato.

### Come legge il testo

Il testo che scrivi in **Valore** viene letto secondo il **Tipo**:

| Tipo | Come viene letto | Esempi |
|---|---|---|
| **numero** | Gli spazi ai lati non contano e la prima virgola vale come punto decimale. | `42` → 42; `3,5` → 3,5; `1e3` → 1000; `0x10` → 16; vuoto → 0 |
| **testo** | Così com'è, spazi compresi. | `42` → il testo «42», non il numero |
| **sì/no** | È **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` oppure `off`. Qualsiasi altro testo è **sì**. | `no` → no; `OFF` → no; `sì` → sì; `falso` → **sì** |
| **JSON** | Il testo è letto come JSON. Vuoto vale `null`. | `{"nome":"Ada"}` → un oggetto; `[1,2,3]` → una lista; `"ciao"` → il testo ciao; `null` → null |

Quello che arriva su **imposta** è convertito allo stesso modo: con il tipo **numero** il testo `"7"` diventa 7 e un testo che non è un numero va in **Eccezione** (il valore resta quello di prima); con **testo** un oggetto diventa il suo testo JSON; con **sì/no** valgono le regole della tabella; con **JSON** il valore passa così com'è.

Attenzione ai casi limite:

- Con il tipo **numero**, un testo **nelle impostazioni** che non è un numero (per esempio `abc`, oppure `1.234,5` con due separatori) **non** dà errore: il blocco manda il valore speciale `NaN` («non è un numero»), che i blocchi di calcolo dopo di lui trattano come un numero sbagliato.
- Con il tipo **sì/no**, la parola italiana `falso` vale **sì**: per il no scrivi `no`, `0`, `false` oppure `off`.
- Con il tipo **JSON** puoi mandare `null`: arriva ai blocchi collegati come valore vuoto.

Se il testo JSON non è valido, il blocco non manda niente su **valore** e manda su **Eccezione** il messaggio del lettore JSON (vedi **Errori**).

Per una variabile da leggere in un momento diverso da quando la scrivi puoi usare anche [Memoria (set · get)](core.store), che ha in più **svuota**. Per le regole generali (ingressi, «lo avvia», porte nascoste, Eccezione) vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Due costanti da sommare

```
[Costante · Variabile: 2] valore ──▶ a  [Somma (+)] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 3] valore ──▶ b
```

Tipo **numero**, niente collegato agli ingressi nascosti. All'avvio la console mostra `2` e poi `5` (la [Somma (+)](core.add) gira a ogni valore che arriva).

### 2. Un testo mandato quando premi un pulsante

```
[Pulsante: Saluta] premuto ──▶ invia [Costante · Variabile] valore ──▶ valore [Print (console.log)]
```

Tipo **testo**, Valore `Ciao a tutti!`. Mostra **invia** con il suo occhio e collegaci il [Pulsante](ui.button): a ogni clic la console scrive `Ciao a tutti!`; all'avvio non scrive niente, perché **invia** è collegato.

### 3. Una variabile: la soglia scelta dall'utente

```
[Cursore: Soglia] valore ──▶ imposta [Costante · Variabile: 30] valore ──▶ b [Confronto (== ≠ < >): a > b]
[Intervallo (setInterval): 5 s] impulso ──▶ … temperatura ──▶ a
```

Tipo **numero**, Valore `30`. All'avvio il confronto riceve 30; ogni volta che l'utente sposta il [Cursore](ui.slider) la soglia cambia e il nuovo valore arriva subito al confronto.

### 4. Una variabile letta a comando

```
[Campo di testo: Nome] testo   ──▶ imposta [Costante · Variabile] valore ──▶ valore [Print (console.log)]
[Pulsante: Stampa]     premuto ──▶ invia
```

Tipo **testo**, Valore vuoto, **invia** e **imposta** mostrati e collegati. Scrivere nel campo cambia solo il valore; la console scrive il nome solo quando premi **Stampa**.

### 5. Un oggetto di impostazioni

Tipo **JSON**, Valore:

```
{"soglia": 30, "unità": "°C", "allarme": true}
```

All'avvio il blocco manda l'oggetto. Con un blocco [Get proprietà (obj.campo)](core.get) con Campo `soglia` ottieni il numero 30.

Se scrivi per sbaglio `{soglia: 30}` (senza virgolette intorno al nome), il valore non parte e l'Eccezione riceve un messaggio del tipo `Expected property name or '}' in JSON at position 1 (line 1 column 2)`.

## Errori

| Messaggio | Quando |
|---|---|
| Il messaggio del lettore JSON, in inglese: per esempio `Unexpected token 'a', "abc" is not valid JSON` | Tipo **JSON** e testo delle impostazioni che non è JSON valido. |
| Non è un numero | Tipo **numero** e su **imposta** arriva un valore che non è un numero. Il valore resta quello di prima. |

## Vedi anche

- [Memoria (set · get)](core.store) per un valore da scrivere e leggere in momenti diversi, che si può anche svuotare
- [Cast (converti tipo)](core.convert) per cambiare il tipo di un valore che arriva
- [All'avvio (main)](core.onStart) per un semplice impulso alla partenza
- [Come funziona un blocco](ide/blocks)
