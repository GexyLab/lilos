# Etichetta

`ui.label` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Un testo nella finestra: un titolo, una spiegazione, un messaggio che uno schema cambia mentre il programma gira.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Testo** | testo (traducibile) | «Testo» | Quello che si vede all'apertura. |
| **Dimensione** | piccolo, normale, titolo | normale | **piccolo**: più piccolo e più chiaro, per le note. **titolo**: più grande e in grassetto. |
| **Allineamento** | inizio, centro, fine | inizio | Dove sta il testo nella larghezza della componente. Nelle lingue che si scrivono da destra a sinistra, «inizio» è a destra. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | Sostituisce il testo mostrato. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

L'Etichetta non manda niente: l'utente non può agire su di lei.

## Come funziona

All'apertura si vede il **Testo** delle proprietà (o la sua traduzione, se il progetto ne ha una). Ogni valore che arriva su **testo** lo sostituisce:

- un testo si vede com'è; un numero com'è scritto in JSON (`3.5`, non `3,5`); `true` e `false` come «true» e «false»;
- un oggetto o una lista si vedono come JSON su una riga: `{"a":1}`;
- `null` (o niente) svuota l'etichetta.

Il testo va a capo da solo se non entra nella larghezza. Gli a capo dentro il testo (`\n`) non vanno a capo: diventano spazi.

Se la finestra si riapre e il progetto tiene gli ultimi valori, l'etichetta mostra l'ultimo testo ricevuto, non quello delle proprietà.

## Esempi

### 1. Un titolo fisso

```
Finestra «Magazzino»
└ Colonna (radice)
  ├ Etichetta  label1  Testo «Giacenze»  Dimensione titolo  Allineamento centro
  └ Tabella    table1
```

Non serve nessun oggetto: l'etichetta mostra sempre «Giacenze», grande e centrata.

### 2. Un messaggio di stato

```
Finestra «Copia»
└ Colonna (radice)
  ├ Pulsante   button1  Testo «Copia»
  └ Etichetta  label1   Testo «Pronto.»  Dimensione piccolo
```

```
[Pulsante: Copia] premuto ──▶ leggi [readFile: ~/dati.txt] contenuto ──▶ contenuto [writeFile: ~/copia.txt] scritto ──▶ invia [Costante · Variabile: «Copiato.»] valore ──▶ testo [Etichetta: label1]
[readFile] Eccezione ──▶ oggetto [Get proprietà (obj.campo): message] valore ──▶ testo [Etichetta: label1]
```

Se la copia riesce, l'etichetta dice «Copiato.»; se il file non c'è, mostra il messaggio d'errore del blocco [readFile](lilos.fileRead).

### 3. Un testo composto

```
[Campo di testo: Nome] testo ──▶ nome [Template (formatta): «Ciao, {nome}!»] testo ──▶ testo [Etichetta: label1]
```

Quando l'utente scrive «Luca» e preme Invio, l'etichetta mostra «Ciao, Luca!».

## Accessibilità

L'etichetta è testo normale: un lettore di schermo la legge quando arriva lì. Non è collegata a nessun controllo: per dare un nome a un campo usa la sua proprietà **Etichetta**.

## Vedi anche

- [Valore](ui.value), per mostrare numeri con unità e decimali
- [Template (formatta)](core.format)
- [Componenti UI standard](logicstudio-ui)
