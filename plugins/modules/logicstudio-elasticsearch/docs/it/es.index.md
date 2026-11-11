# Elasticsearch · Indicizza (index)

`es.index` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Aggiunge un **documento** a un indice. Con un **id** scrive proprio il documento con quell'id (se c'è già, lo sostituisce); senza id, Elasticsearch ne sceglie uno. Se l'indice non esiste, di solito il cluster lo crea da solo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la scrittura. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |
| **documento** (`document`) | oggetto | Il documento da scrivere: un oggetto, o un testo JSON. Non avvia il blocco. |
| **id** (`id`) | testo | L'id del documento. Vuoto: l'id lo sceglie il cluster. Un numero va bene. Non avvia il blocco. |
| **indice** (`index`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto dell'**Indice** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **id** (`id`) | testo | L'id del documento scritto (quello dato o quello scelto dal cluster). |
| **esito** (`result`) | testo | Nascosta. `created` se il documento è nuovo, `updated` se ne ha sostituito uno. |
| **Exception** (`error`) | oggetto | Quando la scrittura non riesce: connessione mancante, indice non valido, documento mancante, id già presente (con «Solo se non c'è già»), quota finita… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indice** (`index`) | testo | vuoto | L'indice dove scrivere, quando l'ingresso **indice** non ha un valore. |
| **Visibile alle ricerche** (`refresh`) | Tra poco (al prossimo refresh), Aspetta che sia visibile (wait_for), Subito (refresh: costoso) | Tra poco | Quando il documento si vede nelle ricerche. «Tra poco» è il comportamento normale di Elasticsearch (circa un secondo). `wait_for` fa aspettare il blocco finché il documento è visibile; «Subito» forza un refresh, che costa al cluster. |
| **Solo se non c'è già (op_type create)** (`create`) | sì / no | no | Se è spuntato e c'è un **id**, la scrittura riesce solo se quell'id non esiste; altrimenti è un errore di conflitto. Senza id non cambia niente. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**, il blocco manda il documento al cluster: con un **id** `PUT /indice/_doc/id`, senza id `POST /indice/_doc`. Quando il cluster risponde di sì, esce **id**, poi **esito**.

- L'**indice** deve avere un nome valido (vedi [Blocchi Elasticsearch](logicstudio-elasticsearch)): minuscolo, senza spazi né simboli.
- Il **documento** deve essere un oggetto; un testo JSON viene letto. Una lista o un numero non vanno.
- L'**id** può essere un testo o un numero, fino a 512 byte.
- Con lo stesso id, un secondo documento **sostituisce** il primo (tutto il documento, non solo i campi che cambiano: per quello c'è [Elasticsearch · Aggiorna (update)](es.update)).

## Esempi

### 1. Un documento con id automatico

```
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione [Elasticsearch · Indicizza (index)] id ──▶ valore [Print (console.log)]
[Oggetto { }] oggetto ──▶ documento
[Pulsante: Salva] premuto ──▶ esegui
```

Impostazioni: **Indice** `eventi`. Il cluster sceglie l'id e lo manda su **id**.

### 2. Un documento per ogni utente, senza sovrascrivere

Impostazioni: **Indice** `utenti`, **Solo se non c'è già** spuntato.

```
[Campo di testo: nome] testo ──▶ id [Elasticsearch · Indicizza (index)] id ──▶ valore [Notify: "Utente creato"]
[Oggetto { }] oggetto ──▶ documento                                     Exception ──▶ valore [Notify: "Esiste già"]
[Pulsante: Crea] premuto ──▶ esegui
```

Se esiste già un documento con quell'id, il cluster risponde 409 e [Notify](lilos.notify) mostra «Esiste già».

## Errori

| Messaggio | Quando |
|---|---|
| Manca l'indice | Nessun indice, né nell'ingresso né nelle impostazioni. |
| Nome dell'indice non valido: … (solo lettere minuscole) | L'indice ha lettere maiuscole. |
| Nome dell'indice non valido: … (niente \ / * ? " < > \| , # : né spazi) | L'indice ha simboli o spazi vietati. |
| Nome dell'indice non valido: … (non può cominciare con - _ +) | L'indice comincia con `-`, `_` o `+`. |
| Nome dell'indice troppo lungo (al massimo 255 byte) | L'indice è troppo lungo. |
| Id del documento troppo lungo (al massimo 512 byte) | L'id è troppo lungo. |
| Manca il documento (un oggetto) | Il documento è vuoto. |
| Documento non valido: serve un oggetto JSON | Il documento è un testo che non è JSON. |
| Documento non valido: serve un oggetto JSON { … } | Il documento è una lista, un numero o altro. |
| Elasticsearch ha risposto 409 (conflitto: il documento c'è già o è cambiato): … | Con «Solo se non c'è già», l'id esiste. |
| Elasticsearch ha risposto 400 (richiesta non valida): … | Il documento non va d'accordo con la mappatura dell'indice (per esempio un testo in un campo numerico). |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Connessione (connect)](es.connect), [Elasticsearch · Leggi documento (get)](es.get), [Elasticsearch · Aggiorna (update)](es.update), [Elasticsearch · Indicizza in blocco (_bulk)](es.bulk)
- [Oggetto { }](core.compose), per preparare il documento
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
