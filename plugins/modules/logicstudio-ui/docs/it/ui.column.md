# Colonna

`ui.column` · Contenitori · [Componenti UI standard](logicstudio-ui) · versione 1

Un contenitore che mette le componenti una sotto l'altra, dall'alto in basso. È il contenitore più usato: anche la radice di ogni finestra è una Colonna.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Spazio tra (px)** | da 0 a 64 | 10 | Lo spazio verticale tra una componente e la successiva. |
| **Margine (px)** | da 0 a 64 | 0 | Lo spazio vuoto tutto intorno, tra il bordo della colonna e le componenti. |
| **Allineamento** | tutta la larghezza, inizio, centro, fine | tutta la larghezza | Come stanno le componenti in orizzontale. **tutta la larghezza**: ognuna occupa tutta la larghezza della colonna. **inizio**, **centro**, **fine**: ognuna ha la sua larghezza naturale ed è allineata a sinistra, al centro o a destra (nelle lingue da destra a sinistra, inizio e fine si scambiano). |

## Porte del suo oggetto nello schema

Una Colonna, come tutti i contenitori, oggi **non ha un oggetto** che si possa creare dall'IDE: nelle sue Proprietà non c'è la sezione **Oggetto nello schema**. I suoi ingressi **abilitato** e **visibile** esistono (valgono per tutta la colonna, con tutto quello che contiene) ma dall'IDE non si possono usare. Per nascondere un gruppo di componenti, oggi devi nasconderle una per una. Vedi [Componenti UI standard](logicstudio-ui).

## Come funziona

- Le componenti stanno nell'ordine in cui sono nella colonna: la prima in alto.
- Una colonna è alta quanto il suo contenuto; la radice occupa tutta l'altezza della finestra. Se il contenuto è più alto della finestra, la finestra scorre.
- Nella **radice** (la Colonna della finestra, con 10 px di spazio e 14 px di margine) le proprietà non si possono cambiare: la radice non si seleziona.
- Per mettere qualcosa **accanto** a qualcos'altro dentro una colonna, metti una [Riga](ui.row) nella colonna.
- In **Progetta** la colonna ha un bordo tratteggiato ed è alta almeno 36 pixel, anche vuota, per poterci lasciare dentro i pezzi. Trascinando un pezzo, la linea blu orizzontale mostra tra quali due componenti andrà.

## Esempi

### 1. Un modulo con i pulsanti a destra

```
Finestra «Contatto»
└ Colonna (radice)
  ├ Campo di testo  text1  Etichetta «Nome»
  ├ Campo di testo  text2  Etichetta «Telefono»
  └ Colonna  Allineamento fine
    └ Pulsante  button1  Testo «Salva»
```

I due campi occupano tutta la larghezza (la radice è «tutta la larghezza»); il pulsante, nella colonna interna allineata a **fine**, sta a destra con la sua larghezza naturale.

### 2. Un blocco centrato con più spazio

```
Finestra «Benvenuto»
└ Colonna (radice)
  └ Colonna  Allineamento centro  Spazio tra 20  Margine 24
    ├ Immagine   image1  Immagine «risorse/logo.png»
    ├ Etichetta  label1  Testo «Benvenuto!»  Dimensione titolo
    └ Pulsante   button1 Testo «Inizia»
```

Logo, titolo e pulsante stanno al centro, uno sotto l'altro, distanziati di 20 pixel, con 24 pixel di margine intorno.

## Vedi anche

- [Riga](ui.row), [Griglia](ui.grid), [Riquadro](ui.group) (una colonna con bordo e titolo)
- [Separatore](ui.separator), per più spazio o una linea tra due componenti
- [Componenti UI standard](logicstudio-ui)
