# Photo

Guarda le immagini e le ritocca.

## Cosa fa

- Apre PNG, JPEG, GIF, WebP, BMP, AVIF, ICO e SVG; con le frecce passi alle altre immagini della cartella.
- **Disegna** a mano libera (colore, spessore, opacità, gomma) e **scrive** testo sull'immagine.
- **Ritaglia** con proporzioni libere o fisse (1:1, 4:3, 16:9…) e **ridimensiona** in pixel o in percentuale.
- **Converte** in PNG, JPEG o WebP, con la qualità che scegli.
- Importa le immagini dal computer (anche trascinandole nella finestra) e le scarica.
- Annulla e ripete le ultime 20 modifiche.
- Prepara le **anteprime** delle immagini (punto d'ingresso `filePreview`): l'immagine rimpicciolita, per il pannello Anteprima e le miniature del File Manager e della scrivania.

Si apre facendo doppio clic su un'immagine, oppure dal menu Start.
Vuole una versione di lilOS che salva i file binari (con `fs.readBlob`).

## Automazioni

Con **Automata** (lilOS 1.15.0 o successivo) Photo rende registrabili: **Ridimensiona l'immagine** (larghezza, altezza, unità, proporzioni, qualità), **Ritaglia l'immagine** (sinistra, alto, larghezza, altezza in pixel), **Converti e salva una copia** (formato, qualità, nome, cartella, aprire la copia) e **Salva l'immagine**. Rifatti, i passi lavorano sull'immagine mostrata nella finestra (o la aprono) senza finestre di dialogo; con le proporzioni bloccate l'altezza segue ogni immagine. Il **pennello** e il **testo** non si registrano: il Registratore li mostra barrati.
