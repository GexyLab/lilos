# Memoria (set · get)

`core.store` · Valori · [Blocchi di base](logicstudio-core) · versione 1

Tiene da parte un valore e lo manda quando glielo chiedi. È la «variabile» di uno schema (in alternativa c'è [Costante · Variabile](core.value), che con **imposta** collegato diventa anch'esso una variabile): la scrivi con **imposta**, la leggi con **leggi**, la svuoti con **svuota**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **imposta** (`set`) | qualsiasi | Il valore da tenere. Sostituisce quello di prima. |
| **leggi** (`get`) | impulso | Qualsiasi valore che arriva qui fa mandare il valore tenuto. |
| **svuota** (`clear`) | impulso | Qualsiasi valore che arriva qui cancella il valore tenuto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore tenuto, quando arriva **leggi** (o subito, con **Invia quando cambia**). |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Invia quando cambia** (`echo`) | sì / no | no | Se è spuntata, ogni valore che arriva su **imposta** viene anche mandato subito su **valore**. |

## Come funziona

Il blocco reagisce in modo diverso secondo l'ingresso che lo avvia:

| Arriva su | Cosa fa | Cosa manda su **valore** |
|---|---|---|
| **imposta** | Tiene il valore arrivato (qualsiasi tipo, anche `null`). | Niente; con **Invia quando cambia**, il valore appena tenuto. |
| **leggi** | Niente. | Il valore tenuto; se è vuoto (mai impostato o svuotato), `null`. |
| **svuota** | Cancella il valore tenuto. | Niente. |

Cose da sapere:

- **Invia quando cambia** manda il valore **ogni volta** che arriva su **imposta**, anche se è uguale a quello di prima.
- Su **leggi** e **svuota** conta solo che arrivi qualcosa: il valore che arriva è ignorato.
- La memoria **parte vuota a ogni avvio** del programma e non viene salvata: quando il programma si ferma, il valore si perde. Per un valore che resta, scrivilo in un file con i blocchi di [lilOS](logicstudio-lilos).
- Un valore iniziale su **imposta** (nelle **Proprietà**) riempie la memoria alla partenza.
- Non togliere «lo avvia» da **imposta**: il blocco tiene un valore solo quando è **imposta** ad avviarlo. Senza «lo avvia», i valori che arrivano lì non vengono tenuti.
- Oggetti e liste vengono tenuti così come arrivano.

Vedi anche [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Ricordare l'ultimo testo scritto e mostrarlo su richiesta

```
[Campo di testo: nome] testo   ──▶ imposta [Memoria (set · get)] valore ──▶ valore [Print (console.log)]
[Pulsante: Mostra]     premuto ──▶ leggi
```

L'utente scrive `Ada` nel [Campo di testo](ui.text): il blocco Memoria (set · get) lo tiene, senza mandarlo. Quando preme **Mostra**, la console scrive `Ada`. Se preme **Mostra** prima di aver scritto qualcosa, il blocco manda `null` e la console scrive una riga vuota.

### 2. L'ultimo valore, ogni 10 secondi

Un valore cambia molte volte al secondo, ma vuoi scriverlo solo ogni 10 secondi:

```
[Cursore: livello] valore  ──▶ imposta [Memoria (set · get)] valore ──▶ valore [Print (console.log)]
[Intervallo (setInterval): 10 s]      impulso ──▶ leggi
```

Il [Cursore](ui.slider) aggiorna il blocco Memoria (set · get) a ogni movimento; [Intervallo (setInterval)](core.every) glielo fa leggere ogni 10 secondi. Se l'utente porta il cursore a 20, poi 35, poi 42 in quei 10 secondi, la console scrive solo `42`.

Con **Invia quando cambia** spuntata, invece, la console scriverebbe anche `20`, `35` e `42` a ogni movimento.

### 3. Un valore che si azzera

```
[Pulsante: Azzera] premuto ──▶ svuota [Memoria (set · get)]
```

Dopo **Azzera**, un **leggi** manda `null` finché non arriva un nuovo **imposta**.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Costante · Variabile](core.value) per un valore fisso
- [Contatore (++ −−)](core.counter) per un numero che sale e scende
- [Al cambio (fronte ↑↓)](core.edge) per sapere quando un sì/no cambia
- [Come funziona un blocco](ide/blocks)
