# Costanti fisiche (CODATA)

`const.physics` · Valori · [Costanti](logicstudio-constants) · versione 1

Dà il valore di una costante fisica fondamentale, scelta nelle impostazioni, con il suo simbolo, la sua unità SI e la sua incertezza. I valori sono quelli raccomandati **CODATA 2022** (pubblicati dal NIST nel 2024): le 7 costanti che dal 2019 definiscono il Sistema Internazionale sono **esatte**, e lo sono anche quelle che si calcolano solo da loro (ħ, R, F, σ…).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore della costante scelta. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo della costante, come nella tabella sotto (per esempio `π`). |
| **unità** (`unit`) | testo | Nascosta di serie. L'unità di misura SI del valore, come nella tabella sotto (per esempio `m/s`); testo vuoto per un numero puro. |
| **incertezza** (`uncertainty`) | numero | Nascosta di serie. L'incertezza standard del valore, nella stessa unità; `0` per una costante esatta. |
| **Exception** (`error`) | oggetto | Quando la costante scelta non esiste in questa versione del pacchetto (vedi **Errori**). |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Costante** (`constant`) | una delle costanti della tabella sotto | c · Velocità della luce nel vuoto (`c`) | Quale costante mandare. Nel menu ogni voce mostra il simbolo e il nome. |

## Come funziona

### Quando manda il valore

| invia | Cosa fa |
|---|---|
| non collegato | Manda il valore una volta, all'avvio dello schema, su tutte le uscite. |
| collegato | Manda il valore a ogni impulso su **invia**, mai all'avvio. |

All'avvio il blocco manda prima di tutto **valore**, poi le altre uscite. Le uscite nascoste mandano lo stesso il loro valore: mostrale con l'**occhio** nelle **Proprietà** per collegarle. Sotto il nome del blocco, nel disegno, compare la **chiave** della costante scelta (per esempio `c`): la trovi nell'ultima colonna delle tabelle.

I valori sono numeri a doppia precisione, come tutti i numeri di Logic Studio e di JavaScript: hanno 15-17 cifre significative. Un calcolo può quindi dare un risultato leggermente diverso da quello esatto: per esempio il seno di 30° esce `0.49999999999999994` e non `0.5`. Per mostrarlo arrotondato usa [Funzioni Math](core.math) (`round`) dopo una moltiplicazione, o [Template (formatta)](core.format).

Per un numero qualsiasi che non è in elenco usa [Costante · Variabile](core.value).

### Note sulle costanti

- **Incertezza**: è l'incertezza standard CODATA, nella stessa unità del valore. Per esempio G vale `6.6743e-11` con incertezza `1.5e-15`: si scrive anche 6,674 30(15) × 10⁻¹¹.
- Le costanti **esatte** sono le 7 del SI e quelle che ne derivano solo con numeri e π: ħ = h/2π, R = Nᴀ·k, F = Nᴀ·e, σ, b di Wien, Φ₀ = h/2e, G₀ = 2e²/h, Kᴊ = 2e/h, Rᴋ = h/e², l'elettronvolt, il volume molare e la costante di Loschmidt a 0 °C e 1 atm. Il blocco le calcola con le stesse formule, quindi le ultime cifre possono essere dovute all'arrotondamento dei numeri a doppia precisione.
- **Atmosfera standard** e **zero Celsius in kelvin** sono valori convenzionali, esatti per definizione.
- La **costante di Coulomb** kₑ = 1/(4πε₀) non è nell'elenco CODATA: il blocco la calcola da ε₀, e la sua incertezza viene da quella di ε₀.
- L'**accelerazione di gravità standard** gₙ è in [Costanti astronomiche e della Terra](const.astro).

Per le regole generali (ingressi nascosti, Exception) vedi [Come funziona un blocco](ide/blocks).

## Le costanti

### Le 7 costanti che definiscono il SI, e ħ

| Simbolo | Costante | Valore | Incertezza | Unità | Chiave |
|---|---|---|---|---|---|
| c | Velocità della luce nel vuoto | `299792458` | esatta | m/s | `c` |
| h | Costante di Planck | `6.62607015e-34` | esatta | J·s | `h` |
| ħ | Costante di Planck ridotta (h/2π) | `1.0545718176461565e-34` | esatta | J·s | `hbar` |
| e | Carica elementare | `1.602176634e-19` | esatta | C | `e` |
| k | Costante di Boltzmann | `1.380649e-23` | esatta | J/K | `kB` |
| Nᴀ | Costante di Avogadro | `6.02214076e+23` | esatta | mol⁻¹ | `NA` |
| ΔνCs | Frequenza iperfine del cesio | `9192631770` | esatta | Hz | `dnuCs` |
| Kcd | Efficacia luminosa (540 THz) | `683` | esatta | lm/W | `Kcd` |

### Gravitazione e unità di Planck

| Simbolo | Costante | Valore | Incertezza | Unità | Chiave |
|---|---|---|---|---|---|
| G | Costante di gravitazione universale | `6.6743e-11` | `1.5e-15` | m³/(kg·s²) | `G` |
| lP | Lunghezza di Planck | `1.616255e-35` | `1.8e-40` | m | `planckLength` |
| mP | Massa di Planck | `2.176434e-8` | `2.4e-13` | kg | `planckMass` |
| tP | Tempo di Planck | `5.391247e-44` | `6e-49` | s | `planckTime` |
| TP | Temperatura di Planck | `1.416784e+32` | `1.6e+27` | K | `planckTemp` |

### Elettromagnetiche

