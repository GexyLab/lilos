# Destruttura oggetto

`core.decompose` · Oggetti · [Blocchi di base](logicstudio-core) · versione 1

Divide un oggetto nei suoi campi: ogni uscita che aggiungi manda il campo con il suo nome.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **oggetto** (`object`) | oggetto | L'oggetto (o la lista) da scomporre. |

## Uscite

Il blocco nasce **senza uscite** (a parte l'Eccezione): aggiungi un'uscita per ogni campo che ti serve (vedi **Porte aggiuntive**).

| Porta | Tipo | Descrizione |
|---|---|---|
| **Eccezione** (`error`) | oggetto | In pratica non succede: un campo che manca non è un errore. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi uscita** aggiungi fino a 32 uscite (o meno, se un amministratore ha abbassato il limite **Porte aggiunte per blocco**). Ogni uscita è di tipo qualsiasi e nasce con il nome **campo 1**, **campo 2**…: **rinominala** con il nome del campo da prendere (fino a 60 caratteri). Le frecce ↑ ↓ cambiano l'ordine. Vedi [Come funziona un blocco](ide/blocks).

Il nome di un'uscita è un **percorso**, come il Campo di [Get proprietà (obj.campo)](core.get): `indirizzo.città` prende un campo dentro un campo, `voti.0` il primo elemento della lista `voti`, `voti.length` quanti elementi ha.

## Come funziona

Ogni volta che arriva un oggetto, il blocco cerca il campo di ogni uscita e lo manda su quell'uscita.

- Le uscite mandano **una dopo l'altra, dall'alto in basso**, nell'ordine delle porte. Un blocco collegato a più uscite riceve i valori in quell'ordine.
- Un campo che **non c'è** non manda niente su quella sua uscita, e **non** è un errore: le altre uscite mandano lo stesso.
- Un campo che vale `null` viene mandato (`null`).
- Se arriva qualcosa che non è un oggetto né una lista (un testo, un numero), non esce niente. Un testo JSON va prima trasformato con [Cast (converti tipo)](core.convert), impostazione **In** = «da testo JSON».
- Le regole del percorso sono quelle di [Get proprietà (obj.campo)](core.get): punti come separatori, posizioni da 0, spazi e maiuscole che contano. Un nome lasciato com'è (**campo 1**) cerca un campo che si chiama proprio `campo 1`.

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

Negli esempi l'oggetto che arriva è:

```
{"nome": "Ada", "indirizzo": {"città": "Roma"}, "voti": [7, 9, 10]}
```

### 1. Quattro uscite, una che non trova niente

Uscite chiamate `nome`, `indirizzo.città`, `telefono`, `voti.0`:

```
                    nome            ──▶ [Print (console.log)]
[Destruttura oggetto]  indirizzo.città ──▶ [Print (console.log)]
                    telefono        ──▶ [Print (console.log)]
                    voti.0          ──▶ [Print (console.log)]
```

Escono, in quest'ordine, `"Ada"`, `"Roma"` e `7`. Da `telefono` non esce niente, e non c'è nessun errore.

### 2. Ora e minuti da Now (data e ora)

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [Now (data e ora)] parti ──▶ oggetto [Destruttura oggetto] hour   ──▶ ore    [Template (formatta): "{ore}:{minuti}"] testo ──▶ valore [Print (console.log)]
                                                                                 minute ──▶ minuti
```

Le uscite si chiamano `hour` e `minute`, come i campi dell'oggetto **parti** di [Now (data e ora)](core.now). Su [Template (formatta)](core.format) aggiungi due ingressi, rinominali **ore** e **minuti**, e togli **lo avvia** da **ore**: `hour` esce per primo e resta come valore, `minute` esce dopo e fa scrivere la riga, per esempio `14:5` (i minuti non hanno lo zero davanti).

### 3. Una risposta web

```
[HTTP (fetch)] risposta ──▶ oggetto [Destruttura oggetto] main.temp ──▶ …
                                                         name      ──▶ …
```

Se la [HTTP (fetch)](net.request) riceve una risposta JSON come `{"name": "Roma", "main": {"temp": 18.4}}`, escono 18,4 e `"Roma"`. Se la risposta arriva come testo, mettici prima [Cast (converti tipo)](core.convert) con **In** = «da testo JSON».

## Vedi anche

- [Get proprietà (obj.campo)](core.get) per un campo solo, con l'errore se manca
- [Oggetto { }](core.compose) per fare l'opposto
- [Map campo](coll.pluck) per lo stesso campo da ogni elemento di una lista
- [Come funziona un blocco](ide/blocks)
