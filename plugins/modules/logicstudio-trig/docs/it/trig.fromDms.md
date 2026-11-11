# Gradi, primi, secondi → gradi

`trig.fromDms` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Mette insieme gradi, primi e secondi in un solo angolo in gradi con i decimali. Legge anche un testo come `45° 30′ 15″ N`.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **gradi** (`degrees`) | numero | I gradi. Il segno dell'angolo va qui. |
| **primi** (`minutes`) | numero | I primi, da 0 a meno di 60. |
| **secondi** (`seconds`) | numero | I secondi, da 0 a meno di 60, anche con i decimali. |
| **testo (12° 30′ 15″ N)** (`text`) | testo | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Un angolo scritto, al posto delle tre porte sopra. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **angolo (°)** (`angle`) | numero | L'angolo in gradi, con i decimali. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Un valore non è valido o il testo non si capisce. |

Questo blocco non ha impostazioni.

## Come funziona

Il blocco ha due modi, secondo la porta da cui arriva un valore.

**Da gradi, primi e secondi.** Il risultato è `gradi + primi ÷ 60 + secondi ÷ 3600`. Una delle tre porte **non collegata** vale 0, quindi puoi collegare solo i gradi, o gradi e primi. Se una porta è collegata ma non ha ancora un valore, il blocco aspetta.

- Il segno va sui **gradi**: gradi −12, primi 30 dà −12,5° (cioè −12° 30′). Con gradi `-0` e primi 30 dà −0,5°.
- Primi e secondi devono andare da 0 a meno di 60 e non essere negativi.

**Da un testo** (porta **testo**). Il testo è fatto di gradi, poi, se vuoi, primi e secondi:

- i gradi si possono scrivere con `°`, con la lettera `d` o con uno spazio;
- i primi con `′`, `'`, la lettera `m` o uno spazio;
- i secondi con `″`, `"`, `''` o la lettera `s` (o senza niente, se sono l'ultimo numero);
- i numeri si leggono **in ordine**: il primo sono i gradi, il secondo i primi, il terzo i secondi (`12 30` = 12° 30′); i simboli servono solo a separarli;
- all'inizio un segno `+`, `-` o `−`; alla fine, se vuoi, una lettera: **N** e **E** lasciano il segno com'è, **S**, **W** e **O** (ovest) rendono l'angolo negativo (maiuscole e minuscole valgono uguale);
- il punto o la virgola per i decimali: `12,5`.

Esempi di testi: `45° 30′ 15″ N`, `12 30 15 S`, `12°30'15"`, `12d30m15s`, `73° 59′ 8″ W`, `-12° 30′`, `90°`, `10,5 O`.

- I **gradi** da soli vanno bene anche senza simbolo: `10.5`, `10.5°` e `10,5 O`.
- I primi e i secondi devono essere minori di 60.
- Arriva un testo: il blocco legge solo il testo e ignora i numeri delle altre porte in quel momento.

Il risultato è arrotondato a **15 cifre significative**.

## Esempi

### 1. Da tre numeri

```
[Costante · Variabile: 45] valore ──▶ gradi [Gradi, primi, secondi → gradi] angolo (°) ──▶ valore [Print (console.log)]
[Costante · Variabile: 30] valore ──▶ primi
[Costante · Variabile: 15] valore ──▶ secondi
```

Scrive `45.5041666666667`.

### 2. Una longitudine ovest

Testo `73° 59′ 8″ W` sulla porta **testo**: scrive `-73.9855555555555`.

### 3. Il segno sui gradi

Gradi −12, primi 30, secondi 0 (collegati solo gradi e primi): scrive `-12.5`.

### 4. Un testo con la lettera dell'emisfero

Testo `12 30 15 S`: scrive `-12.5041666666667`. Testo `10,5 O` (O = ovest): scrive `-10.5`.

### 5. Un errore

Gradi 10, primi 75: errore `Primi e secondi vanno da 0 a meno di 60 (il segno va sui gradi)`.

## Errori

| Messaggio | Quando |
|---|---|
| gradi: serve un numero | I gradi non sono un numero. |
| primi: serve un numero | I primi non sono un numero. |
| secondi: serve un numero | I secondi non sono un numero. |
| Primi e secondi vanno da 0 a meno di 60 (il segno va sui gradi) | Con i numeri: primi o secondi negativi, oppure 60 o più. |
| Angolo non riconosciuto: «…» (scrivi per esempio 12° 30′ 15″ o 12 30 15 N) | Il testo non ha la forma giusta. Al posto di … c'è il testo ricevuto. |
| Primi e secondi devono essere minori di 60 | Con il testo: i primi o i secondi sono 60 o più. |

## Vedi anche

- [Gradi → gradi, primi, secondi](trig.toDms) per fare il contrario
- [Converti e normalizza angolo](trig.convert) per passare ad altre unità
- [Angolo](unit.angle) per i primi e i secondi d'arco come unità (pacchetto [Grandezze e unità](logicstudio-units))
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
