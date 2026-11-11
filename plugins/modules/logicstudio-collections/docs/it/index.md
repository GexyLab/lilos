# Liste e matrici

`logicstudio-collections` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per lavorare con **liste** (elenchi di valori) e **matrici** (tabelle di numeri o di altri valori): prendere e cambiare elementi, ordinare, filtrare, sommare, scorrere una lista un elemento alla volta, raccogliere valori, e i calcoli sulle matrici (somma, prodotto, trasposta, determinante).

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-collections` («Logic Studio: i blocchi per liste e matrici…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nelle categorie **Liste** e **Matrici**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

### Liste

| Blocco | Cosa fa |
|---|---|
| [Length](coll.length) | Quanti elementi ha una lista. |
| [Leggi lista[i]](coll.get) | L'elemento in una posizione. |
| [Scrivi lista[i]](coll.set) | Sostituisce l'elemento in una posizione. |
| [Push · Unshift](coll.add) | Aggiunge un valore in fondo o all'inizio. |
| [Inserisci (splice)](coll.insert) | Inserisce un valore in una posizione, spostando gli altri. |
| [Rimuovi (splice)](coll.removeAt) | Toglie l'elemento in una posizione e lo manda a parte. |
| [Slice](coll.slice) | Un pezzo della lista, da una posizione a un'altra. |
| [Concat liste](coll.concat) | Mette in fila due o più liste (ingressi aggiungibili). |
| [Includes · IndexOf](coll.contains) | Se un valore c'è, e dove. |
| [Reverse](coll.reverse) | La lista al contrario. |
| [Sort](coll.sort) | In ordine crescente o decrescente, anche secondo un campo degli oggetti. |
| [Distinct](coll.unique) | Toglie i doppioni. |
| [Filter](coll.filter) | Tiene gli elementi che rispettano una condizione, e manda a parte gli altri. |
| [Map campo](coll.pluck) | Da una lista di oggetti, la lista di un loro campo. |
| [Sum · Min · Max · Avg](coll.stat) | Un calcolo sui numeri della lista. |
| [Range](coll.range) | Una lista di numeri da… a…, con un passo. |
| [Split](coll.split) | Taglia un testo in una lista di pezzi. |
| [Join](coll.join) | Fa un testo con gli elementi di una lista. |
| [For each](coll.forEach) | Manda gli elementi uno alla volta, poi **fatto**. |
| [Accumula (push con limite)](coll.accumulate) | Raccoglie in una lista i valori che arrivano, tenendo gli ultimi N. |
| [Random](coll.random) | Estrae un elemento a caso. |

### Matrici

| Blocco | Cosa fa |
|---|---|
| [Nuova matrice (fill)](coll.matNew) | Una matrice di righe × colonne con tutte le celle uguali. |
| [Shape](coll.matSize) | Quante righe e quante colonne. |
| [Leggi m[r][c]](coll.matGet) | Il valore di una cella. |
| [Scrivi m[r][c]](coll.matSet) | Cambia il valore di una cella. |
| [Riga m[r]](coll.matRow) | Una riga, come lista. |
| [Colonna m[][c]](coll.matCol) | Una colonna, come lista. |
| [Transpose](coll.matTranspose) | Scambia righe e colonne. |
| [A + B](coll.matAdd) | Somma cella per cella. |
| [A − B](coll.matSubtract) | Sottrazione cella per cella. |
| [A × B](coll.matMultiply) | Prodotto righe per colonne. |
| [Scala (k·A)](coll.matScale) | Moltiplica ogni cella per un numero. |
| [Identità (eye)](coll.matIdentity) | La matrice identità n × n. |
| [Det](coll.matDet) | Il determinante, fino a 10 × 10. |
| [Reshape](coll.matFromList) | Taglia una lista in righe. |
| [Flatten](coll.matFlatten) | Mette in fila le celle in una lista. |

## Le liste

Una **lista** è un elenco ordinato di valori, scritto in JSON tra parentesi quadre: `[10, 20, 30]`, `["Anna", "Bruno"]`. Gli elementi possono essere di tipi diversi, anche `null`, oggetti e altre liste: `[1, "due", null, {"n": 3}, [4, 5]]`.

Una lista si può avere:

- da un blocco [Costante · Variabile](core.value) di tipo **JSON**, scrivendo per esempio `[3, 1, 2]`;
- come **valore iniziale** di un ingresso (nelle Proprietà): `[3, 1, 2]` viene letto come lista;
- da [Lista [ ]](core.list), che fa una lista con i valori dei suoi ingressi;
- dai blocchi di questo pacchetto ([Range](coll.range), [Split](coll.split), [Accumula (push con limite)](coll.accumulate)…) e da altri blocchi e componenti (righe di una [Tabella](ui.table), file letti…).

**Un testo non è una lista**, e nemmeno un oggetto: un blocco che vuole una lista e riceve altro manda «Serve una lista» sull'**Eccezione**.

**I blocchi non cambiano mai la lista che ricevono**: mandano sempre una copia nuova. Se la stessa lista va a più blocchi, ognuno la vede com'era. Per «tenere» una lista che cambia, rimanda il risultato in un blocco [Memoria (set · get)](core.store), o usa [Accumula (push con limite)](coll.accumulate).

## Le matrici

Una **matrice** è una lista di **righe**, dove ogni riga è una lista e **tutte le righe hanno la stessa lunghezza**:

```
[[1, 2, 3],
 [4, 5, 6]]
