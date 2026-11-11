# Accumula (push con limite)

`coll.accumulate` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Raccoglie in una lista i valori che arrivano uno alla volta, e la manda aggiornata a ogni valore. Quando la lista è piena, toglie i più vecchi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **aggiungi** (`add`) | qualsiasi | Ogni valore che arriva qui va in fondo alla lista. |
| **svuota** (`clear`) | impulso | Svuota la lista. Qualsiasi valore arrivi qui vale come impulso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista raccolta finora, dal più vecchio al più recente. |
| **quanti** (`count`) | numero | Quanti elementi ha la lista. |
| **Eccezione** (`error`) | oggetto | Non usata da questo blocco in condizioni normali. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Lunghezza massima (via i più vecchi)** (`max`) | da 1 a 100000 | 100 | Quanti valori tenere al massimo. Quando ne arriva uno in più, il più vecchio esce. |

## Come funziona

Il blocco ha una **memoria**: la lista raccolta resta da un valore all'altro.

- Un valore su **aggiungi** va in fondo alla lista; se la lista supera la **Lunghezza massima**, gli elementi più vecchi (all'inizio) vengono tolti. Poi il blocco manda **lista** e **quanti**.
- Un impulso su **svuota** cancella tutto e manda la lista vuota `[]` e **quanti** = 0.
- Viene aggiunto **qualsiasi** valore, anche `null` o una lista (che diventa un elemento solo, non viene «aperta»).
- La lista parte vuota **ogni volta che il programma parte** (Prova o Attiva): non viene salvata.
- Se la **Lunghezza massima** si abbassa mentre il programma gira, la lista si accorcia al valore successivo.

Valori particolari della **Lunghezza massima**: un numero con la virgola si tronca (1,7 vale 1); un valore sopra 100000 vale 100000; un valore negativo vale 1; **0 o una casella vuota valgono 100** (il predefinito), non 1.

Se togli «lo avvia» da **aggiungi** o da **svuota**, i valori che arrivano lì vengono ignorati del tutto: il blocco lavora solo quando gira, quindi non aggiunge e non svuota.

## Esempi

### 1. Le ultime 3 letture

Con **Lunghezza massima** 3, mandando su **aggiungi** 1, 2, 3, 4:

| Arriva | lista | quanti |
|---|---|---|
| 1 | `[1]` | 1 |
| 2 | `[1, 2]` | 2 |
| 3 | `[1, 2, 3]` | 3 |
| 4 | `[2, 3, 4]` | 3 |
| impulso su **svuota** | `[]` | 0 |
| 9 | `[9]` | 1 |

### 2. Un grafico che scorre

```
[Intervallo (setInterval): 1 secondo] impulso ──▶ leggi [Memoria (set · get)] valore ──▶ aggiungi [Accumula (push con limite): massimo 60] lista ──▶ dati [Linee]
[Campo numerico: temperatura] valore ──▶ imposta [Memoria (set · get)]
[Pulsante: Ricomincia] premuto ──▶ svuota [Accumula (push con limite)]
```

Ogni secondo l'ultima temperatura entra nella lista (finché il campo non ha un valore, il blocco [Memoria (set · get)](core.store) manda `null`, che entra anche lui) e il grafico [Linee](charts.line) mostra l'ultimo minuto. Il [Pulsante](ui.button) ricomincia da zero.

### 3. Raccogliere gli elementi di un giro, ripartendo da zero

```
[Pulsante: Conta] premuto ──▶ svuota [Accumula (push con limite)]
                  premuto ──▶ avvia  [For each] elemento ──▶ aggiungi [Accumula (push con limite): massimo 1000] quanti ──▶ valore [Valore mostrato]
```

(Il Pulsante è collegato a due ingressi.) A ogni clic il blocco Accumula (push con limite) si svuota e poi riceve gli elementi del giro di [For each](coll.forEach): lo svuotamento arriva sempre prima, perché il Pulsante lo manda subito, mentre gli elementi partono solo quando For each gira. Il Valore mostrato passa a 0, poi conta 1, 2, 3… fino alla lunghezza della lista. Non collegare **fatto** a **svuota**: la lista si svuoterebbe appena raccolta.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Push · Unshift](coll.add) se la lista ce l'hai già
- [Slice](coll.slice), [Sum · Min · Max · Avg](coll.stat), [Leggi lista[i]](coll.get) (indice -1 per l'ultimo)
- [Memoria (set · get)](core.store) per tenere un valore solo
- [Come funziona un blocco](ide/blocks)
