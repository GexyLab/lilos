# Zip

Comprime file e cartelle in archivi `.zip` e li estrae.

## Cosa fa

- **Comprimi → Zip**: dal menu del tasto destro di file e cartelle (sulla scrivania e nel File Manager) crea un archivio `.zip` nella stessa cartella. Un elemento dà il suo nome all'archivio (`Foto` → `Foto.zip`); più elementi selezionati diventano `Archivio.zip`. Le cartelle entrano con tutto ciò che contengono, anche quelle vuote.
- **Comprimi → Unzip**: sui file `.zip` li estrae nella stessa cartella. Un archivio con una sola cartella dà quella cartella; altrimenti una cartella nuova con il nome dell'archivio raccoglie tutto.
- **Apri un `.zip`** con il doppio clic: la finestra di Zip mostra cartelle, file e dimensioni, con il pulsante **Estrai qui**.

Zip non sovrascrive mai niente: un nome già usato prende un numero (`Foto 2.zip`). A lavoro finito compare una notifica.

## Da sapere

- Chiede di leggere e modificare i file della home (`fs.write:~`): deve leggere il contenuto delle cartelle e scrivere l'archivio accanto agli elementi.
- Archivi e file estratti arrivano a 10 MB ciascuno, come ogni file di lilOS; in tutto al massimo 256 MB e 10.000 file per volta.
- Immagini, video, musica e altri archivi entrano così come sono, senza comprimerli di nuovo.
- Restano fuori, e la notifica lo dice, gli elementi protetti da password, quelli con percorsi pericolosi (`..`), quelli compressi con metodi diversi da Deflate e i file oltre 10 MB. `__MACOSX`, `.DS_Store`, `Thumbs.db` e `desktop.ini` si saltano.
- I nomi con lettere accentate restano tali (UTF-8).

Vuole una versione di lilOS con i sottomenu per le voci delle app (`contributes.menus` e `when.notExt`).

## Automazioni

Con **Automata** (lilOS 1.15.0 o successivo) Zip rende registrabili **Comprimi in un .zip** e **Estrai un .zip**, ognuno con il file che ha fatto. Rifatti, funzionano in sottofondo come le voci del menu **Comprimi**, senza notifiche aggiuntive, e il file creato può servire ai passi seguenti (per esempio per spostarlo).
