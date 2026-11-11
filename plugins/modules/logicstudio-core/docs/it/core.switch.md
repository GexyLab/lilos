# Casi

`core.switch` · Logica · [Blocchi di base](logicstudio-core) · versione 1

Confronta un valore con un elenco di casi, ognuno con la sua uscita, e manda un impulso sull'uscita del caso uguale; se nessun caso è uguale, su **altrimenti**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da riconoscere. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **altrimenti** (`else`) | impulso | Un impulso quando il valore non è uguale a nessun caso. |
| (le uscite aggiunte) | impulso | Un impulso quando il valore è uguale al nome dell'uscita. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi uscita** aggiungi i casi: fino a 32 uscite (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo impulso. Si chiamano all'inizio **caso 1**, **caso 2**… (in un IDE in inglese **case 1**, **case 2**…): **rinominale** nelle Proprietà con il valore da riconoscere, per esempio `rosso`, `giallo`, `verde`. Il nome può essere lungo fino a 60 caratteri; gli spazi all'inizio e alla fine vengono tolti. Puoi spostare i casi su e giù e toglierli con **Togli**. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

A ogni valore che arriva, il blocco lo scrive come testo e cerca, tra le uscite aggiunte e **nell'ordine in cui sono**, la prima che ha **esattamente** quel nome. Se la trova, manda un impulso lì; se no, manda un impulso su **altrimenti**. Parte sempre un solo impulso.

Il confronto è tra testi, lettera per lettera:

- le maiuscole contano: `Rosso` non è il caso `rosso`;
- gli spazi contano: `"rosso "` non è il caso `rosso`;
- i numeri sono scritti con il punto e senza zeri inutili: 3 trova il caso `3`, ma non `3.0` né `03`; 2,5 trova il caso `2.5` (non `2,5`);
- sì/no sono scritti `true` e `false`: per riconoscerli chiama i casi `true` e `false`;
- `null` è il testo vuoto: non trova nessun caso (un caso non può avere il nome vuoto) e va su **altrimenti**;
- oggetti e liste sono scritti in JSON (per esempio `[1,2]`).

Il blocco manda **un impulso**, non il valore. Se ti serve anche il valore, collegalo pure all'ingresso del blocco che parte con l'impulso (con «lo avvia» tolto), oppure usa [Smista](core.route).

Se due casi hanno lo stesso nome, vince il primo dall'alto.

## Esempi

### 1. Un semaforo

Aggiungi tre uscite e chiamale `rosso`, `giallo`, `verde`:

```
[Selezione: colore] valore ──▶ valore [Casi] rosso      ──▶ invia [Notifica: Fermati]
                                             giallo     ──▶ invia [Notifica: Rallenta]
                                             verde      ──▶ invia [Notifica: Vai]
                                             altrimenti ──▶ invia [Valore: "colore sconosciuto"] valore ──▶ valore [Scrivi in console]
```

Se la [Selezione](ui.select) manda `giallo`, parte la notifica **Rallenta**. Se manda `blu`, parte **altrimenti** e la console scrive `colore sconosciuto`.

### 2. Comandi scritti nella console

```
[Leggi da console] valore ──▶ testo [Operazione sul testo: minuscolo] risultato ──▶ valore [Casi]
```

Con i casi `avvia`, `ferma`, `stato`: se l'utente scrive `AVVIA`, il testo diventa `avvia` e parte l'uscita **avvia**. Il passaggio per [Operazione sul testo](core.text) serve a non badare alle maiuscole; con **togli gli spazi ai lati** puoi anche ignorare gli spazi.

### 3. Numeri

Casi `1`, `2`, `3`. Arriva il numero 2 → uscita **2**. Arriva il testo `"2"` → uscita **2** (è lo stesso testo). Arriva 2,0 → uscita **2** (il numero 2,0 è scritto `2`). Arriva `"2.0"` (testo) → **altrimenti**.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Se](core.if) per due sole strade
- [Smista](core.route) per mandare il valore stesso su una di molte uscite, scelta con un numero
- [Scegli](core.select) per l'opposto: scegliere uno di molti ingressi
- [Operazione sul testo](core.text) per preparare il valore (minuscolo, spazi)
- [Come funziona un blocco](ide/blocks)