| Simbolo | Costante | Valore | Incertezza | Unità | Chiave |
|---|---|---|---|---|---|
| μ₀ | Permeabilità magnetica del vuoto | `0.00000125663706127` | `2e-16` | N/A² | `mu0` |
| ε₀ | Permittività elettrica del vuoto | `8.8541878188e-12` | `1.4e-21` | F/m | `eps0` |
| kₑ | Costante di Coulomb (1/4πε₀) | `8987551786.170797` | `1.4` | N·m²/C² | `ke` |
| Z₀ | Impedenza caratteristica del vuoto | `376.730313412` | `5.9e-8` | Ω | `Z0` |
| Φ₀ | Quanto di flusso magnetico (h/2e) | `2.0678338484619295e-15` | esatta | Wb | `Phi0` |
| G₀ | Quanto di conduttanza (2e²/h) | `0.00007748091729863649` | esatta | S | `G0` |
| Kᴊ | Costante di Josephson (2e/h) | `483597848416983.6` | esatta | Hz/V | `KJ` |
| Rᴋ | Costante di von Klitzing (h/e²) | `25812.807459304513` | esatta | Ω | `RK` |
| μB | Magnetone di Bohr | `9.2740100657e-24` | `2.9e-33` | J/T | `muB` |
| μN | Magnetone nucleare | `5.0507837393e-27` | `1.6e-36` | J/T | `muN` |

### Atomiche e nucleari

| Simbolo | Costante | Valore | Incertezza | Unità | Chiave |
|---|---|---|---|---|---|
| α | Costante di struttura fine | `0.0072973525643` | `1.1e-12` | — | `alpha` |
| 1/α | Inverso della costante di struttura fine | `137.035999177` | `2.1e-8` | — | `alphaInv` |
| R∞ | Costante di Rydberg | `10973731.568157` | `0.000012` | m⁻¹ | `Rinf` |
| a₀ | Raggio di Bohr | `5.29177210544e-11` | `8.2e-21` | m | `a0` |
| Eh | Energia di Hartree | `4.359744722206e-18` | `4.8e-30` | J | `Eh` |
| mₑ | Massa dell'elettrone | `9.1093837139e-31` | `2.8e-40` | kg | `me` |
| mₚ | Massa del protone | `1.67262192595e-27` | `5.2e-37` | kg | `mp` |
| mₙ | Massa del neutrone | `1.67492750056e-27` | `8.5e-37` | kg | `mn` |
| mμ | Massa del muone | `1.883531627e-28` | `4.2e-36` | kg | `mmu` |
| mₚ/mₑ | Rapporto tra massa del protone e dell'elettrone | `1836.152673426` | `3.2e-8` | — | `mpme` |
| u | Unità di massa atomica (dalton) | `1.66053906892e-27` | `5.2e-37` | kg | `u` |
| rₑ | Raggio classico dell'elettrone | `2.8179403205e-15` | `1.3e-24` | m | `re` |
| λC | Lunghezza d'onda Compton | `2.42631023538e-12` | `7.6e-22` | m | `lambdaC` |
| eV | Elettronvolt | `1.602176634e-19` | esatta | J | `eV` |

### Fisico-chimiche

| Simbolo | Costante | Valore | Incertezza | Unità | Chiave |
|---|---|---|---|---|---|
| R | Costante dei gas | `8.31446261815324` | esatta | J/(mol·K) | `R` |
| F | Costante di Faraday | `96485.33212331001` | esatta | C/mol | `F` |
| σ | Costante di Stefan-Boltzmann | `5.6703744191844314e-8` | esatta | W/(m²·K⁴) | `sigma` |
| b | Costante di spostamento di Wien | `0.002897771955` | esatta | m·K | `b` |
| Vm | Volume molare del gas ideale (0 °C, 1 atm) | `0.022413969545014137` | esatta | m³/mol | `Vm` |
| n₀ | Costante di Loschmidt (0 °C, 1 atm) | `2.686780111798444e+25` | esatta | m⁻³ | `n0` |
| atm | Atmosfera standard | `101325` | esatta | Pa | `atm` |
| T₀ | Zero Celsius in kelvin | `273.15` | esatta | K | `T0` |

## Esempi

### 1. L'energia a riposo dell'elettrone (E = mc²)

```
[Costanti fisiche: me] valore ──▶ a [Moltiplicazione (×)] risultato ──▶ valore [Print (console.log)]
[Costanti fisiche: c]  valore ──▶ b
                       valore ──▶ c (ingresso aggiunto)
```

Aggiungi alla [Moltiplicazione (×)](core.multiply) l'ingresso **c** nelle Proprietà e collegaci lo stesso blocco della velocità della luce. L'ultima riga della console è `8.187105787968451e-14` (joule).

### 2. Mostrare valore, unità e incertezza a comando

```
[Pulsante: Mostra G] premuto ──▶ invia [Costanti fisiche: G] valore      ──▶ v [Template (formatta): G = {v} ± {u} {un}] testo ──▶ valore [Print (console.log)]
                                                         incertezza ──▶ u
                                                         unità      ──▶ un
```

Mostra con l'occhio l'ingresso **invia** e le uscite **incertezza** e **unità**. All'avvio non esce niente; a ogni clic l'ultima riga è `G = 6.6743e-11 ± 1.5e-15 m³/(kg·s²)`.

## Errori

| Messaggio | Quando |
|---|---|
| Costante sconosciuta: `chiave` (Unknown constant) | La chiave salvata nello schema non è una di quelle di questa versione del pacchetto: lo schema è stato fatto con una versione più nuova, o il file `.lsch` è stato cambiato a mano. Scegli di nuovo la costante nelle **Proprietà**. |

## Vedi anche

- [Costanti matematiche (Math.PI, Math.E…)](const.math), [Costanti astronomiche e della Terra](const.astro)
- [Costante · Variabile](core.value), [Moltiplicazione (×)](core.multiply)
- I valori CODATA: https://physics.nist.gov/cuu/Constants/
- [Come funziona un blocco](ide/blocks)
