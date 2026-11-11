# Elasticsearch · Indicizza in blocco (_bulk)

`es.bulk` · Database · [Blocchi Elasticsearch](logicstudio-elasticsearch) · versione 1

Indicizza una **lista di documenti** con una sola richiesta: molto più veloce di un documento alla volta. L'id di ogni documento può venire da un suo campo, se lo indichi; se no lo sceglie il cluster.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la scrittura. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [Elasticsearch · Connessione (connect)](es.connect). Non avvia il blocco. |
| **documenti** (`documents`) | lista | La lista dei documenti: ognuno un oggetto (o un testo JSON di un oggetto). Non avvia il blocco. |
| **indice** (`index`) | testo | Nascosta. Se ha un valore non vuoto, prende il posto dell'**Indice** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **indicizzati** (`indexed`) | numero | Quanti documenti sono stati scritti. |
| **errori** (`errors`) | numero | Nascosta. Quanti documenti non sono stati scritti. |
| **non riusciti** (`failed`) | lista | Nascosta. I documenti non riusciti (al massimo i primi 100), ognuno `{ "position": 3, "id": "abc", "status": 400, "error": "mapper_parsing_exception: …" }`: `position` è il posto nella lista (da 0). |
| **Exception** (`error`) | oggetto | Quando l'intera richiesta non riesce: connessione mancante, lista troppo lunga, un documento non valido, cluster che rifiuta… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Indice** (`index`) | testo | vuoto | L'indice dove scrivere, quando l'ingresso **indice** non ha un valore. |
| **Campo con l'id (vuoto: automatico)** (`idField`) | testo | vuoto | Il nome del campo che contiene l'id di ogni documento (per esempio `codice`). Un documento senza quel campo (o con valore vuoto) ha un id automatico. Con lo stesso id, un documento nuovo sostituisce il vecchio. |
| **Visibile alle ricerche** (`refresh`) | Tra poco (al prossimo refresh), Aspetta che sia visibile (wait_for), Subito (refresh: costoso) | Tra poco | Quando i documenti si vedono nelle ricerche. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**, il blocco manda tutti i documenti con `POST /indice/_bulk` e manda **indicizzati**, poi **errori** e **non riusciti**.

- Una lista vuota non fa niente: `indicizzati` è 0.
- I documenti sono al massimo tanti quanti le righe massime del modulo (10000 di serie).
- Il cluster risponde per ogni documento: se alcuni falliscono e altri no, **non è un errore del blocco**. Quelli buoni sono scritti; **errori** dice quanti no, e **non riusciti** dice quali e perché (i primi 100). Controlla **errori** dopo un invio importante.
- Il campo dell'id può avere un testo o un numero; un oggetto diventa testo JSON.

## Esempi

### 1. Caricare un elenco

```
[Lista [ ]] lista ──▶ documenti [Elasticsearch · Indicizza in blocco (_bulk)] indicizzati ──▶ valore [Valore: caricati]
[Elasticsearch · Connessione (connect)] connessione ──▶ connessione
[Pulsante: Carica] premuto ──▶ esegui
```

Impostazioni: **Indice** `prodotti`, **Campo con l'id** `codice`. Se la lista contiene `{ "codice": "A1", "nome": "Caffè" }`, il documento ha id `A1`: caricare di nuovo lo stesso elenco aggiorna i documenti, non li duplica.

### 2. Avvisare se qualcosa è andato storto

```
[Elasticsearch · Indicizza in blocco (_bulk)] errori ──▶ a [Confronto (== ≠ < >): a < b] se falso ──▶ invia [Notify: "Alcuni documenti non sono stati caricati"]
                                              [Costante · Variabile: 1] valore ──▶ b
```

Con 0 errori `0 < 1` è vero e non succede niente; con 1 o più, [Notify](lilos.notify) avvisa. **non riusciti** dice quali documenti.

## Errori

| Messaggio | Quando |
|---|---|
| Manca l'indice | Nessun indice. |
| Nome dell'indice non valido: … | L'indice ha maiuscole, simboli o spazi vietati (vedi [Blocchi Elasticsearch](logicstudio-elasticsearch)). |
| Troppi documenti in una volta: 20000 (al massimo 10000) | La lista ha più documenti del limite del modulo. |
| Il documento 3 è vuoto | Un elemento della lista è vuoto (il numero è la sua posizione, da 1). |
| Documento 3 non valido: serve un oggetto JSON | Un elemento è un testo che non è JSON. |
| Documento 3 non valido: serve un oggetto JSON { … } | Un elemento è una lista, un numero o altro. |
| Id del documento 3 troppo lungo | L'id di un documento supera 512 byte. |
| Elasticsearch ha risposto 413 (richiesta troppo grande): … | La richiesta è troppo grande per il cluster: manda meno documenti per volta. |
| Elasticsearch ha risposto 404 (non trovato): … | Di solito il cluster crea l'indice; se non lo fa, può non essere permesso. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi Elasticsearch](logicstudio-elasticsearch).

## Vedi anche

- [Elasticsearch · Indicizza (index)](es.index), [Elasticsearch · Conta (_count)](es.count), [Elasticsearch · Connessione (connect)](es.connect)
- [Lista [ ]](core.list), per preparare una lista
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
