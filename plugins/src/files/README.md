# File Manager

Sfoglia, cerca e organizza i file e le cartelle di lilOS.

## Cosa fa

- Mostra le cartelle a elenco, a icone o in **vista anteprime** (riquadri grandi: i file mostrano la miniatura che l'app che li apre ne fa, per esempio Photo per le immagini e l'Editor per il testo; con un lilOS che non le ha restano le icone grandi), con la ricerca nella cartella aperta.
- Crea, rinomina e sposta file e cartelle, anche trascinandoli.
- Assegna i **tag** e crea i **collegamenti**.
- Manda gli elementi nel **cestino**, da cui si ripristinano.
- Il pannello **Informazioni** mostra dimensione, date e tag dell'elemento selezionato; il pannello **Anteprima** ne mostra il contenuto. Per i tipi di file la cui app sa prepararla (punto d'ingresso `filePreview`), l'anteprima la fa quell'app.
- **Proprietà…** apre tutte le informazioni di un file o di una cartella.

È un'app di sistema: lilOS ne ha bisogno e non si può rimuovere.

## Automazioni

Con **Automata** (lilOS 1.15.0 o successivo) il File Manager rende registrabili **Vai a una cartella**, **Cerca nella cartella** (la ricerca si registra quando smetti di scrivere per un secondo o premi Invio), **Ordina** (colonna e verso) e **Cambia vista** (elenco, icone, anteprime). Rifatti, agiscono sulla finestra del File Manager più recente. Spostare, copiare, rinominare ed eliminare li registra lilOS stesso.

Dalla 1.15.0 (lilOS 1.17.0) la finestra dice a lilOS cosa hai selezionato (`win.selection`, non nel cestino): la **scorciatoia** di un'automazione agisce sugli elementi selezionati nel File Manager, non solo su quelli della scrivania.
