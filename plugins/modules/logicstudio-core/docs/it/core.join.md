# Aspetta tutti

`core.join` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Aspetta che arrivi qualcosa su **tutti** i suoi ingressi aggiunti, in qualsiasi ordine; quando sono arrivati tutti, manda un impulso su **pronto** e ricomincia ad aspettare.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **azzera** (`reset`) | impulso | Dimentica gli ingressi già arrivati: si ricomincia da capo. |
| (gli ingressi aggiunti) | impulso | Gli eventi da aspettare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **pronto** (`ready`) | impulso | Un impulso quando su ogni ingresso aggiunto è arrivato qualcosa. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Porte aggiuntive

Il blocco nasce con il solo **azzera**: aggiungi gli ingressi da aspettare nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso**. Puoi averne fino a 16 (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo impulso, chiamati **a**, **b**, **c**… Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Il blocco tiene il conto di quali ingressi aggiunti hanno già ricevuto qualcosa da quando ha ricominciato ad aspettare.

1. Arriva qualcosa su un ingresso aggiunto: il blocco lo segna come arrivato. Se ora sono arrivati **tutti**, manda un impulso su **pronto** e dimentica tutto (ricomincia ad aspettare).
2. Arriva qualcosa su **azzera**: dimentica gli ingressi già arrivati, senza mandare niente.

Cose da sapere:

- Conta solo **che** arrivi qualcosa, non **cosa**: anche `false`, `0` o `null` contano come arrivati.
- Un ingresso che riceve due volte prima che arrivino gli altri conta **una volta sola**: non si accumula niente per il giro dopo.
- Senza ingressi aggiunti il blocco non manda mai **pronto**.
- Se togli «lo avvia» da un ingresso aggiunto, quell'ingresso non viene mai segnato come arrivato e **pronto** non parte più. Lasciali tutti con «lo avvia».
- I valori che arrivano non vengono rimandati: **pronto** è solo un impulso. Se ti servono i valori, prendili da una [Memoria](core.store) o tienili negli ingressi (con «lo avvia» tolto) del blocco che parte con **pronto**.

## Esempi

### 1. Partire quando due letture sono finite

```
[Leggi file: a.txt] contenuto ──▶ a [Aspetta tutti] pronto ──▶ invia [Notifica: Dati pronti]
[Leggi file: b.txt] contenuto ──▶ b
```

Le due letture finiscono in un ordine qualsiasi. La [Notifica](lilos.notify) parte solo quando sono finite tutte e due.

### 2. Un passo dopo l'altro, poi di nuovo

Ingressi **a**, **b**, **c**. Arrivano, in ordine: **a**, **a**, **b**, **c** → dopo **c** parte **pronto** (il secondo **a** non conta due volte). Poi arrivano **b** e **c** → niente. Poi **a** → parte **pronto** di nuovo.

### 3. Annullare un'attesa

```
[Pulsante: Annulla] premuto ──▶ azzera [Aspetta tutti]
```

Se **a** è arrivato ma **b** no, e l'utente preme **Annulla**, il blocco dimentica **a**: per far partire **pronto** devono arrivare di nuovo sia **a** sia **b**.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Primo che arriva](core.merge) per far passare ogni valore senza aspettare
- [Sequenza](core.sequence) per far partire più cose in un ordine
- [E](core.and) per mandare sì solo quando più condizioni sono sì
- [Come funziona un blocco](ide/blocks)
