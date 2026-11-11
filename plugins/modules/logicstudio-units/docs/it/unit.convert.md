# Converti (da · a)

`unit.convert` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Converte un valore da un'unità a un'altra, con le due unità che arrivano **come testo** (`"km/h"`, `"m/s"`). Riconosce da solo la grandezza e funziona con tutte le unità del pacchetto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore da convertire. Un testo con un numero (`"2,5"`) va bene. |
| **da** (`from`) | testo | L'unità in cui arriva il valore, per esempio `"km/h"`. |
| **a** (`to`) | testo | L'unità in cui va convertito, per esempio `"m/s"`. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il valore nell'unità **a**. |
| **grandezza** (`quantity`) | testo | La grandezza delle due unità, con il suo `id` (`speed`, `length`…: vedi la tabella in [Grandezze e unità](logicstudio-units)). |
| **Exception** (`error`) | oggetto | Unità sconosciuta, unità di grandezze diverse, valore che non è un numero, e gli errori propri di temperature e consumi. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

## Come funziona

Il blocco aspetta di avere **tutti e tre gli ingressi**; poi, a ogni nuovo valore o a ogni cambio di unità, converte e manda **risultato** e **grandezza**.

- Le unità si scrivono con il **simbolo** esatto (maiuscole e minuscole contano: `kN` è il kilonewton, `kn` il nodo) o con uno degli altri modi elencati nella colonna **Si scrive anche** della pagina di ogni grandezza (`m2` per `m²`, `C` per `°C`, `kmh` per `km/h`). Gli spazi prima e dopo non contano.
- Le due unità devono essere della **stessa grandezza**: da `km` a `kg` dà un'eccezione.
- Il calcolo è lo stesso dei blocchi delle singole grandezze, anche per temperature e consumi, e il risultato è arrotondato a 12 cifre significative.
- Se le unità non cambiano mai, è più comodo il blocco della grandezza ([Lunghezza](unit.length), [Temperatura](unit.temperature)…), dove le unità si scelgono da un menu.

Le unità di **da** e **a** si possono anche scrivere come **valore iniziale** degli ingressi nelle Proprietà: così basta collegare il valore.

## Esempi

### 1. Un valore con le unità scritte nelle Proprietà

**da** ha valore iniziale `km/h`, **a** ha `m/s`:

```
[Costante · Variabile: 36] valore ──▶ valore [Converti (da · a)] risultato ──▶ valore [Print (console.log)]
```

Scrive `10`; **grandezza** manda `speed`.

### 2. Le unità scelte in una finestra

Due [Selezioni](ui.select) riempite da [Unità di una grandezza](unit.list) scelgono le unità; un [Campo numerico](ui.number) dà il valore:

```
[Campo numerico] valore ──▶ valore [Converti (da · a)] risultato ──▶ valore [Scrivi misura (format)] testo ──▶ testo [Etichetta]
[Selezione: da]  valore ──▶ da
[Selezione: a]   valore ──▶ a
```

Con 25, `°C` e `°F` l'etichetta mostra `77`.

### 3. Unità diverse

- `1`, `"m2"`, `"cm²"` → `10000`, grandezza `area`;
- `1`, `" kg "`, `"lbs"` → `2.20462262185`;
- `1`, `"km"`, `"kg"` → eccezione «Unità incompatibili: «km» (lunghezza) e «kg» (massa)».

## Errori

| Messaggio | Quando |
|---|---|
| Unità sconosciuta: «…» | **da** o **a** non è un simbolo, né un altro modo di scrivere un'unità, del pacchetto. Per esempio `gal`: si scrive `gal US` o `gal UK`. |
| Unità incompatibili: «…» (…) e «…» (…) | Le due unità sono di grandezze diverse; il messaggio dice quali. |
| Serve un numero | Il valore non è un numero. |
| Temperatura sotto lo zero assoluto | Una temperatura sotto 0 K. |
| Il consumo deve essere maggiore di zero | Un consumo di carburante 0 o negativo. |

## Vedi anche

- [Leggi misura (parse)](unit.parse) per un testo con numero e unità insieme (`"12,5 km"`)
- [Unità di una grandezza](unit.list) per riempire un menu con le unità
- [Grandezze e unità](logicstudio-units), tutte le grandezze e i loro simboli
- [Come funziona un blocco](ide/blocks)
