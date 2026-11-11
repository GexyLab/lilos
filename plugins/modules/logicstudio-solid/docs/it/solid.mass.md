# Massa da volume e materiale

`solid.mass` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Calcola la massa e il peso di un volume di un materiale: 28 materiali con la densità tipica, oppure una densità tua.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume, nell'unità scelta in **Unità del volume**. Può essere 0. |
| **densità (kg/m³)** (`density`) | numero | La densità in kg/m³. Serve (e viene letto) solo con il materiale **Altro**; con gli altri materiali viene ignorato. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **massa (kg)** (`mass`) | numero | La massa in kg. |
| **peso (N)** (`weight`) | numero | Il peso in newton (massa × 9,80665). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **densità (kg/m³)** (`density`) | numero | La densità usata, in kg/m³. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Materiale** (`material`) | vedi la tabella sotto | Acciaio | Il materiale, con la sua densità (tabella sotto), oppure **Altro** per usare l'ingresso **densità**. |
| **Unità del volume** (`volumeUnit`) | m³ / L / cm³ / mm³ | m³ | In che unità arriva il volume: m³, litri (dm³), cm³ (mL) o mm³. |

Le opzioni di **Materiale**:

| Opzione | Nome interno |
|---|---|
| Acqua (4 °C) · 1000 kg/m³ | `water` |
| Acqua di mare · 1025 kg/m³ | `seawater` |
| Ghiaccio · 917 kg/m³ | `ice` |
| Aria (20 °C, 1 atm) · 1,204 kg/m³ | `air` |
| Acciaio · 7850 kg/m³ | `steel` |
| Acciaio inox · 8000 kg/m³ | `stainless` |
| Ferro · 7874 kg/m³ | `iron` |
| Ghisa · 7200 kg/m³ | `castIron` |
| Alluminio · 2700 kg/m³ | `aluminium` |
| Rame · 8960 kg/m³ | `copper` |
| Ottone · 8500 kg/m³ | `brass` |
| Bronzo · 8800 kg/m³ | `bronze` |
| Piombo · 11340 kg/m³ | `lead` |
| Zinco · 7140 kg/m³ | `zinc` |
| Titanio · 4506 kg/m³ | `titanium` |
| Oro · 19320 kg/m³ | `gold` |
| Argento · 10490 kg/m³ | `silver` |
| Calcestruzzo · 2400 kg/m³ | `concrete` |
| Mattone · 1800 kg/m³ | `brick` |
| Vetro · 2500 kg/m³ | `glass` |
| Marmo · 2700 kg/m³ | `marble` |
| Granito · 2750 kg/m³ | `granite` |
| Legno di quercia · 750 kg/m³ | `oak` |
| Legno di pino · 500 kg/m³ | `pine` |
| PLA (stampa 3D) · 1240 kg/m³ | `pla` |
| ABS · 1050 kg/m³ | `abs` |
| PVC · 1380 kg/m³ | `pvc` |
| Gomma · 1100 kg/m³ | `rubber` |
| Altro: l'ingresso «densità» | `custom` |

## Come funziona

Il blocco converte il volume in m³ e lo moltiplica per la densità:

- massa (kg) = volume (m³) × densità (kg/m³)
- peso (N) = massa × 9,80665
- 1 L = 0,001 m³; 1 cm³ = 0,000001 m³; 1 mm³ = 0,000000001 m³

Le densità sono valori tipici (la lega, l'umidità e la temperatura le fanno variare). Per un materiale che non c'è scegli **Altro** e collega la densità. L'ingresso **densità** è nascosto di serie: si mostra con l'occhio nelle Proprietà.

## Esempi

### 1. Un blocco di acciaio da 2 litri

```
[Costante · Variabile: 2] valore ──▶ volume  [Massa da volume e materiale: Acciaio, L] massa (kg) ──▶ valore [Print (console.log)]
                                                                                       peso (N) ──▶ valore [Print (console.log)]
```

Impostazioni: **Materiale** = Acciaio · 7850 kg/m³; **Unità del volume** = L (dm³).

Scrive queste righe, una per uscita:

```
15.7
153.964405
```

Il peso è nascosto di serie.

### 2. Un cubo di calcestruzzo da 1 m³, con la densità scelta nelle Proprietà

```
[Costante · Variabile: 1] valore ──▶ volume  [Massa da volume e materiale: Calcestruzzo, m³] massa (kg) ──▶ valore [Print (console.log)]
                                                                                             densità (kg/m³) ──▶ valore [Print (console.log)]
```

Impostazioni: **Materiale** = Calcestruzzo · 2400 kg/m³; **Unità del volume** = m³.

Scrive queste righe, una per uscita:

```
2400
2400
```

### 3. Un materiale tuo: 250 cm³ di una resina da 1180 kg/m³

```
[Costante · Variabile: 250] valore ──▶ volume            [Massa da volume e materiale: Altro: l'ingresso «densità», cm³] massa (kg) ──▶ valore [Print (console.log)]
[Costante · Variabile: 1180] valore ──▶ densità (kg/m³)
```

Impostazioni: **Materiale** = Altro: l'ingresso «densità»; **Unità del volume** = cm³ (mL).

Scrive `0.295`.

## Errori

| Messaggio | Quando |
|---|---|
| volume: serve un numero maggiore o uguale a 0 | Il volume non è un numero o è negativo. |
| densità: serve un numero maggiore di 0 (arrivato: …) | Con **Altro**, la densità non è un numero maggiore di 0. |

## Vedi anche

- [Cilindro](solid.cylinder) il volume di un cilindro
- [Parallelepipedo rettangolo](solid.cuboid) il volume di una scatola
- [Volume](unit.volume) per convertire il volume in un'altra unità prima
- [Massa](unit.mass) per convertire la massa in libbre, tonnellate…
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
