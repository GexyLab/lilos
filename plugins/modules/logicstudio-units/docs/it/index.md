# Grandezze e unità

`logicstudio-units` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per **convertire tra unità di misura**: un blocco per ogni grandezza (lunghezza, massa, temperatura, pressione, energia, dati…), un blocco che converte con unità scelte mentre il programma gira, i **prefissi SI** (k, M, m, µ…), e i blocchi per **leggere** una misura da un testo (`"12,5 km"`) e **scriverla** (`12,5 km`).

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-units` («Logic Studio: i blocchi per grandezze e unità di misura…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Conversioni unità di misura**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

### Un blocco per grandezza

Ognuno ha un ingresso **valore**, un'uscita **risultato** e, nelle Proprietà, l'unità di partenza (**Da**), quella di arrivo (**A**) e un arrotondamento facoltativo.

| Blocco | Grandezza (`id`) | Unità |
|---|---|---|
| [Lunghezza](unit.length) | `length` | m, km, cm, mm, µm, nm, in, ft, yd, mi, nmi |
| [Superficie](unit.area) | `area` | m², km², cm², mm², ha, a, in², ft², yd², ac, mi² |
| [Volume](unit.volume) | `volume` | m³, L, dL, cL, mL, cm³, in³, ft³, galloni, quarti, pinte e once liquide USA e imperiali |
| [Massa](unit.mass) | `mass` | kg, t, g, mg, µg, lb, oz, st, ct |
| [Temperatura](unit.temperature) | `temperature` | °C, °F, K, °R |
| [Tempo](unit.time) | `time` | s, ms, µs, ns, min, h, d, wk, yr |
| [Velocità](unit.speed) | `speed` | m/s, km/h, mph, kn, ft/s |
| [Accelerazione](unit.acceleration) | `acceleration` | m/s², gn, ft/s², Gal |
| [Forza](unit.force) | `force` | N, kN, dyn, kgf, lbf |
| [Pressione](unit.pressure) | `pressure` | Pa, hPa, kPa, MPa, bar, mbar, atm, psi, mmHg, Torr, inHg, mH₂O |
| [Energia](unit.energy) | `energy` | J, kJ, MJ, Wh, kWh, cal, kcal, BTU, eV |
| [Potenza](unit.power) | `power` | W, kW, MW, CV, hp, BTU/h, kcal/h |
| [Angolo](unit.angle) | `angle` | rad, °, ′, ″, gon, rev |
| [Frequenza](unit.frequency) | `frequency` | Hz, kHz, MHz, GHz, rpm, rad/s |
| [Dati](unit.data) | `data` | bit, B, kB, MB, GB, TB, KiB, MiB, GiB, TiB, kbit, Mbit, Gbit |
| [Velocità dei dati](unit.dataRate) | `dataRate` | bit/s, kbit/s, Mbit/s, Gbit/s, B/s, kB/s, MB/s, GB/s, MiB/s |
| [Portata](unit.flow) | `flow` | m³/s, m³/h, L/s, L/min, L/h, gal/min |
| [Densità](unit.density) | `density` | kg/m³, g/cm³, kg/L, g/L, lb/ft³ |
| [Coppia](unit.torque) | `torque` | N·m, kgf·m, lbf·ft, lbf·in |
| [Consumo di carburante](unit.fuel) | `fuel` | L/100km, km/L, mpg US, mpg UK |

### Blocchi generici

| Blocco | Cosa fa |
|---|---|
| [Converti (da · a)](unit.convert) | Converte con le unità che arrivano come testo (`"km/h"` → `"m/s"`) e riconosce da solo la grandezza. |
| [Prefissi SI (k, M, m, µ…)](unit.prefix) | Passa da un prefisso all'altro per qualsiasi unità, anche quelle che non sono nel pacchetto (V, A, Ω, F…). |
| [Leggi misura (parse)](unit.parse) | Da `"12,5 km"` ricava il numero, l'unità e la grandezza; se vuoi converte subito. |
| [Scrivi misura (format)](unit.format) | Da un numero e un'unità fa un testo come `12,5 km`, anche scegliendo il prefisso (1500 m → 1,5 km). |
| [Unità di una grandezza](unit.list) | La lista delle unità di una grandezza, pronta per una [Selezione](ui.select). |

## Le unità come testo

[Converti (da · a)](unit.convert) e [Leggi misura (parse)](unit.parse) ricevono le unità come testo. Vale il **simbolo** esatto della tabella di ogni grandezza, **maiuscole e minuscole comprese** (`kN` è il kilonewton, `kn` il nodo; `Gal` è un'accelerazione, `gal` non esiste: si scrive `gal US` o `gal UK`). Ogni unità ha anche altri modi di scriverla, elencati nella colonna **Si scrive anche** (per esempio `m2` per `m²`, `C` per `°C`, `um` per `µm`). Gli spazi prima e dopo non contano.

Ogni simbolo appartiene a **una sola grandezza**: per questo basta il simbolo per sapere di che grandezza si parla.

## La precisione

I fattori sono quelli esatti delle definizioni (1 in = 2,54 cm, 1 lb = 0,45359237 kg, 1 gal US = 3,785411784 L…). I risultati sono arrotondati a **12 cifre significative**, così i piccoli errori dei numeri con la virgola del computer non si vedono: 30 cm in metri dà `0.3`, non `0.30000000000000004`.

## Errori

Gli errori (un valore che non è un numero, un'unità sconosciuta, due unità di grandezze diverse, una temperatura sotto lo zero assoluto…) escono dalla porta **Exception** del blocco, o vanno nella console principale se non è collegata. Ogni pagina elenca i messaggi esatti.

## Vedi anche

- [Funzioni Math](core.math) per arrotondare e per seno e coseno (in radianti: vedi [Angolo](unit.angle))
- [Componenti UI standard](logicstudio-ui) per mostrare le misure in una finestra
- [Come funziona un blocco](ide/blocks)
