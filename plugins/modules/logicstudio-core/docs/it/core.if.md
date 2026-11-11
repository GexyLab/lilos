# If · Else

`core.if` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Manda un valore su **allora** se la condizione è sì, su **altrimenti** se è no. È il bivio di uno schema.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **condizione** (`condition`) | sì/no | Quale strada prendere. |
| **valore** (`value`) | qualsiasi | Il valore da mandare lungo la strada scelta. Facoltativo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **allora** (`then`) | qualsiasi | Il valore, quando la condizione è sì. |
| **altrimenti** (`else`) | qualsiasi | Il valore, quando la condizione è no. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Come funziona

Ogni volta che arriva qualcosa su **condizione** o su **valore**, il blocco guarda l'ultima condizione e manda l'ultimo valore su **una sola** delle due uscite:

- condizione **sì** → **allora**;
- condizione **no** → **altrimenti**.

Cosa manda:

- l'ultimo valore arrivato su **valore**;
- se su **valore** non è mai arrivato niente, o l'ultimo valore è `null`, manda un **impulso** (cioè `true`). Così puoi usare il blocco If · Else anche senza valore, solo per far partire una cosa o l'altra.

La condizione viene letta come sì/no: un testo è **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` o `off` (ogni altro testo è **sì**, anche `"falso"`); un numero è **no** se è 0; `null` è **no**; oggetti e liste sono **sì**. Se la condizione non è ancora arrivata, vale **no**.

### Chi fa partire il blocco

Di serie tutti e due gli ingressi lo avviano, quindi:

- quando arriva un nuovo **valore**, lo manda secondo l'ultima condizione;
- quando arriva una nuova **condizione**, **rimanda l'ultimo valore** secondo la nuova condizione.

Se vuoi che la condizione serva solo a scegliere la strada (e non rimandi il valore), togli «lo avvia» da **condizione** nelle **Proprietà**. Se invece vuoi che parta solo quando cambia la condizione, toglilo da **valore**. Vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Due messaggi diversi

```
[Confronto (== ≠ < >): a ≥ b] risultato ──▶ condizione [If · Else] allora     ──▶ invia [Costante · Variabile: "maggiorenne"] valore ──▶ valore [Print (console.log)]
                                                 altrimenti ──▶ invia [Costante · Variabile: "minorenne"]   valore ──▶ valore [Print (console.log)]
```

Qui il blocco If · Else non ha **valore**: a ogni confronto manda un impulso su **allora** o su **altrimenti**, e l'impulso fa partire il blocco [Costante · Variabile](core.value) giusto: ha l'ingresso **invia** collegato (lo mostri con l'occhio accanto alla porta), quindi manda il suo valore solo a ogni impulso. Con età 20 la console scrive `maggiorenne`, con 15 `minorenne`. (Lo stesso si ottiene con le uscite **se vero** e **se falso** del blocco [Confronto (== ≠ < >)](core.compare).)

> Se colleghi l'impulso direttamente a [Print (console.log)](core.consoleWrite), la console scrive `true`: un impulso è il valore sì.

### 2. Un filtro: far passare solo i valori validi

Togli «lo avvia» da **condizione**:

```
[Interruttore: registra] valore ──▶ condizione [If · Else] allora ──▶ valore [Print (console.log)]
[Cursore: livello]       valore ──▶ valore
```

Ogni movimento del cursore arriva su **valore**. Se l'[Interruttore](ui.toggle) è acceso, il valore va in console; se è spento, va su **altrimenti**, che non è collegata, e si perde. Accendere o spegnere l'interruttore non rimanda niente.

Senza togliere «lo avvia», accendere l'interruttore manderebbe subito in console l'ultimo valore del cursore.

### 3. Un valore che arriva prima della condizione

Il primo valore arriva (per esempio 42) e la condizione non è ancora arrivata: vale **no**, e 42 va su **altrimenti**. Se vuoi che all'inizio la strada sia **allora**, dai a **condizione** il valore iniziale `true`.

### 4. Il caso del valore null

Se su **valore** arriva `null` (per esempio da un blocco [Memoria (set · get)](core.store) vuoto), il blocco If · Else non manda `null` ma un impulso, cioè `true`. Chi riceve vede quindi **sì** al posto di un valore vuoto: tienine conto se i valori che passano possono essere vuoti.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Confronto (== ≠ < >)](core.compare) per ottenere la condizione
- [Switch · Case](core.switch) per più di due strade, secondo il valore
- [Instrada per indice (DEMUX)](core.route) per mandare un valore su una di molte uscite
- [NOT](core.not), [AND](core.and), [OR](core.or)
- [Come funziona un blocco](ide/blocks)
