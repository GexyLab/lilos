# Costanti

`logicstudio-constants` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi delle **costanti fondamentali**: le costanti matematiche (π, e, la sezione aurea, le radici e i logaritmi di `Math`, Eulero-Mascheroni, Feigenbaum…), le costanti fisiche con i valori **CODATA 2022** (velocità della luce, Planck, Boltzmann, Avogadro, gravitazione, masse delle particelle, costanti elettromagnetiche e fisico-chimiche…) e le costanti astronomiche e della Terra (unità astronomica, anno luce, parsec, Sole, Terra, gravità standard).

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-constants` («Logic Studio: i blocchi delle costanti fondamentali…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, in tre categorie: **Costanti matematiche**, **Costanti fisiche** e **Costanti astronomiche**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

Un blocco per ogni costante: 25 matematiche, 45 fisiche e 17 astronomiche e della Terra. Il nome del blocco è quello della costante seguito dal simbolo (per esempio «Velocità della luce nel vuoto · c»); il tipo è `const.` seguito dalla chiave della costante (`const.c`). Nella palette si cercano anche per simbolo o per tipo.

### Costanti matematiche

#### Le costanti classiche

| Blocco | Simbolo | Valore |
|---|---|---|
| [Pi greco (Math.PI) · π](const.pi) | π | `3.141592653589793` |
| [Tau (2π) · τ](const.tau) | τ | `6.283185307179586` |
| [Numero di Nepero (Math.E) · e](const.e) | e | `2.718281828459045` |
| [Sezione aurea · φ](const.phi) | φ | `1.618033988749895` |
| [Rapporto argenteo (1 + √2) · δS](const.silver) | δS | `2.414213562373095` |
| [Numero plastico · ρ](const.plastic) | ρ | `1.324717957244746` |
| [Radice di 2 (Math.SQRT2) · √2](const.sqrt2) | √2 | `1.4142135623730951` |
| [Radice di 1/2 (Math.SQRT1_2) · √½](const.sqrtHalf) | √½ | `0.7071067811865476` |
| [Radice di 3 · √3](const.sqrt3) | √3 | `1.7320508075688772` |
| [Logaritmo naturale di 2 (Math.LN2) · ln 2](const.ln2) | ln 2 | `0.6931471805599453` |
| [Logaritmo naturale di 10 (Math.LN10) · ln 10](const.ln10) | ln 10 | `2.302585092994046` |
| [Logaritmo in base 2 di e (Math.LOG2E) · log₂ e](const.log2e) | log₂ e | `1.4426950408889634` |
| [Logaritmo in base 10 di e (Math.LOG10E) · log₁₀ e](const.log10e) | log₁₀ e | `0.4342944819032518` |
| [Un grado in radianti (π/180) · °](const.deg) | ° | `0.017453292519943295` |

#### Costanti dell'analisi e dei sistemi dinamici

| Blocco | Simbolo | Valore |
|---|---|---|
| [Costante di Eulero-Mascheroni · γ](const.gamma) | γ | `0.5772156649015329` |
| [Costante di Catalan · G](const.catalan) | G | `0.915965594177219` |
| [Costante di Apéry · ζ(3)](const.apery) | ζ(3) | `1.2020569031595942` |
| [Costante omega · Ω](const.omega) | Ω | `0.5671432904097838` |
| [Costante di Khinchin · K₀](const.khinchin) | K₀ | `2.6854520010653062` |
| [Costante di Feigenbaum δ · δ](const.feigenbaumDelta) | δ | `4.66920160910299` |
| [Costante di Feigenbaum α · α](const.feigenbaumAlpha) | α | `2.5029078750958926` |

#### I limiti dei numeri

| Blocco | Simbolo | Valore |
|---|---|---|
| [Epsilon di macchina (Number.EPSILON) · ε](const.epsilon) | ε | `2.220446049250313e-16` |
| [Intero sicuro più grande (Number.MAX_SAFE_INTEGER) · 2⁵³ − 1](const.maxSafe) | 2⁵³ − 1 | `9007199254740991` |
| [Numero più grande (Number.MAX_VALUE) · max](const.maxValue) | max | `1.7976931348623157e+308` |
| [Numero positivo più piccolo (Number.MIN_VALUE) · min](const.minValue) | min | `5e-324` |

### Costanti fisiche

#### Le 7 costanti che definiscono il SI, e ħ

| Blocco | Simbolo | Valore | Unità | Incertezza |
|---|---|---|---|---|
| [Velocità della luce nel vuoto · c](const.c) | c | `299792458` | m/s | esatta |
| [Costante di Planck · h](const.h) | h | `6.62607015e-34` | J·s | esatta |
| [Costante di Planck ridotta (h/2π) · ħ](const.hbar) | ħ | `1.0545718176461565e-34` | J·s | esatta |
| [Carica elementare · e](const.qe) | e | `1.602176634e-19` | C | esatta |
| [Costante di Boltzmann · k](const.kB) | k | `1.380649e-23` | J/K | esatta |
| [Costante di Avogadro · Nᴀ](const.NA) | Nᴀ | `6.02214076e+23` | mol⁻¹ | esatta |
| [Frequenza iperfine del cesio · ΔνCs](const.dnuCs) | ΔνCs | `9192631770` | Hz | esatta |
| [Efficacia luminosa (540 THz) · Kcd](const.Kcd) | Kcd | `683` | lm/W | esatta |

#### Gravitazione e unità di Planck

| Blocco | Simbolo | Valore | Unità | Incertezza |
|---|---|---|---|---|
| [Costante di gravitazione universale · G](const.G) | G | `6.6743e-11` | m³/(kg·s²) | `1.5e-15` |
| [Lunghezza di Planck · lP](const.planckLength) | lP | `1.616255e-35` | m | `1.8e-40` |
| [Massa di Planck · mP](const.planckMass) | mP | `2.176434e-8` | kg | `2.4e-13` |
| [Tempo di Planck · tP](const.planckTime) | tP | `5.391247e-44` | s | `6e-49` |
| [Temperatura di Planck · TP](const.planckTemp) | TP | `1.416784e+32` | K | `1.6e+27` |

#### Elettromagnetiche

| Blocco | Simbolo | Valore | Unità | Incertezza |
|---|---|---|---|---|
| [Permeabilità magnetica del vuoto · μ₀](const.mu0) | μ₀ | `0.00000125663706127` | N/A² | `2e-16` |
| [Permittività elettrica del vuoto · ε₀](const.eps0) | ε₀ | `8.8541878188e-12` | F/m | `1.4e-21` |
| [Costante di Coulomb (1/4πε₀) · kₑ](const.ke) | kₑ | `8987551786.170797` | N·m²/C² | `1.4` |
| [Impedenza caratteristica del vuoto · Z₀](const.Z0) | Z₀ | `376.730313412` | Ω | `5.9e-8` |
| [Quanto di flusso magnetico (h/2e) · Φ₀](const.Phi0) | Φ₀ | `2.0678338484619295e-15` | Wb | esatta |
| [Quanto di conduttanza (2e²/h) · G₀](const.G0) | G₀ | `0.00007748091729863649` | S | esatta |
| [Costante di Josephson (2e/h) · Kᴊ](const.KJ) | Kᴊ | `483597848416983.6` | Hz/V | esatta |
| [Costante di von Klitzing (h/e²) · Rᴋ](const.RK) | Rᴋ | `25812.807459304513` | Ω | esatta |
| [Magnetone di Bohr · μB](const.muB) | μB | `9.2740100657e-24` | J/T | `2.9e-33` |
| [Magnetone nucleare · μN](const.muN) | μN | `5.0507837393e-27` | J/T | `1.6e-36` |

#### Atomiche e nucleari

| Blocco | Simbolo | Valore | Unità | Incertezza |
|---|---|---|---|---|
| [Costante di struttura fine · α](const.alpha) | α | `0.0072973525643` | — | `1.1e-12` |
| [Inverso della costante di struttura fine · 1/α](const.alphaInv) | 1/α | `137.035999177` | — | `2.1e-8` |
| [Costante di Rydberg · R∞](const.Rinf) | R∞ | `10973731.568157` | m⁻¹ | `0.000012` |
| [Raggio di Bohr · a₀](const.a0) | a₀ | `5.29177210544e-11` | m | `8.2e-21` |
| [Energia di Hartree · Eh](const.Eh) | Eh | `4.359744722206e-18` | J | `4.8e-30` |
| [Massa dell'elettrone · mₑ](const.me) | mₑ | `9.1093837139e-31` | kg | `2.8e-40` |
| [Massa del protone · mₚ](const.mp) | mₚ | `1.67262192595e-27` | kg | `5.2e-37` |
| [Massa del neutrone · mₙ](const.mn) | mₙ | `1.67492750056e-27` | kg | `8.5e-37` |
| [Massa del muone · mμ](const.mmu) | mμ | `1.883531627e-28` | kg | `4.2e-36` |
| [Rapporto tra massa del protone e dell'elettrone · mₚ/mₑ](const.mpme) | mₚ/mₑ | `1836.152673426` | — | `3.2e-8` |
| [Unità di massa atomica (dalton) · u](const.u) | u | `1.66053906892e-27` | kg | `5.2e-37` |
| [Raggio classico dell'elettrone · rₑ](const.re) | rₑ | `2.8179403205e-15` | m | `1.3e-24` |
| [Lunghezza d'onda Compton · λC](const.lambdaC) | λC | `2.42631023538e-12` | m | `7.6e-22` |
| [Elettronvolt · eV](const.eV) | eV | `1.602176634e-19` | J | esatta |

#### Fisico-chimiche

| Blocco | Simbolo | Valore | Unità | Incertezza |
|---|---|---|---|---|
| [Costante dei gas · R](const.R) | R | `8.31446261815324` | J/(mol·K) | esatta |
| [Costante di Faraday · F](const.F) | F | `96485.33212331001` | C/mol | esatta |
| [Costante di Stefan-Boltzmann · σ](const.sigma) | σ | `5.6703744191844314e-8` | W/(m²·K⁴) | esatta |
| [Costante di spostamento di Wien · b](const.b) | b | `0.002897771955` | m·K | esatta |
| [Volume molare del gas ideale (0 °C, 1 atm) · Vm](const.Vm) | Vm | `0.022413969545014137` | m³/mol | esatta |
| [Costante di Loschmidt (0 °C, 1 atm) · n₀](const.n0) | n₀ | `2.686780111798444e+25` | m⁻³ | esatta |
| [Atmosfera standard · atm](const.atm) | atm | `101325` | Pa | esatta |
| [Zero Celsius in kelvin · T₀](const.T0) | T₀ | `273.15` | K | esatta |

### Costanti astronomiche

#### Distanze e tempi

| Blocco | Simbolo | Valore | Unità | Incertezza |
|---|---|---|---|---|
| [Unità astronomica · au](const.au) | au | `149597870700` | m | esatta |
| [Anno luce · ly](const.ly) | ly | `9460730472580800` | m | esatta |
| [Parsec · pc](const.pc) | pc | `30856775814913670` | m | esatta |
| [Anno giuliano · a](const.year) | a | `31557600` | s | esatta |

#### Il Sole

| Blocco | Simbolo | Valore | Unità | Incertezza |
|---|---|---|---|---|
| [Parametro gravitazionale del Sole · GM☉](const.GMsun) | GM☉ | `132712440000000000000` | m³/s² | esatta |
| [Massa del Sole · M☉](const.Msun) | M☉ | `1.98841e+30` | kg | `4.5e+25` |
| [Raggio del Sole · R☉](const.Rsun) | R☉ | `695700000` | m | esatta |
| [Luminosità del Sole · L☉](const.Lsun) | L☉ | `3.828e+26` | W | esatta |
| [Temperatura efficace del Sole · T☉](const.Tsun) | T☉ | `5772` | K | esatta |
| [Costante solare (irraggiamento a 1 au) · S☉](const.S) | S☉ | `1361` | W/m² | esatta |

#### La Terra

| Blocco | Simbolo | Valore | Unità | Incertezza |
|---|---|---|---|---|
| [Parametro gravitazionale della Terra · GM⊕](const.GMearth) | GM⊕ | `398600400000000` | m³/s² | esatta |
| [Massa della Terra · M⊕](const.Mearth) | M⊕ | `5.97217e+24` | kg | `130000000000000000000` |
| [Raggio equatoriale della Terra · Rₑ⊕](const.ReEarth) | Rₑ⊕ | `6378100` | m | esatta |
| [Raggio polare della Terra · Rₚ⊕](const.RpEarth) | Rₚ⊕ | `6356800` | m | esatta |
| [Raggio medio della Terra · R⊕](const.RmEarth) | R⊕ | `6371008.7714` | m | esatta |
| [Velocità angolare della Terra · ω⊕](const.omegaEarth) | ω⊕ | `0.00007292115` | rad/s | esatta |
| [Accelerazione di gravità standard · gₙ](const.gn) | gₙ | `9.80665` | m/s² | esatta |

## Come si usano

Trascina nello schema il blocco della costante che ti serve: non ha impostazioni. Come per [Costante · Variabile](core.value), il valore esce **una volta all'avvio** dello schema; se colleghi l'ingresso nascosto **invia**, esce invece a ogni impulso che arriva lì.

L'uscita **valore** è sempre visibile. Le altre (**simbolo**, e per le costanti fisiche e astronomiche **unità** e **incertezza**) sono nascoste di serie: mostrale con l'**occhio** nelle Proprietà quando ti servono.

Tutti i valori sono in **unità SI** (metri, chilogrammi, secondi, joule…). L'**incertezza** è l'incertezza standard nella stessa unità, `0` per le costanti esatte per definizione.

## Da dove vengono i valori

- **Matematiche**: le costanti di `Math` e `Number` di JavaScript, le altre con tutte le cifre che un numero a doppia precisione può tenere.
- **Fisiche**: i valori raccomandati CODATA 2022 (NIST, 2024). Le 7 costanti che definiscono il SI dal 2019 sono esatte.
- **Astronomiche e della Terra**: le definizioni e i valori nominali della IAU (2012 e 2015), i modelli WGS 84 e GRS 80 per la Terra, e la gravità standard della CGPM (1901).

Quando cambiano i valori raccomandati (CODATA li aggiorna ogni 4 anni), una nuova versione del pacchetto li aggiorna: i programmi useranno i nuovi valori dal loro prossimo avvio.

## I blocchi obsoleti

Fino alla versione 1.0.0 il pacchetto aveva tre blocchi soli, con la costante scelta in un menu delle Proprietà: [Costanti matematiche (Math.PI, Math.E…)](const.math), [Costanti fisiche (CODATA)](const.physics) e [Costanti astronomiche e della Terra](const.astro). Dalla 1.1.0 sono **obsoleti**: gli schemi salvati che li usano funzionano come prima, ma non sono più nell'elenco dei blocchi, e nelle Proprietà un avviso dice da cosa sono sostituiti. Per passare ai blocchi nuovi metti al loro posto il blocco della stessa costante e rifai i collegamenti. Due chiavi dei vecchi blocchi hanno un nome diverso nel tipo dei nuovi: la carica elementare `e` è `const.qe`, la radice di 1/2 `sqrt1_2` è `const.sqrtHalf`.
