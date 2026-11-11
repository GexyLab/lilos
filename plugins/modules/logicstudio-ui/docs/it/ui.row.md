# Riga

`ui.row` · Contenitori · [Componenti UI standard](logicstudio-ui) · versione 1

Un contenitore che mette le componenti una accanto all'altra, da sinistra a destra. Se non c'è posto, vanno a capo.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Spazio tra (px)** | da 0 a 64 | 10 | Lo spazio tra una componente e l'altra (anche tra le righe, quando vanno a capo). |
| **Margine (px)** | da 0 a 64 | 0 | Lo spazio vuoto tutto intorno. |
| **Allineamento** | tutta la larghezza, inizio, centro, fine | centro | Come stanno le componenti **in verticale** quando hanno altezze diverse: **centro** le centra, **inizio** le allinea in alto, **fine** in basso, **tutta la larghezza** le allunga tutte all'altezza della più alta (in una riga vuol dire «tutta l'altezza»). |
| **Va a capo se serve** | sì/no | sì | Spento: le componenti restano sempre sulla stessa riga, anche se escono dal bordo. |

## Porte del suo oggetto nello schema

Una Riga, come tutti i contenitori, oggi **non ha un oggetto** che si possa creare dall'IDE: i suoi ingressi **abilitato** e **visibile** (che varrebbero per tutto il contenuto) non si possono usare. Vedi [Componenti UI standard](logicstudio-ui).

## Come funziona

- Ogni componente ha la sua larghezza naturale (un pulsante quanto il suo testo, un campo la larghezza del campo). La riga **non** allarga le componenti per riempire lo spazio: quello che avanza resta vuoto a destra.
- Con **Va a capo se serve**, una componente che non entra va sulla riga sotto.
- Nelle lingue che si scrivono da destra a sinistra, la riga parte da destra.
- In **Progetta**, trascinando un pezzo dentro una riga la linea blu è **verticale** e mostra tra quali due componenti andrà.
- Un [Separatore](ui.separator) in una riga non si vede: i separatori funzionano solo in verticale.

## Esempi

### 1. Due pulsanti affiancati

```
Finestra «Lettore»
└ Colonna (radice)
  ├ Etichetta  label1  Testo «Brano 1»
  └ Riga
    ├ Pulsante  button1  Testo «Avvia»  Icona play
    ├ Pulsante  button2  Testo «Pausa»  Icona stop  Aspetto normale
    └ Pulsante  button3  Testo «Avanti» Aspetto normale
```

I tre pulsanti stanno sulla stessa riga, distanziati di 10 pixel. In una finestra stretta, quelli che non entrano vanno sotto.

### 2. Un interruttore con la sua scritta

```
Finestra «Impostazioni»
└ Colonna (radice)
  ├ Riga  Allineamento centro  Spazio tra 8
  │ ├ Interruttore  toggle1  Etichetta «Notifiche»
  │ └ Etichetta     label1   Testo «Notifiche»
  └ Riga  Allineamento centro  Spazio tra 8
    ├ Interruttore  toggle2  Etichetta «Suoni»
    └ Etichetta     label2   Testo «Suoni»
```

L'[Interruttore](ui.toggle) non mostra la sua etichetta: con una Riga gli metti accanto una scritta, centrata in verticale.

## Vedi anche

- [Colonna](ui.column), [Griglia](ui.grid)
- [Componenti UI standard](logicstudio-ui)
