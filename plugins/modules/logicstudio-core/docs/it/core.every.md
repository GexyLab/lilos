# Intervallo (setInterval)

`core.every` · Tempo · [Blocchi di base](logicstudio-core) · versione 1

Manda un impulso a intervalli regolari, per esempio ogni 30 secondi. Si accende e si spegne con l'ingresso **acceso**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **acceso** (`on`) | sì/no | **sì** accende gli impulsi, **no** li ferma. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **impulso** (`tick`) | impulso | Un impulso (il valore sì) a ogni intervallo. |
| **Eccezione** (`error`) | oggetto | In pratica non succede. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Ogni (secondi)** (`seconds`) | da 0,05 a 86400 (24 ore), anche con i decimali | 30 | Quanto tempo passa tra un impulso e il successivo. |
| **Parte da solo** (`atStart`) | sì / no | sì | Se è spuntata, gli impulsi cominciano appena il programma parte. Se è tolta, il blocco aspetta un **sì** su **acceso**. |

## Come funziona

### Quando parte e quando si ferma

- Con **Parte da solo** spuntata, gli impulsi cominciano alla partenza del programma. Il **primo impulso arriva dopo un intervallo intero**, non subito: con 30 secondi, il primo esce 30 secondi dopo la partenza. Se ti serve anche un impulso subito, collega allo stesso blocco anche un blocco [All'avvio (main)](core.onStart).
- Un **sì** su **acceso** accende gli impulsi. Se erano già accesi **non cambia niente**: il ritmo non ricomincia da capo.
- Un **no** su **acceso** li ferma. Un **sì** dopo li riaccende, e il primo impulso arriva di nuovo dopo un intervallo intero.
- Quando il programma si ferma, gli impulsi si fermano.

Cosa vale come **no** su **acceso**: `false`, il numero 0, `null` e i testi vuoto, `0`, `false`, `no`, `off` (senza badare a maiuscole e spazi ai lati). **Tutto il resto vale sì**, anche un impulso e anche il testo `falso`. Per questo puoi collegare ad **acceso** l'uscita di un [Pulsante](ui.button) (premuto = sì) per accendere, e un [Interruttore](ui.toggle) per accendere e spegnere.

Se togli **lo avvia** dall'ingresso **acceso**, quello che arriva lì non ha più nessun effetto.

Il **valore iniziale** di **acceso** arriva subito dopo la partenza: con **Parte da solo** spuntata e valore iniziale `false`, gli impulsi partono e si fermano subito, cioè non partono.

### Il ritmo

- L'intervallo si conta **da quando gli impulsi sono partiti**, non dall'orologio: con 60 secondi gli impulsi non arrivano «al minuto spaccato», ma 60 secondi uno dall'altro a partire dall'accensione.
- L'intervallo più breve è **50 millisecondi** (0,05 secondi): un valore più piccolo viene portato a 0,05. Attenzione: se il campo **Ogni (secondi)** resta **vuoto**, vale 0 e quindi 0,05 secondi, cioè 20 impulsi al secondo.
- Il ritmo non è precisissimo: se il computer è molto occupato un impulso può arrivare un po' in ritardo.
- Ogni impulso fa lavorare i blocchi collegati. Un programma che fa più di 10000 esecuzioni di blocchi in 10 secondi (di serie) viene fermato: con intervalli molto brevi e molti blocchi collegati ci arrivi in fretta. Vedi [Limiti](logicstudio-engine/limits).

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un orologio in console

```
[Intervallo (setInterval): 1 s] impulso ──▶ leggi [Now (data e ora)] ISO ──▶ valore [Print (console.log)]
```

Dal secondo 1 in poi la console scrive una riga al secondo, per esempio `2026-11-11T14:05:01.003Z`.

### 2. Un controllo che si accende e si spegne da una finestra

```
[Interruttore: controllo] valore ──▶ acceso [Intervallo (setInterval): 10 s] impulso ──▶ controlla [exists: ~/Documenti/ordine.txt] …
```

**Parte da solo** tolta. Finché l'[Interruttore](ui.toggle) della finestra è acceso, ogni 10 secondi il programma controlla se il file c'è; spegnendolo, i controlli si fermano.

### 3. Un conto alla rovescia

```
[Intervallo (setInterval): 1 s] impulso ──▶ meno [Contatore (++ −−): Parte da 10] conteggio ──▶ a [Confronto (== ≠ < >): a ≤ b, b = 0] se vero ──▶ invia [Costante · Variabile: sì/no "no"] valore ──▶ acceso [Intervallo (setInterval): 1 s]
                                                       conteggio ──▶ valore [Print (console.log)]
```

Nel blocco [Confronto (== ≠ < >)](core.compare) l'ingresso **b** ha il valore iniziale 0 e **lo avvia tolto**: altrimenti all'avvio il Confronto girerebbe con **a** ancora vuoto (che vale 0), troverebbe 0 ≤ 0 e spegnerebbe tutto prima del primo impulso.

Il collegamento torna indietro al primo blocco: è un ciclo, ma va bene perché passa da un blocco [Intervallo (setInterval)](core.every) che rallenta. La console scrive 9, 8, … 0, poi gli impulsi si fermano.

Il blocco [Costante · Variabile](core.value) ha l'ingresso **invia** collegato (lo mostri con l'occhio accanto alla porta, nelle **Proprietà**): per questo manda il suo «no» solo quando arriva l'impulso, e non all'avvio.

### 4. Un impulso subito e poi ogni minuto

```
[All'avvio (main)]   impulso ──▶ leggi [Now (data e ora)] …
[Intervallo (setInterval): 60 s]  impulso ──▶ leggi
```

## Vedi anche

- [All'avvio (main)](core.onStart)
- [Ritardo (setTimeout)](core.delay), [Debounce](core.debounce), [Throttle](core.throttle)
- [Now (data e ora)](core.now)
- [Contatore (++ −−)](core.counter)
- [Come funziona un blocco](ide/blocks)
