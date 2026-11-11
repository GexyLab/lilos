# Get proprietà (obj.campo)

`core.get` · Oggetti · [Blocchi di base](logicstudio-core) · versione 1

Prende un campo da un oggetto (o un elemento da una lista) e lo manda. Il campo si indica con un percorso come `indirizzo.città` o `voti.0`.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **oggetto** (`object`) | oggetto | L'oggetto (o la lista) da cui prendere il campo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore del campo, così com'è: numero, testo, sì/no, oggetto, lista o `null`. |
| **Exception** (`error`) | oggetto | Quando il campo non c'è. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Campo (a.b.0)** (`path`) | un testo (fino a 2000 caratteri) | vuoto | Il percorso del campo: i nomi separati da un punto; per un elemento di una lista, la sua posizione contando da 0. |

## Come funziona

Ogni volta che arriva un valore su **oggetto**, il blocco segue il percorso scritto in **Campo** un pezzo alla volta e manda quello che trova su **valore**.

Come si legge il percorso:

- I pezzi sono separati da un **punto**: `cliente.indirizzo.città` vuol dire «il campo `città` del campo `indirizzo` del campo `cliente`».
- In una **lista**, un pezzo fatto solo di cifre è una **posizione**, contando da **0**: `voti.0` è il primo voto, `voti.2` il terzo.
- `lunghezza` di una lista: il pezzo `length` dà quanti elementi ha. Con `voti` = `[7, 9, 10]`, il campo `voti.length` vale 3.
- I punti in più non contano: `a..b` e `.a.b.` valgono come `a.b`.
- Gli **spazi contano** e le maiuscole pure: ` nome` (con lo spazio davanti) e `Nome` non trovano il campo `nome`.
- Un nome di campo che contiene un punto non si raggiunge: il punto viene sempre letto come separatore.
- Le posizioni negative (`voti.-1`) non esistono: danno l'errore.
- Il campo può anche avere un nome fatto di cifre in un oggetto: in `{"0": "zero"}` il campo `0` vale `"zero"`.

Casi particolari:

- **Campo vuoto**: il blocco manda l'oggetto intero, senza cambiarlo (qualunque cosa sia arrivata, anche un testo o un numero).
- Un campo che esiste e vale **`null`** viene mandato: su **valore** esce `null`, e non è un errore.
- Se il campo **non c'è**, il blocco non manda niente su **valore** e manda su **Exception** il messaggio «Il campo «*percorso*» non esiste».
- Se a metà percorso si incontra qualcosa che non è un oggetto o una lista (un testo, un numero, `null`), il campo non c'è: per esempio `nome.length` con `nome` = `"Ada"` dà l'errore. Per la lunghezza di un testo usa il blocco [Funzioni stringa](core.text).
- Un **testo JSON** (per esempio quello letto da un file) non è un oggetto: `{"a":1}` scritto come testo dà l'errore. Prima trasformalo con il blocco [Cast (converti tipo)](core.convert), impostazione **In** = «da testo JSON».

Il percorso è fisso, nelle impostazioni: non c'è un ingresso per cambiarlo mentre il programma gira. Per prendere un elemento a una posizione che cambia usa il blocco [Leggi lista[i]](coll.get) del pacchetto Liste. Per le regole generali (ingressi, «lo avvia», Exception) vedi [Come funziona un blocco](ide/blocks).

## Esempi

Negli esempi l'oggetto che arriva è:

```
{"nome": "Ada", "indirizzo": {"città": "Roma"}, "voti": [7, 9, 10], "note": null}
```

### 1. Un campo e un campo dentro un campo

| Campo | Cosa esce |
|---|---|
| `nome` | `"Ada"` su **valore** |
| `indirizzo.città` | `"Roma"` su **valore** |
| `indirizzo` | l'oggetto `{"città": "Roma"}` su **valore** |
| `note` | `null` su **valore** |
| *(vuoto)* | l'oggetto intero su **valore** |
| `telefono` | niente su **valore**; su **Exception** «Il campo «telefono» non esiste» |

### 2. Un elemento di una lista e la sua lunghezza

| Campo | Cosa esce |
|---|---|
| `voti.0` | 7 |
| `voti.2` | 10 |
| `voti.3` | errore: «Il campo «voti.3» non esiste» |
| `voti.length` | 3 |

Se l'oggetto che arriva è una lista di oggetti, per esempio `[{"a": 5}, {"a": 8}]`, il campo `1.a` vale 8.

### 3. Una risposta JSON letta da un file

```
[readFile] contenuto ──▶ valore [Cast (converti tipo): da testo JSON] risultato ──▶ oggetto [Get proprietà (obj.campo): impostazioni.lingua] valore ──▶ valore [Print (console.log)]
```

Il blocco [readFile](lilos.fileRead) ha il **Formato** testo. Se il file contiene `{"impostazioni": {"lingua": "it"}}`, la console scrive `it`. Senza il blocco [Cast (converti tipo)](core.convert) il blocco riceverebbe un testo e darebbe l'errore (in alternativa, scegli il **Formato** JSON in readFile e togli il Cast).

### 4. Gestire un campo che a volte manca

```
[Get proprietà (obj.campo): sconto] valore    ──▶ valore [Print (console.log)]
                       Exception ──▶ invia  [Costante · Variabile: 0] valore ──▶ valore [Print (console.log)]
```

Quando lo sconto c'è, la console lo scrive; quando manca, al posto dell'errore nella console principale esce `0`: il blocco [Costante · Variabile](core.value) ha l'ingresso **invia** collegato, quindi manda il suo `0` solo quando arriva l'errore.

## Errori

| Messaggio | Quando |
|---|---|
| Il campo «*percorso*» non esiste | Il percorso non porta a niente: un nome che non c'è, una posizione oltre la fine della lista, un pezzo che passa da un testo o da un numero, oppure è arrivato un testo invece di un oggetto. |

## Vedi anche

- [Destruttura oggetto](core.decompose) per prendere più campi alla volta
- [Oggetto { }](core.compose) per fare l'opposto
- [Leggi lista[i]](coll.get) ed [Map campo](coll.pluck) per le liste
- [Cast (converti tipo)](core.convert) per trasformare un testo JSON in oggetto
- [Come funziona un blocco](ide/blocks)
