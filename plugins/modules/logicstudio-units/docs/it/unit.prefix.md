# Prefissi SI (k, M, m, µ…)

`unit.prefix` · Unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Cambia il prefisso di un valore: da milli a micro, da unità a kilo, da mega a giga… Vale per **qualsiasi unità**, anche quelle che il pacchetto non ha come grandezza: volt, ampere, ohm, farad, henry, coulomb.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore, con il prefisso **Da**. Un testo con un numero (`"4,7"`) va bene. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il valore con il prefisso **A**. |
| **Exception** (`error`) | oggetto | Il valore non è un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Da** (`from`) | p, n, µ, m, c, d, (nessuno), da, h, k, M, G, T | (nessuno) | Il prefisso del valore che arriva. |
| **A** (`to`) | come **Da** | k | Il prefisso del risultato. |
| **Arrotonda** (`round`) | sì / no | no | Arrotonda il risultato. |
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali tenere. Si vede solo con **Arrotonda**. |

I prefissi:

| Prefisso | Nome | Vale |
|---|---|---|
| `p` | pico | 10⁻¹² |
| `n` | nano | 10⁻⁹ |
| `µ` | micro | 10⁻⁶ |
| `m` | milli | 10⁻³ |
| `c` | centi | 10⁻² |
| `d` | deci | 10⁻¹ |
| (nessuno) | — | 1 |
| `da` | deca | 10 |
| `h` | etto | 10² |
| `k` | kilo | 10³ |
| `M` | mega | 10⁶ |
| `G` | giga | 10⁹ |
| `T` | tera | 10¹² |

## Come funziona

A ogni valore che arriva il blocco lo moltiplica per il prefisso **Da** e lo divide per il prefisso **A**, poi arrotonda a 12 cifre significative. Sotto il titolo il blocco mostra i due prefissi, per esempio `none · k`.

Il blocco **non sa di che unità si parla**: è un semplice cambio di scala. Per le unità che il pacchetto conosce (m, g, L, W, Pa, Hz, B…) puoi usare anche il blocco della grandezza, che controlla le unità.

Sono i prefissi decimali del Sistema Internazionale. Per i prefissi binari dei dati (KiB, MiB…) c'è [Dati](unit.data).

## Esempi

### 1. Un condensatore da 4,7 µF in nanofarad

```
[Costante · Variabile: 4.7] valore ──▶ valore [Prefissi SI (k, M, m, µ…): µ · n] risultato ──▶ valore [Print (console.log)]
```

Scrive `4700`.

### 2. Da volt a kilovolt

Con **Da** (nessuno) e **A** `k`: 1500 → `1.5`; con **Da** `k` e **A** (nessuno): 2,2 → `2200`; con **Da** `M` e **A** `m`: 1 → `1000000000`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | Il valore non è un numero. |
| Prefisso sconosciuto | Un prefisso delle Proprietà non esiste in questa versione del pacchetto (uno schema fatto con una versione più nuova). |

## Vedi anche

- [Scrivi misura (format)](unit.format), che può scegliere da solo il prefisso giusto (1500 m → 1,5 km)
- [Dati](unit.data) per i prefissi binari (KiB, MiB…)
- [Grandezze e unità](logicstudio-units)
- [Come funziona un blocco](ide/blocks)
