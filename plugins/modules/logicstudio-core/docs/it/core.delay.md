# Ritardo (setTimeout)

`core.delay` · Tempo · [Blocchi di base](logicstudio-core) · versione 1

Fa uscire ogni valore che arriva dopo un certo numero di secondi, senza cambiarlo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da far aspettare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Lo stesso valore, dopo l'attesa. |
| **Exception** (`error`) | oggetto | In pratica non succede. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Secondi** (`seconds`) | da 0 a 86400 (24 ore), anche con i decimali | 1 | Quanto aspetta ogni valore prima di uscire. |

## Come funziona

Ogni valore che arriva **aspetta per conto suo** e poi esce, uguale a come è arrivato.

- **Se arrivano altri valori mentre uno aspetta**, nessuno va perso e nessuna attesa ricomincia: ogni valore esce **Secondi** dopo il *suo* arrivo. Siccome l'attesa è la stessa per tutti, escono **nello stesso ordine** in cui sono arrivati e con le stesse distanze tra loro.
- Il blocco **non ferma il programma**: mentre i valori aspettano, gli altri blocchi (e lo stesso blocco Ritardo, per i valori nuovi) continuano a lavorare.
- Con **Secondi** = 0 il valore esce subito dopo che i blocchi hanno finito il lavoro che stavano facendo in quel momento. È utile per far arrivare un valore «dopo» gli altri: per esempio dopo i valori iniziali (vedi [All'avvio (main)](core.onStart)).
- Un numero negativo vale 0. Se il campo **Secondi** resta **vuoto**, vale 0 (non 1).
- Quando il programma si ferma, i valori che stavano aspettando **vanno persi**. Vale anche per un programma attivo che riparte con il computer: un'attesa lunga non sopravvive alla ripartenza.
- Non c'è un limite a quanti valori possono aspettare insieme: tanti valori in arrivo con un'attesa lunga restano tutti in memoria fino all'uscita.

Se vuoi che un valore nuovo **sostituisca** quello che aspetta, usa [Debounce](core.debounce); se vuoi **scartare** i valori troppo vicini, usa [Throttle](core.throttle).

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Tre valori ravvicinati

**Secondi** = 0,3. Arrivano 1 al tempo 0, 2 dopo 0,1 secondi e 3 dopo 0,2 secondi:

| Arriva | Esce |
|---|---|
| 1 a 0 s | 1 a 0,3 s |
| 2 a 0,1 s | 2 a 0,4 s |
| 3 a 0,2 s | 3 a 0,5 s |

### 2. Una spia che si spegne da sola

Due collegamenti partono dallo stesso Pulsante:

```
[Pulsante: Chiama] premuto ──▶ accesa [Spia]
                   premuto ──▶ valore [Ritardo (setTimeout): 5 s] valore ──▶ invia [Costante · Variabile: sì/no "no"] valore ──▶ accesa [Spia]
```

Al clic la [Spia](ui.lamp) si accende (premuto vale sì) e 5 secondi dopo si spegne. Con due clic a 2 secondi di distanza, la spia si spegne 5 secondi dopo il **primo** clic (al secondo 5) e poi riceve un altro «no» al secondo 7. Se vuoi che resti accesa 5 secondi dopo l'**ultimo** clic, usa [Debounce](core.debounce) al posto di Ritardo.

### 3. Ritentare dopo un errore

```
[HTTP (fetch)] Exception ──▶ valore [Ritardo (setTimeout): 10 s] valore ──▶ invia [HTTP (fetch)]
```

Se la [HTTP (fetch)](net.request) non riesce, riprova da sola 10 secondi dopo. Attenzione: se non riesce mai, riprova per sempre ogni 10 secondi.

## Vedi anche

- [Debounce](core.debounce) e [Throttle](core.throttle)
- [Intervallo (setInterval)](core.every)
- [Come funziona un blocco](ide/blocks)