```

è una matrice di 2 righe e 3 colonne (2 × 3). La cella in riga 1, colonna 2 vale 6.

Regole:

- almeno **una riga** e almeno **una colonna**: `[]` e `[[]]` non sono matrici;
- ogni elemento è una lista: `[1, 2]` non è una matrice (è una lista di numeri), ma `[[1, 2]]` sì (1 × 2);
- le righe devono avere la **stessa lunghezza**: `[[1, 2], [3]]` dà «Le righe della matrice devono avere tutte la stessa lunghezza». Non c'è un modo «tollerante»: le matrici non rettangolari non vanno in nessun blocco delle matrici;
- per leggere e scrivere celle, righe e colonne, trasporre, appiattire, le celle possono contenere **qualsiasi valore** (testi, `null`…);
- per i **calcoli** ([A + B](coll.matAdd), [A − B](coll.matSubtract), [A × B](coll.matMultiply), [Scala (k·A)](coll.matScale), [Det](coll.matDet)) le celle devono essere **numeri veri**: un testo come `"2"` dà «La matrice deve contenere solo numeri». In questo le matrici sono più severe delle liste (vedi sotto).

**Matrici e liste insieme.** Una matrice è anche una lista (di righe): i blocchi delle liste ci lavorano sopra riga per riga. [Length](coll.length) dà il numero di righe, [Leggi lista[i]](coll.get) una riga, [Concat liste](coll.concat) mette le righe di una matrice sotto quelle di un'altra. Le porte di tipo matrice e quelle di tipo lista sono diverse: l'IDE segnala un collegamento da matrice a lista (o al contrario), ma il valore passa lo stesso. Vedi [Collegamenti](ide/links).

## Gli indici

**Le posizioni partono da 0**: in `["a", "b", "c"]` l'elemento 0 è `"a"`, l'1 è `"b"`, il 2 è `"c"`. Lo stesso per le righe e le colonne delle matrici, e per l'uscita **indice** di [For each](coll.forEach), [Includes · IndexOf](coll.contains) ed [Random](coll.random).

**Un indice negativo conta dalla fine**: -1 è l'ultimo, -2 il penultimo… fino a -lunghezza, che è il primo.

Cosa succede **fuori dai limiti** dipende dal blocco:

| Blocchi | Indici validi (lista di lunghezza N) | Fuori |
|---|---|---|
| [Leggi lista[i]](coll.get), [Scrivi lista[i]](coll.set), [Rimuovi (splice)](coll.removeAt), [Leggi m[r][c]](coll.matGet), [Scrivi m[r][c]](coll.matSet), [Riga m[r]](coll.matRow), [Colonna m[][c]](coll.matCol) | da 0 a N-1, da -1 a -N | errore «Indice fuori dalla lista» (anche per righe e colonne) |
| [Inserisci (splice)](coll.insert) | da 0 a **N** (N = in fondo), da -1 a -N (-1 = prima dell'ultimo) | errore «Indice fuori dalla lista» |
| [Slice](coll.slice) | qualsiasi intero | **nessun errore**: la posizione viene portata all'inizio o alla fine |

**Come viene letto un indice.** Dev'essere un **intero**. Si accettano anche:

- testi con un numero: `"2"`, e con la virgola decimale `"1,0"` (che vale 1);
- `true` (1) e `false` (0);
- `""` e `null`, che valgono **0** (il primo elemento): non sono un errore.

Un numero con la parte decimale (`1.5`) o un testo che non è un numero (`"due"`) danno «Indice: serve un numero intero» (o «Da: …», «A: …», «Righe: …», «Colonne: …», «Dimensione: …», secondo l'ingresso).

## I campi degli oggetti

[Sort](coll.sort), [Distinct](coll.unique), [Filter](coll.filter), [Map campo](coll.pluck) e [Sum · Min · Max · Avg](coll.stat) hanno l'impostazione **Campo**, per lavorare su liste di oggetti:

- `prezzo` prende il campo `prezzo` di ogni elemento;
- `indirizzo.città` scende di un livello per ogni punto;
- un numero prende un elemento di una lista: `0` è il primo valore di ogni riga;
- un elemento che non ha il campo (o non è un oggetto) ha valore «niente»: ogni blocco dice nella sua pagina come lo tratta;
- un campo che ha un punto nel nome non si può indicare.

## Numeri e confronti

I blocchi delle liste leggono i numeri degli elementi così:

| Valore | È un numero? |
|---|---|
| `4`, `-2.5` | sì |
| `"7"`, `" 3 "`, `"2,5"`, `"1e3"` | sì (7, 3, 2,5, 1000): i testi con un numero valgono quel numero, la prima virgola vale come punto |
| `"1,000"` | sì, ma vale **1**, non mille |
| `true`, `false`, `null`, `""`, `"abc"`, oggetti, liste | no |

Gli ingressi di tipo numero (indici, **da**, **a**, **passo**, **fattore**…) sono un po' più larghi: `true` vale 1, `false` 0, `""` e `null` valgono 0.

**Uguaglianza.** [Includes · IndexOf](coll.contains), [Distinct](coll.unique) e «contiene» di [Filter](coll.filter) su una lista confrontano i valori **senza conversioni**: `2` e `"2"` sono diversi, `"Roma"` e `"roma"` sono diversi. Liste e oggetti sono uguali se hanno lo stesso contenuto **con i campi nello stesso ordine**: `{"a":1,"b":2}` e `{"b":2,"a":1}` risultano diversi. [Filter](coll.filter) con =, ≠, >, <… invece converte: `5 = "5"` è vero.

## Quando un blocco lavora

Valgono le regole di tutti i blocchi ([Come funziona un blocco](ide/blocks)): ogni valore che arriva resta come valore di quell'ingresso, e se l'ingresso «lo avvia» il blocco gira con l'ultimo valore di ogni ingresso.

- I blocchi di questo pacchetto **aspettano in silenzio** finché non hanno tutti gli ingressi obbligatori: niente uscita e niente errore. Fanno eccezione [For each](coll.forEach), che dà «Manca la lista» se riceve **avvia** senza lista, e gli ingressi facoltativi (**da** e **a** di [Slice](coll.slice), **da** e **passo** di [Range](coll.range), **valore** di [Filter](coll.filter), **riempimento** di [Nuova matrice (fill)](coll.matNew), tutti gli ingressi di [Concat liste](coll.concat)).
- Con due ingressi che «lo avviano», il blocco gira a ogni arrivo: quando all'avvio arrivano due valori, il primo risultato è fatto con un ingresso solo (o non c'è, se l'altro è obbligatorio). Togli «lo avvia» dall'ingresso che non deve far ripartire il blocco.
- Ciò che va storto esce sull'**Eccezione** del blocco come `{ message, block, schema, at }`; se l'Eccezione non è collegata, nella console principale compare una riga come «Leggi lista[i]: Indice fuori dalla lista» (il nome del blocco, poi il messaggio).

## Limiti

- **100000 elementi.** I blocchi che allungano una lista ([Push · Unshift](coll.add), [Inserisci (splice)](coll.insert), [Concat liste](coll.concat), [Range](coll.range), [Split](coll.split), [Accumula (push con limite)](coll.accumulate)) non fanno liste di più di 100000 elementi: «Lista troppo grande (massimo 100000 elementi)». Una lista più lunga che arriva da fuori (per esempio da un file) viene comunque trattata dagli altri blocchi.
- **100000 celle.** [Nuova matrice (fill)](coll.matNew), [Identità (eye)](coll.matIdentity) (fino a 316 × 316), [A × B](coll.matMultiply) e [Reshape](coll.matFromList) non fanno matrici di più di 100000 celle: «Matrice troppo grande (massimo 100000 celle)».
- **Determinante fino a 10 × 10.**
- **Esecuzioni.** Il motore ferma un programma che fa più di 10000 esecuzioni di blocchi in 10 secondi (di serie; un amministratore può cambiarlo). [For each](coll.forEach) su una lista lunga fa girare i blocchi collegati una volta per elemento: con qualche migliaio di elementi si arriva al limite. Vedi [Limiti](logicstudio-engine/limits).
- **Tempo.** Un blocco che lavora più di 30 secondi (di serie) viene fermato con un errore.

## Esempi completi

### 1. La media dei voti scritti in un campo

Una finestra con un [Campo di testo](ui.text) e un [Valore mostrato](ui.value); nello schema:

```
[Campo di testo: voti] testo ──▶ testo [Split: ;] risultato ──▶ lista [Filter: a ≠ b, Valore vuoto] risultato ──▶ lista [Sum · Min · Max · Avg: media] risultato ──▶ valore [Valore mostrato: media]
```

- **Split** con separatore `;` (non la virgola, che serve per i decimali) e **Togli gli spazi ai lati** acceso;
- **Filter** con «a ≠ b» e **Valore** vuoto toglie i pezzi vuoti (per esempio dopo un `;` finale);
- **Sum · Min · Max · Avg** con **Operazione** media.

Scrivendo `7,5; 8; 6;` i pezzi sono `["7,5", "8", "6", ""]`, il filtro toglie `""` e il Valore mostrato indica 7,1666… Scrivendo `7; otto` compare l'errore «Serve un numero in ogni elemento» e la media resta quella di prima.

### 2. I prodotti sotto un prezzo, dal più caro

```
[Costante · Variabile (JSON): catalogo]             valore ──▶ lista [Filter: prezzo ≤ b] risultato ──▶ lista [Sort: prezzo, decrescente] risultato ──▶ lista [Map campo: nome] risultato ──▶ lista [Join] testo ──▶ valore [Print (console.log)]
[Campo numerico: prezzo massimo]      valore ──▶ valore (facoltativo) [Filter]
```

Il catalogo è `[{"nome":"Penna","prezzo":2.5},{"nome":"Zaino","prezzo":35},{"nome":"Quaderno","prezzo":4},{"nome":"Astuccio","prezzo":12}]`.

- **Filter**: **Tieni gli elementi** «a ≤ b», **Campo** `prezzo`, **Valore** `20` (il limite finché l'utente non scrive);
- **Sort**: **Campo** `prezzo`, **Ordine** decrescente;
- **Map campo**: **Campo** `nome`;
- **Join** con il separatore predefinito.

All'avvio la console scrive `Astuccio, Quaderno, Penna`. Se l'utente scrive 10 nel campo numerico: `Quaderno, Penna`. Se scrive 1: una riga vuota (nessun prodotto, e [Join](coll.join) di una lista vuota dà un testo vuoto).

### 3. Prodotto di una matrice per la sua trasposta, e determinante

```
[Costante · Variabile (JSON): [1,2,3,4]] valore ──▶ lista [Reshape (colonne 2)] matrice ──▶ a [A × B] risultato ──▶ matrice [Det] determinante ──▶ valore [Print (console.log)]
                                                                           matrice ──▶ matrice [Transpose] matrice ──▶ b [A × B]
