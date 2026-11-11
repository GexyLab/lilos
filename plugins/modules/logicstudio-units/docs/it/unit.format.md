# Scrivi misura (format)

`unit.format` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Fa un testo con un numero e la sua unità, come `12,5 km` o `21,5 °C`, con i decimali che vuoi. Se vuoi, sceglie da solo il prefisso più comodo: 1500 m diventa `1,5 km`, 0,0042 s diventa `4,2 ms`.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il numero da scrivere. Un testo con un numero (`"2,5"`) va bene. |
| **unità** (`unit`) | testo | L'unità da scrivere dopo il numero: **qualsiasi** testo, anche un'unità che il pacchetto non ha (`V`, `Ω`, `%`). Facoltativa: senza unità il blocco scrive solo il numero. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | La misura scritta. |
| **Exception** (`error`) | oggetto | Il valore non è un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Decimali** (`decimals`) | da 0 a 10 | 2 | Quanti decimali scrivere al massimo. |
| **Togli gli zeri finali** (`trim`) | sì / no | sì | Con **sì** `12.50` diventa `12.5` e `3.00` diventa `3`; con **no** i decimali sono sempre quelli scelti. |
| **Separatore decimale** (`separator`) | `.` (12.5) o `,` (12,5) | `.` | Il segno dei decimali. Le migliaia non sono separate. |
| **Scegli il prefisso** (`auto`) | sì / no | no | Cambia il prefisso dell'unità perché il numero stia tra 1 e 1000 (vedi sotto). |

## Come funziona

Il blocco aspetta il **valore**; a ogni valore, o a ogni cambio di unità, scrive il numero con i decimali scelti (arrotondando), poi uno spazio e l'unità. Dopo `°` (angoli), `′`, `″` e `%` lo spazio non c'è: `3°`, `45%`. Dopo `°C` e `°F` c'è, come vuole il Sistema Internazionale: `21,5 °C`. Un numero che arrotondato vale zero è scritto `0`, mai `-0`.

L'unità è scritta **così come arriva**: il blocco non la cambia nemmeno se ha un altro modo di scriverla (`m2` resta `m2`). Per avere il simbolo del pacchetto passa prima da [Leggi misura (parse)](unit.parse).

### Scegli il prefisso

Con **Scegli il prefisso** il blocco cambia il prefisso dell'unità, se l'unità lo permette, così che il numero stia **tra 1 e 1000**:

| Unità (anche con un prefisso, come `cm`, `kg`, `mA`) | Prefissi che il blocco usa |
|---|---|
| `m` | n, µ, m, (nessuno), k |
| `g` | µ, m, (nessuno), k |
| `s` | n, µ, m, (nessuno) |
| `L` | µ, m, (nessuno) |
| `B`, `bit` | (nessuno), k, M, G, T (decimali: 1 kB = 1000 B) |
| `W`, `J`, `N`, `Pa`, `Hz`, `V`, `A`, `Ω`, `F`, `H`, `Wh`, `eV` | p, n, µ, m, (nessuno), k, M, G, T |

- I prefissi limitati evitano scritture strane: 1500 kg resta `1500 kg` (non `1,5 Mg`), 7200 s resta `7200 s` (per le ore c'è [Tempo](unit.time)).
- Una misura in centimetri o decilitri può tornare a un prefisso dell'elenco: 150 cm → `1,5 m`.
- Le altre unità (`°C`, `ft`, `km/h`, `m²`, `dB`…) restano come sono.
- Il valore 0 resta nell'unità che arriva.

## Esempi

### 1. Una temperatura con un decimale

```
[Costante · Variabile: 21.456] valore ──▶ valore [Scrivi misura (format)] testo ──▶ testo [Etichetta]
```

Con **unità** `°C` (valore iniziale dell'ingresso), **Decimali** 1 e **Separatore decimale** `,`, l'etichetta mostra `21,5 °C`.

### 2. Una distanza con il prefisso giusto

Con **Scegli il prefisso**:

| valore | unità | testo |
|---|---|---|
| 1500 | `m` | `1.5 km` |
| 150 | `cm` | `1.5 m` |
| 0.0042 | `s` | `4.2 ms` |
| 2500000 | `B` | `2.5 MB` |
| 0.0047 | `F` | `4.7 mF` |
| 1500 | `kg` | `1500 kg` |
| 12 | `ft` | `12 ft` |

### 3. Una conversione da mostrare

```
[Campo numerico] valore ──▶ valore [Lunghezza: km · mi] risultato ──▶ valore [Scrivi misura (format)] testo ──▶ testo [Etichetta]
```

Con **unità** `mi`, 10 km danno `6.21 mi`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | Il valore non è un numero. |

## Vedi anche

- [Leggi misura (parse)](unit.parse), che fa il contrario
- [Prefissi SI (k, M, m, µ…)](unit.prefix) per cambiare il prefisso di un numero
- [Template (formatta)](core.format) per testi più complessi
- [Come funziona un blocco](ide/blocks)
