# logicstudio-units

I blocchi di Logic Studio per **grandezze e unità di misura**.

- **Un convertitore per ogni grandezza** (20): Lunghezza, Superficie, Volume, Massa, Temperatura, Tempo, Velocità, Accelerazione, Forza, Pressione, Energia, Potenza, Angolo, Frequenza, Dati, Velocità dei dati, Portata, Densità, Coppia, Consumo di carburante. Le unità di partenza e di arrivo si scelgono nelle Proprietà; il risultato può essere arrotondato.
- **Converti (da · a)**: converte con le unità che arrivano come testo (`"km/h"` → `"m/s"`) e riconosce da solo la grandezza.
- **Prefissi SI (k, M, m, µ…)**: cambia il prefisso per qualsiasi unità.
- **Leggi misura (parse)**: da `"12,5 km"` ricava numero, unità e grandezza, e se vuoi converte.
- **Scrivi misura (format)**: da numero e unità fa `12,5 km`, anche scegliendo il prefisso (1500 m → 1,5 km).
- **Unità di una grandezza**: la lista delle unità, pronta per un menu di una finestra.

I fattori sono quelli esatti delle definizioni (pollice, libbra, gallone USA e imperiale…); temperature e consumi di carburante usano le loro formule. I risultati sono arrotondati a 12 cifre significative.

Gli errori (unità sconosciuta, unità di grandezze diverse, temperatura sotto lo zero assoluto…) escono dalla porta «Exception» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine`.
