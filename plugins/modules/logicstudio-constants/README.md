# logicstudio-constants

I blocchi di Logic Studio per le **costanti fondamentali**.

- **Costanti matematiche (Math.PI, Math.E…)** (`const.math`): π, τ, e, sezione aurea, rapporto argenteo, numero plastico, radici di 2, 1/2 e 3, i logaritmi di `Math` (LN2, LN10, LOG2E, LOG10E), un grado in radianti, Eulero-Mascheroni, Catalan, Apéry, omega, Khinchin, Feigenbaum δ e α, e i limiti dei numeri di JavaScript (`Number.EPSILON`, `MAX_SAFE_INTEGER`, `MAX_VALUE`, `MIN_VALUE`).
- **Costanti fisiche (CODATA)** (`const.physics`): le 7 costanti che definiscono il SI (esatte) e le altre costanti fondamentali con i valori **CODATA 2022**: gravitazione e unità di Planck, elettromagnetiche (μ₀, ε₀, Coulomb, Z₀, quanti di flusso e di conduttanza, Josephson, von Klitzing, magnetoni), atomiche e nucleari (α, Rydberg, Bohr, Hartree, masse di elettrone, protone, neutrone, muone, dalton…), fisico-chimiche (R, F, σ, Wien, volume molare, Loschmidt, atmosfera, zero Celsius).
- **Costanti astronomiche e della Terra** (`const.astro`): unità astronomica, anno luce, parsec, anno giuliano, i valori nominali IAU del Sole e della Terra (massa, raggio, luminosità, costante solare, rotazione) e l'accelerazione di gravità standard.

La costante si sceglie nelle impostazioni. Come [Costante · Variabile] (`core.value`), il valore esce all'avvio dello schema, oppure a ogni impulso sull'ingresso nascosto **invia** quando è collegato. Le uscite nascoste danno anche il **simbolo**, l'**unità** (SI) e l'**incertezza** standard (0 = esatta per definizione).

Richiede il motore `logicstudio-engine`.
