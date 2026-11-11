# Throttle

`core.throttle` · Tempo · [Blocchi di base](logicstudio-core) · versione 1

Lascia passare al massimo un valore ogni tanti secondi: il primo passa subito, quelli che arrivano troppo presto dopo di lui vengono scartati.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | I valori che arrivano. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | I valori lasciati passare, subito e senza cambiarli. |
| **Eccezione** (`error`) | oggetto | In pratica non succede. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Secondi** (`seconds`) | da 0 a 3600 (un'ora), anche con i decimali | 1 | Il tempo minimo tra due valori che passano. |

## Come funziona

- Il **primo valore** che arriva passa **subito**.
- Ogni valore che arriva **meno di Secondi dopo l'ultimo valore passato** viene **scartato**: non esce né ora né dopo. Il blocco non tiene niente da parte.
- Il primo valore che arriva quando sono passati almeno **Secondi** dall'ultimo passato, passa subito, e il conto ricomincia da lui.
- Il tempo si conta dall'**ultimo valore passato**, non dall'ultimo arrivato: i valori scartati non allungano l'attesa.
- Con **Secondi** = 0 passano tutti. Se il campo resta **vuoto**, vale 0.

Attenzione: siccome i valori troppo vicini sono scartati, **l'ultimo valore di una raffica può andare perso**. Se ti serve anche l'ultimo, aggiungi un blocco [Debounce](core.debounce) in parallelo (vedi l'esempio 3).

Confronto con gli altri blocchi di tempo:

| Blocco | Valori che arrivano mentre aspetta |
|---|---|
| [Ritardo (setTimeout)](core.delay) | Escono tutti, ognuno dopo la sua attesa. |
| [Debounce](core.debounce) | Esce solo l'ultimo, dopo un po' di calma. |
| **Throttle** | Esce subito il primo; quelli troppo vicini vengono scartati. |

Per un numero che deve restare tra un minimo e un massimo c'è invece [Clamp (limita)](core.clamp) (categoria Matematica). Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un valore ogni 0,1 secondi

**Secondi** = 0,3. Arrivano i valori da 1 a 8, uno ogni 0,1 secondi:

| Arriva | Passa? |
|---|---|
| 1 a 0 s | sì (il primo) |
| 2 a 0,1 s, 3 a 0,2 s | no |
| 4 a 0,3 s | sì (sono passati 0,3 s da 1) |
| 5 a 0,4 s, 6 a 0,5 s | no |
| 7 a 0,6 s | sì |
| 8 a 0,7 s | no, e va perso |

### 2. Non più di una notifica al minuto

```
[Confronto (== ≠ < >): temperatura > 30] se vero ──▶ valore [Throttle: 60 s] valore ──▶ invia [Notify: "Fa caldo!"]
```

Anche se la temperatura resta sopra 30 e arriva una lettura ogni 5 secondi, ricevi una [Notify](lilos.notify) al massimo una volta al minuto.

### 3. Aggiornare spesso, ma senza perdere l'ultimo valore

```
[Cursore] valore ──▶ valore [Throttle: 0,2 s] valore ──▶ valore [Indicatore]
          valore ──▶ valore [Debounce: 0,3 s]    valore ──▶ valore [Indicatore]
```

Mentre il [Cursore](ui.slider) si muove, l'[Indicatore](ui.gauge) si aggiorna 5 volte al secondo; quando si ferma, il blocco Debounce manda l'ultima posizione, che altrimenti potrebbe essere stata scartata.

## Vedi anche

- [Ritardo (setTimeout)](core.delay) e [Debounce](core.debounce)
- [Clamp (limita)](core.clamp) per tenere un numero tra due valori
- [Come funziona un blocco](ide/blocks)
