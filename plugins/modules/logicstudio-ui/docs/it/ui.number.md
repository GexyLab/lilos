# Campo numerico

`ui.number` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un campo in cui l'utente scrive un numero, con le freccette per aumentarlo o diminuirlo e l'unità accanto. Manda il numero quando l'utente ha finito di scriverlo.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra il campo. |
| **Minimo** | numero, o vuoto | vuoto (nessuno) | Il numero più piccolo che le freccette raggiungono. |
| **Massimo** | numero, o vuoto | vuoto (nessuno) | Il numero più grande che le freccette raggiungono. |
| **Passo** | numero | 1 | Di quanto cambiano le freccette (e i tasti freccia) a ogni pressione. |
| **Unità** | testo | vuoto | Scritta a destra del campo, più piccola (per esempio `€`). |

Il campo si apre sempre vuoto: per un numero iniziale usa l'ingresso **valore** con un valore iniziale.

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Mette un numero nel campo, senza che il campo mandi niente. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e non si può più scrivere. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il numero, quando l'utente conferma una modifica: preme Invio o esce dal campo (e, secondo il browser, a ogni clic sulle freccette). |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**Quando manda.** Come il [Campo di testo](ui.text): non a ogni cifra, ma quando la modifica è confermata (Invio, o uscendo dal campo). Le freccette del campo e i tasti **freccia su/giù** cambiano il numero di un **Passo**; in molti browser ogni clic sulle freccette manda subito il nuovo valore. Dopo Invio il campo perde il fuoco.

**Cosa manda.** Sempre un **numero** (mai un testo). Il separatore decimale da scrivere dipende dal browser e dalla lingua (di solito vanno bene sia `2,5` sia `2.5`); il numero che arriva allo schema è 2,5.

**Cosa non manda.**

- Se l'utente svuota il campo, il campo **non manda niente** (lo schema tiene l'ultimo numero ricevuto).
- Se l'utente scrive qualcosa che non è un numero, il browser lo considera vuoto: non manda niente.

**Minimo, Massimo e Passo non sono controlli.** Valgono per le freccette, ma un numero **scritto a mano** parte anche se è fuori dall'intervallo o non è un multiplo del passo: con minimo 1 e massimo 10, se l'utente scrive 25, lo schema riceve 25 (il browser può solo segnare il campo come non valido). Se il numero deve stare in un intervallo, usa nello schema un [Limita](core.clamp).

**Dallo schema**, un valore su **valore** viene convertito in numero e scritto nel campo: `"4,5"` diventa 4,5; `null` e `""` diventano **0** (non svuotano il campo); un testo che non è un numero (per esempio `"—"`) **svuota** il campo. Attenzione: il campo viene ridisegnato e, se l'utente sta scrivendo, perde quello che non ha confermato e il fuoco della tastiera.

## Esempi

### 1. Un prezzo con IVA

```
Finestra «IVA»
└ Colonna (radice)
  ├ Campo numerico  number1  Etichetta «Prezzo senza IVA»  Minimo 0  Passo 0.01  Unità «€»
  └ Valore          value1   Etichetta «Con IVA:»  Unità «€»  Decimali 2
```

```
[Campo numerico: Prezzo senza IVA] valore ──▶ a [Moltiplica] risultato ──▶ valore [Valore: Con IVA:]
[Valore: 1.22]                     valore ──▶ b
```

L'utente scrive 100 e preme Invio: si vede «Con IVA: 122,00 €».

### 2. Una quantità tra 1 e 10

```
Finestra «Ordine»
└ Colonna (radice)
  ├ Campo numerico  number1  Etichetta «Quantità»  Minimo 1  Massimo 10
  └ Etichetta       label1   Testo «»  Dimensione piccolo
```

```
[Campo numerico: Quantità] valore ──▶ valore [Limita: 1…10] risultato ──▶ valore [Campo numerico: Quantità]
                                                            risultato ──▶ n [Formatta testo: «Ordini {n} pezzi.»] testo ──▶ testo [Etichetta: label1]
```

Se l'utente scrive 25, il [Limita](core.clamp) lo porta a 10, il campo mostra 10 e l'etichetta dice «Ordini 10 pezzi.». Rimandare il valore al campo non crea un giro senza fine: un valore che arriva sull'ingresso del campo non esce dalla sua uscita. (Nel [Formatta testo](core.format) aggiungi l'ingresso **n**.)

## Accessibilità e tastiera

- È un campo numerico vero: si raggiunge con **Tab**; **freccia su/giù** cambiano il numero di un passo; **Invio** conferma.
- L'**Etichetta** sopra e l'**Unità** accanto non sono collegate al campo: il lettore di schermo legge il numero ma non il nome del campo.

## Vedi anche

- [Cursore](ui.slider), per scegliere in un intervallo con il mouse
- [Campo di testo](ui.text)
- [Limita](core.clamp), [Converti](core.convert)
- [Componenti UI standard](logicstudio-ui)
