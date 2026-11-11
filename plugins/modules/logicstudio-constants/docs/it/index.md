# Costanti

`logicstudio-constants` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi delle **costanti fondamentali**: le costanti matematiche (π, e, la sezione aurea, le radici e i logaritmi di `Math`, Eulero-Mascheroni, Feigenbaum…), le costanti fisiche con i valori **CODATA 2022** (velocità della luce, Planck, Boltzmann, Avogadro, gravitazione, masse delle particelle, costanti elettromagnetiche e fisico-chimiche…) e le costanti astronomiche e della Terra (unità astronomica, anno luce, parsec, Sole, Terra, gravità standard).

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-constants` («Logic Studio: i blocchi delle costanti fondamentali…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Valori**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

| Blocco | Cosa fa |
|---|---|
| [Costanti matematiche (Math.PI, Math.E…)](const.math) | 25 costanti matematiche e i limiti dei numeri di JavaScript. |
| [Costanti fisiche (CODATA)](const.physics) | 45 costanti fisiche, con simbolo, unità SI e incertezza. |
| [Costanti astronomiche e della Terra](const.astro) | 17 costanti di distanze, tempi, Sole e Terra, con simbolo, unità SI e incertezza. |

## Come si usano

Ogni blocco ha un menu **Costante** nelle **Proprietà**, dove si sceglie quale costante mandare: ogni voce mostra il simbolo e il nome (per esempio «c · Velocità della luce nel vuoto»). Come per [Costante · Variabile](core.value), il valore esce **una volta all'avvio** dello schema; se colleghi l'ingresso nascosto **invia**, esce invece a ogni impulso che arriva lì.

L'uscita **valore** è sempre visibile. Le altre (**simbolo**, e per le costanti fisiche e astronomiche **unità** e **incertezza**) sono nascoste di serie: mostrale con l'**occhio** nelle Proprietà quando ti servono.

Tutti i valori sono in **unità SI** (metri, chilogrammi, secondi, joule…). L'**incertezza** è l'incertezza standard nella stessa unità, `0` per le costanti esatte per definizione.

## Da dove vengono i valori

- **Matematiche**: le costanti di `Math` e `Number` di JavaScript, le altre con tutte le cifre che un numero a doppia precisione può tenere.
- **Fisiche**: i valori raccomandati CODATA 2022 (NIST, 2024). Le 7 costanti che definiscono il SI dal 2019 sono esatte.
- **Astronomiche e della Terra**: le definizioni e i valori nominali della IAU (2012 e 2015), i modelli WGS 84 e GRS 80 per la Terra, e la gravità standard della CGPM (1901).

Quando cambiano i valori raccomandati (CODATA li aggiorna ogni 4 anni), una nuova versione del pacchetto li aggiorna: i programmi useranno i nuovi valori dal loro prossimo avvio.