```

- **Reshape** con **colonne** 2 fa `M = [[1,2],[3,4]]`;
- **Transpose** fa `[[1,3],[2,4]]`;
- **A × B** fa `M × Mᵀ = [[5,11],[11,25]]`;
- **Det** scrive `4`, cioè (-2)², il quadrato del determinante di M.

Collegando un blocco [Shape](coll.matSize) al risultato del prodotto ottieni 2 righe e 2 colonne.

### 4. Media mobile e massimo delle ultime 10 letture

```
[Intervallo (setInterval): 1 secondo] impulso ──▶ leggi [Memoria (set · get)] valore ──▶ aggiungi [Accumula (push con limite): massimo 10] lista ──▶ lista [Sum · Min · Max · Avg: media]   risultato ──▶ valore [Valore mostrato: media]
                                                                                              lista ──▶ lista [Sum · Min · Max · Avg: massimo] risultato ──▶ valore [Valore mostrato: picco]
                                                                                              lista ──▶ dati  [Linee]
[Campo numerico: lettura] valore ──▶ imposta [Memoria (set · get)]
```

Ogni secondo l'ultima lettura entra in [Accumula (push con limite)](coll.accumulate), che tiene le ultime 10; media, massimo e grafico [Linee](charts.line) si aggiornano insieme. Dai all'ingresso **imposta** del blocco Memoria (set · get) il valore iniziale 0: altrimenti, finché il campo è vuoto, il blocco Memoria manda `null` e i due calcoli danno «Serve un numero in ogni elemento».

## Errori di questo pacchetto

| Messaggio | Blocchi |
|---|---|
| Serve una lista | tutti quelli con un ingresso lista |
| Lista troppo grande (massimo 100000 elementi) | Push · Unshift, Inserisci (splice), Concat liste, Range, Split |
| Indice: serve un numero intero | Leggi lista[i], Scrivi lista[i], Inserisci (splice), Rimuovi (splice), Leggi m[r][c], Scrivi m[r][c], Riga m[r], Colonna m[][c] |
| Da: serve un numero intero · A: serve un numero intero | Slice |
| Indice fuori dalla lista | Leggi lista[i], Scrivi lista[i], Inserisci (splice), Rimuovi (splice), Leggi m[r][c], Scrivi m[r][c], Riga m[r], Colonna m[][c] |
| Serve un numero in ogni elemento | Sort, Sum · Min · Max · Avg |
| Lista vuota | Sum · Min · Max · Avg (minimo, massimo, media), Random |
| Indica il campo da estrarre | Map campo |
| Serve un numero | Range, Scala (k·A) |
| Il passo non può essere zero | Range |
| Manca la lista | For each |
| Serve una matrice | tutti i blocchi delle matrici con un ingresso matrice |
| Le righe della matrice devono avere tutte la stessa lunghezza | tutti i blocchi delle matrici con un ingresso matrice |
| La matrice deve contenere solo numeri | A + B, A − B, A × B, Scala (k·A), Det |
| Le matrici devono avere le stesse dimensioni (R×C e R×C) | A + B, A − B |
| Prodotto impossibile: le colonne di A (K) devono essere quante le righe di B (N) | A × B |
| Righe: serve un numero intero · Colonne: serve un numero intero | Nuova matrice (fill), Reshape (solo Colonne) |
| Dimensione: serve un numero intero | Identità (eye) |
| Righe e colonne devono essere interi maggiori di zero | Nuova matrice (fill), Identità (eye), Reshape |
| Matrice troppo grande (massimo 100000 celle) | Nuova matrice (fill), Identità (eye), A × B, Reshape |
| La matrice deve essere quadrata | Det |
| Determinante: al massimo 10×10 | Det |
| La lista (N elementi) non si divide in righe di C | Reshape |

## Vedi anche

- [Blocchi di base](logicstudio-core): [Lista [ ]](core.list), [Get proprietà (obj.campo)](core.get), [Costante · Variabile](core.value), [Memoria (set · get)](core.store)
- [Come funziona un blocco](ide/blocks), [Collegamenti](ide/links)
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits)
