# Sequenza (then)

`core.sequence` · Logica · [Blocchi di base](logicstudio-core) · versione 1

A ogni impulso su **avvia** manda un impulso su ognuna delle sue uscite, una dopo l'altra, dall'alto verso il basso.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **avvia** (`start`) | impulso | Qualsiasi valore che arriva qui fa partire la sequenza. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| (le uscite aggiunte) | impulso | Un impulso ciascuna, nell'ordine. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Porte aggiuntive

Il blocco nasce senza uscite: aggiungile nelle **Proprietà**, sezione **Porte**, con **Aggiungi uscita**. Puoi averne fino a 16 (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo impulso, chiamate **1**, **2**, **3**… Si vedono in corsivo sul blocco. Puoi spostarle su e giù: l'ordine degli impulsi è quello dall'alto, non quello dei nomi. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva qualcosa su **avvia** (qualsiasi valore, anche `false`), il blocco manda un impulso sulla prima uscita aggiunta, poi sulla seconda, e così via fino all'ultima.

Cosa vuol dire «una dopo l'altra»:

- Gli impulsi **partono** nell'ordine, subito uno dopo l'altro: il blocco collegato alla **1** riceve il suo impulso prima di quello collegato alla **2**.
- Il blocco Sequenza (then) **non aspetta** che quello che hai collegato alla **1** abbia finito: se la **1** fa partire un lavoro lungo (una richiesta web, un'attesa, una domanda in console), la **2** parte lo stesso subito dopo. I blocchi lavorano in modo indipendente.
- Se ti serve che il passo 2 parta solo **dopo** la fine del passo 1, collega l'uscita di fine del passo 1 (per esempio **scritto** di [Print (console.log)](core.consoleWrite)) all'inizio del passo 2, invece di usare il blocco Sequenza (then).

Senza uscite aggiunte, il blocco non fa niente.

## Esempi

### 1. Preparare una finestra all'avvio

```
[All'avvio (main)] impulso ──▶ avvia [Sequenza (then)] 1 ──▶ invia [Costante · Variabile: 0]        valore ──▶ valore [Indicatore: livello]
                                          2 ──▶ invia [Costante · Variabile: "Pronto"] valore ──▶ testo [Etichetta: stato]
                                          3 ──▶ invia [Costante · Variabile: true]     valore ──▶ abilitato [Pulsante: Avvia]
```

All'avvio i tre blocchi [Costante · Variabile](core.value), che hanno **invia** collegato alla Sequenza (in Proprietà mostra **invia** con l'occhio), partono in quest'ordine: prima l'[Indicatore](ui.gauge) torna a 0, poi l'[Etichetta](ui.label) mostra `Pronto`, poi il [Pulsante](ui.button) diventa premibile.

### 2. Pulire la console e poi scrivere

```
[Pulsante: Nuovo giro] premuto ──▶ avvia [Sequenza (then)] 1 ──▶ pulisci [Print (console.log)]
                                                    2 ──▶ invia [Costante · Variabile: "--- nuovo giro ---"] valore ──▶ valore [Print (console.log)]
```

A ogni clic l'impulso **1** pulisce la console principale e l'impulso **2** ci scrive la riga d'inizio. Pulire è un'operazione rapida, quindi la riga arriva dopo la pulizia; con un passo 1 lento (una richiesta web, un'attesa) l'ordine dei risultati non sarebbe garantito.

### 3. Cambiare l'ordine

Con le uscite **1**, **2**, **3**, sposta la **3** in cima nelle Proprietà: l'ordine degli impulsi diventa **3**, **1**, **2**.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Attendi tutti (join)](core.join) per partire quando più cose sono finite
- [All'avvio (main)](core.onStart) e [Intervallo (setInterval)](core.every) per far partire una sequenza
- [Ritardo (setTimeout)](core.delay) per mettere una pausa tra due passi
- [Come funziona un blocco](ide/blocks)
