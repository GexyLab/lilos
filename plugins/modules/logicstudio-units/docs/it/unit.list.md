# Unità di una grandezza

`unit.list` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Manda la lista delle unità di una grandezza, pronta per riempire una [Selezione](ui.select) o un [Elenco](ui.list) in una finestra.

## Ingressi

Tutti e due sono nascosti di serie (si mostrano con l'occhio nelle Proprietà).

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Manda di nuovo la lista. |
| **grandezza** (`quantity`) | testo | Cambia la grandezza: l'`id` di una grandezza (`length`, `temperature`…). Manda subito la lista. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **unità** (`units`) | lista | Le unità, nell'ordine della pagina della grandezza. |
| **Exception** (`error`) | oggetto | La grandezza non esiste. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Grandezza** (`quantity`) | le 20 grandezze del pacchetto | Lunghezza | La grandezza di cui mandare le unità. |
| **Lista di** (`labels`) | Simbolo e nome (per una Selezione), Solo i simboli | Simbolo e nome | Cosa c'è nella lista. |

## Come funziona

- **All'avvio**, se non c'è niente collegato né a **invia** né a **grandezza**, il blocco manda subito la lista della **Grandezza** delle Proprietà.
- Un impulso su **invia** la manda di nuovo; un testo su **grandezza** manda quella della grandezza ricevuta (e un impulso dopo rimanda quest'ultima).
- Con **Simbolo e nome** ogni elemento è un oggetto `{ "value": "km", "label": "km — chilometro" }`: una [Selezione](ui.select) mostra l'etichetta e manda il simbolo. Il nome è nella **lingua di chi fa girare il programma** (italiano o inglese).
- Con **Solo i simboli** la lista è di testi: `["°C", "°F", "K", "°R"]`.

Gli `id` delle grandezze sono nella tabella di [Grandezze e unità](logicstudio-units).

## Esempi

### 1. Un menu di unità di temperatura

```
[Unità di una grandezza: temperature] unità ──▶ opzioni [Selezione]
```

La Selezione mostra «°C — grado Celsius», «°F — grado Fahrenheit», «K — kelvin», «°R — grado Rankine»; quando se ne sceglie una manda `°C`, `°F`…, pronte per **da** o **a** di [Converti (da · a)](unit.convert).

### 2. Prima la grandezza, poi le unità

Una Selezione con le grandezze (`length, mass, temperature`) cambia le unità delle altre due:

```
[Selezione: grandezza] valore ──▶ grandezza [Unità di una grandezza] unità ──▶ opzioni [Selezione: da]
                                                                    unità ──▶ opzioni [Selezione: a]
```

Scegliendo `mass`, le due Selezioni mostrano kg, t, g, mg, µg, lb, oz, st, ct.

## Errori

| Messaggio | Quando |
|---|---|
| Grandezza sconosciuta: «…» | Su **grandezza** arriva un testo che non è l'`id` di una grandezza del pacchetto (per esempio `lunghezza` invece di `length`). |

## Vedi anche

- [Converti (da · a)](unit.convert), che riceve le unità scelte
- [Selezione](ui.select)
- [Grandezze e unità](logicstudio-units)
- [Come funziona un blocco](ide/blocks)
