# Al cambio (fronte ↑↓)

`core.edge` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Guarda un sì/no che arriva più volte e manda un impulso solo quando **cambia**: su **diventa vero** quando passa da no a sì, su **diventa falso** quando passa da sì a no.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | sì/no | Il sì/no da sorvegliare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **diventa vero** (`rise`) | impulso | Un impulso quando il valore passa da no a sì. |
| **diventa falso** (`fall`) | impulso | Un impulso quando il valore passa da sì a no. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Come funziona

Il blocco ricorda l'ultimo valore ricevuto (letto come sì/no). A ogni nuovo valore:

- se è uguale al precedente, non manda niente;
- se è passato da no a sì, manda un impulso su **diventa vero**;
- se è passato da sì a no, manda un impulso su **diventa falso**.

Cose da sapere:

- Il **primo** valore che arriva non manda niente: il blocco non sa ancora com'era prima. Se vuoi che un primo sì conti come un cambiamento, dai all'ingresso il valore iniziale `false` nelle **Proprietà**.
- I valori vengono letti come sì/no: un testo è **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` o `off` (ogni altro testo è **sì**, anche `"falso"`); un numero è **no** se è 0; `null` è **no**; oggetti e liste sono **sì**. Quindi `true`, `1` e `"sì"` sono lo stesso valore: passare da `true` a `"sì"` non è un cambiamento.
- Il ricordo dell'ultimo valore riparte da zero a ogni avvio del programma.

## Esempi

### 1. Una notifica quando la temperatura supera la soglia

```
[Confronto (== ≠ < >): temperatura > 30] risultato ──▶ valore [Al cambio (fronte ↑↓)] diventa vero  ──▶ invia [Notify: Troppo caldo]
                                                            diventa falso ──▶ invia [Notify: Tutto a posto]
```

Il blocco [Confronto (== ≠ < >)](core.compare) manda sì o no a ogni misura, magari ogni secondo. Senza il blocco Al cambio riceveresti una notifica a ogni misura sopra i 30 gradi; con il blocco Al cambio, una sola quando la temperatura supera i 30 e una quando torna sotto.

### 2. Una sequenza di valori

Arrivano, in ordine: `false`, `false`, `true`, `"sì"`, `"no"`, `0`, `1`.

| Arriva | Letto come | Prima | Manda |
|---|---|---|---|
| `false` | no | (niente) | niente: è il primo |
| `false` | no | no | niente |
| `true` | sì | no | **diventa vero** |
| `"sì"` | sì | sì | niente |
| `"no"` | no | sì | **diventa falso** |
| `0` | no | no | niente |
| `1` | sì | no | **diventa vero** |

### 3. Contare quante volte si accende

```
[Interruttore: pompa] valore ──▶ valore [Al cambio (fronte ↑↓)] diventa vero ──▶ più [Contatore (++ −−)] conteggio ──▶ valore [Valore: accensioni]
```

Il blocco [Contatore (++ −−)](core.counter) sale di 1 ogni volta che la pompa si accende, non ogni volta che l'interruttore manda il suo stato.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Confronto (== ≠ < >)](core.compare) per ottenere il sì/no da sorvegliare
- [Contatore (++ −−)](core.counter) per contare i cambiamenti
- [Debounce](core.debounce) per ignorare i cambiamenti troppo rapidi
- [Come funziona un blocco](ide/blocks)
