# Scorciatoie da tastiera

Tutti i tasti di Logic Studio IDE. Su un Mac, **Ctrl** è anche **Cmd**.

## In tutta la finestra dell'IDE

| Tasti | Cosa fanno | Note |
|---|---|---|
| **Ctrl+S** | Salva tutto. | Funziona anche mentre scrivi in un campo. |
| **F5** | **Prova**; se una prova è in corso, la ferma. | Funziona anche mentre scrivi in un campo. |
| **Ctrl+Z** | Annulla, nell'editor della scheda aperta. | Non mentre scrivi in un campo (lì annulla il testo). Con la **Mappa** aperta annulla le modifiche al progetto. |
| **Ctrl+Y** o **Ctrl+Maiusc+Z** | Ripeti. | Come sopra. |
| **F1** | Apre la documentazione di ciò che è selezionato (un blocco, una componente); senza selezione, quella dell'editor aperto. Sulla voce della palette, quella del blocco o della componente. | Funziona anche mentre scrivi in un campo. Vedi [La documentazione](ide/docs). |

## Le schede degli editor

| Tasti | Cosa fanno |
|---|---|
| **←** **→** | Passano alla scheda accanto. |
| **Home** / **Fine** | Prima / ultima scheda. |
| **Invio** o **Spazio** | Mostrano la scheda con il focus. |
| **Canc** | Chiude la scheda (la Home non si chiude). |
| clic con il **tasto centrale** | Chiude la scheda. |
| trascinare | Cambia l'ordine delle schede. |

## Il foglio di uno schema (e la Mappa)

Valgono quando il foglio è in primo piano: fai prima un clic sul foglio.

| Tasti | Cosa fanno |
|---|---|
| **Canc** o **Backspace** | Elimina i blocchi selezionati (con i loro collegamenti) e i gruppi selezionati con i loro blocchi; se non ci sono blocchi né gruppi selezionati, i collegamenti selezionati. |
| **Ctrl+A** | Seleziona tutti i blocchi (e i gruppi compressi). |
| **Ctrl+D** | Duplica i blocchi selezionati (e i collegamenti tra di loro); un gruppo selezionato si duplica con i suoi blocchi. |
| **Ctrl+G** | Fa un gruppo dei blocchi selezionati (vedi [Gruppi](ide/groups)). |
| **Ctrl+Maiusc+G** | Scioglie i gruppi selezionati: i blocchi restano. |
| **Frecce** | Spostano la selezione di 1 pixel. |
| **Maiusc+frecce** | Spostano la selezione di 20 pixel. |
| **Esc** | Toglie la selezione. |
| **Spazio** tenuto + trascinare | Sposta la vista. |

Con il mouse:

| Gesto | Cosa fa |
|---|---|
| **rotella** (anche con **Ctrl**) | Ingrandisce o rimpicciolisce intorno al puntatore (da 20% a 250%). |
| **Maiusc+rotella** | Sposta la vista in orizzontale. |
| trascinare con il **tasto centrale** | Sposta la vista. |
| trascinare sul fondo | Seleziona con un rettangolo; con **Maiusc** aggiunge alla selezione. |
| **Maiusc+clic** su un blocco | Lo aggiunge o lo toglie dalla selezione. |
| **Maiusc+clic** su un collegamento | Lo aggiunge alla selezione. |
| trascinare un blocco | Sposta i blocchi selezionati, sulla griglia di 10 pixel. |
| **Alt** mentre trascini un blocco | Senza griglia. |
| trascinare da un'uscita | Fa un collegamento; lasciato nel vuoto, apre il menu dei blocchi adatti. |
| trascinare da un ingresso collegato | Stacca il suo ultimo collegamento, per spostarlo o toglierlo. |
| **Ctrl+clic** su una porta, poi su altre porte, poi lasciare **Ctrl** | Collega la prima porta a ognuna delle altre (vedi [Collegamenti](ide/links)); **Esc** lascia perdere. |
| **doppio clic** sull'oggetto di una componente | Apre la sua finestra. |
| trascinare la testata di un gruppo (o un gruppo compresso) | Sposta il gruppo con tutti i suoi blocchi. |
| lasciare un blocco libero dentro la cornice di un gruppo | Lo mette nel gruppo. |
| **doppio clic** su un gruppo compresso / sulla testata di un gruppo | Lo apre / lo comprime. |
| **doppio clic** su un riquadro della Mappa | Apre lo schema o la finestra. |
| **tasto destro** | Il menu del blocco, del gruppo, del collegamento o del foglio. |

## L'editor di una finestra

In **Progetta**, con la finestra in primo piano:

| Tasti o gesto | Cosa fanno |
|---|---|
| **Canc** o **Backspace** | Elimina la componente selezionata e i suoi oggetti negli schemi (chiede conferma se almeno uno è collegato ad altri blocchi). |
| **Esc** | Toglie la selezione. |
| **doppio clic** su una componente | Apre il suo oggetto nello schema (il primo schema che ne ha uno). |
| trascinare una componente | La sposta dove mostra la linea blu. |

## L'elenco «Progetto»

| Tasti | Cosa fanno |
|---|---|
| **↑** **↓** | Riga precedente / successiva. |
| **Invio** | Apre l'elemento; su una cartella la apre o la chiude. |
| **F2** | Rinomina. |
| **Canc** | Elimina (chiede conferma). |
| **tasto menu** o **Maiusc+F10** | Apre il menu della riga. |

## Le console

Nel campo della risposta:

| Tasti | Cosa fanno |
|---|---|
| **Invio** | Manda la risposta. |
| **Esc** | Annulla la domanda (il blocco manda **annullato**). |
| un tasto qualsiasi | Con **Tipo di dato** = **un tasto**: risponde subito con quel tasto. |

Nella scheda **Problemi**: **Invio** su una riga porta al problema.

## Le barre dei pannelli

La barra tra un pannello laterale e il foglio, con il focus:

| Tasti o gesto | Cosa fanno |
|---|---|
| **←** **→** | Allargano o stringono il pannello. |
| **Maiusc+←** **→** | Di più, tre volte tanto. |
| **Home** / **Fine** | Il pannello più stretto (170 pixel) / più largo (480). |
| **doppio clic** | La larghezza di partenza (220 a sinistra, 280 a destra). |

## La finestra della documentazione

| Tasti | Cosa fa |
|---|---|
| **Alt+←** | Indietro: la pagina vista prima. |
| **Alt+→** | Avanti. |
| **Ctrl+F** | Va nella casella di ricerca. |
| **Invio** nella ricerca | Apre la prima pagina trovata. |

## Vedi anche

- [Schemi](ide/schemas)
- [Finestre](ide/windows)
- [Progetti](ide/projects)
