# Colore

`ui.color` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Una fila di sette quadratini colorati: l'utente ne sceglie uno, e la componente manda il suo codice (per esempio `#2a78d6`).

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra i colori. |
| **All'inizio** | un codice colore | `#2a78d6` (blu) | Il colore scelto quando la finestra si apre. Deve essere uno dei sette qui sotto, scritto uguale (minuscole comprese); altrimenti nessuno risulta scelto. |

I sette colori, sempre gli stessi:

| Codice | Colore |
|---|---|
| `#2a78d6` | blu |
| `#1baf7a` | verde |
| `#eda100` | giallo |
| `#e34948` | rosso |
| `#6250d6` | viola |
| `#eb6834` | arancione |
| `#6b7280` | grigio |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **colore** (`value`) | testo | Sceglie il colore con quel codice, senza che la componente mandi niente. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara e non si può più scegliere. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **colore** (`value`) | testo | Il codice del colore, quando l'utente ne sceglie uno. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

- Un clic su un quadratino lo sceglie e manda il suo codice, anche se era già scelto.
- Con la tastiera, le **frecce** passano al colore successivo o precedente **e lo scelgono**: ogni pressione manda un codice. Dall'ultimo si torna al primo.
- Non si possono scegliere altri colori: solo i sette della tabella.
- **Dallo schema**, **colore** sceglie il quadratino con quel codice esatto. `#2A78D6` (maiuscole), `blue` o `rgb(…)` non corrispondono a nessuno: nessun quadratino risulta scelto.
- **All'apertura** il programma non riceve il colore iniziale: se lo schema deve conoscerlo, dagli lo stesso codice con un blocco [Costante · Variabile](core.value).

## Esempi

### 1. Il colore di una nota

```
Finestra «Nota»
└ Colonna (radice)
  ├ Campo di testo  text1   Etichetta «Titolo»
  ├ Colore          color1  Etichetta «Colore»  All'inizio «#eda100»
  └ Pulsante        button1 Testo «Salva»
```

```
[Costante · Variabile: «#eda100»]       valore ──▶ colore [Oggetto { }] oggetto ──▶ contenuto [writeFile: ~/nota.json  JSON]
[Campo di testo: Titolo]  testo  ──▶ titolo
[Colore: Colore]          colore ──▶ colore
[Pulsante: Salva]         premuto ──▶ salva
```

Nel blocco [Oggetto { }](core.compose) i campi **colore** e **titolo** non avviano il blocco; **salva** sì. Il blocco [Costante · Variabile](core.value) iniziale dà al campo **colore** lo stesso giallo che si vede all'apertura. Premendo **Salva** il file contiene, per esempio, `{"colore":"#e34948","titolo":"Spesa","salva":true}`.

### 2. Una priorità a colori

```
[Colore: Priorità] colore ──▶ valore [Switch · Case] #e34948    ──▶ invia [Costante · Variabile: «Urgente»]  valore ──▶ testo [Etichetta: label1]
                                            altrimenti ──▶ invia [Costante · Variabile: «Normale»]  valore ──▶ testo [Etichetta: label1]
```

Aggiungi al blocco [Switch · Case](core.switch) un'uscita chiamata `#e34948`, uguale al codice del rosso. Scegliendo il rosso l'etichetta dice «Urgente»; con qualsiasi altro colore dice «Normale». I due blocchi [Costante · Variabile](core.value) hanno l'ingresso **invia** collegato, quindi mandano il testo solo quando cambia il colore.

## Accessibilità e tastiera

- I colori sono un gruppo di scelte: **Tab** entra nel gruppo (sul colore scelto), le **frecce** si muovono e scelgono, **Tab** esce.
- Per un lettore di schermo ogni quadratino si chiama con il suo codice (`#2a78d6`), non con il nome del colore; passando il mouse si vede lo stesso codice. L'**Etichetta** sopra non è collegata al gruppo.

## Vedi anche

- [Pulsanti di opzione](ui.radios)
- [Spia](ui.lamp), che ha quattro colori suoi
- [Componenti UI standard](logicstudio-ui)
