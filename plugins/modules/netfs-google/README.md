# netfs-google

Modulo del kernel che porta **Google Drive** e **Google Foto** nella cartella Rete, con un solo progetto Google Cloud per tutti e due. Sostituisce i moduli `netfs-gdrive` e `netfs-gphotos`: il kernel ne trasferisce le impostazioni (ID e segreto client vanno nel Progetto Google del Pannello di controllo) e le connessioni restano come sono.

## Google Drive

Il mio Drive, oppure un Drive condiviso dell'organizzazione.

- In **Connetti a un server** compare **Google Drive**. Con **Accedi con Google** si apre la pagina di Google; finito l'accesso, il Drive (tutto o una sua cartella) diventa `~/Rete/<nome>`. Con **Elenca** si sceglie tra Il mio Drive e i Drive condivisi.
- I **documenti Google** (Documenti, Fogli, Presentazioni, Disegni) non hanno byte propri: hanno un'etichetta, il doppio clic li apre su Google in una nuova scheda, e copiati fuori da Drive diventano file `.docx`, `.xlsx`, `.pptx` (o OpenDocument o PDF, come sceglie l'amministratore). Google li esporta fino a 10 MB. Moduli, Siti e Mappe si aprono solo sul web.
- In una cartella di Drive possono esserci **due file con lo stesso nome**: in lilOS il secondo si vede come `Preventivo (2).pdf`, con l'etichetta «stesso nome su Drive». Una `/` nei nomi si vede come `／`.
- **Condivisi con me** (se l'amministratore lo lascia attivo) è una cartella in cima alla connessione con ciò che altri hanno condiviso.
- Le **scorciatoie** si aprono come cartelle; le copie non ci entrano.
- **Eliminare** porta nel **cestino di Google Drive**. In alto c'è lo spazio usato.
- I caricamenti vanno a pezzi da 8 MB (caricamento a riprese di Google), ognuno ritentato da solo; i download interrotti riprendono. Le modifiche fatte su Google si vedono quando la cartella si riapre.

## Google Foto

Dal 31 marzo 2025 Google non lascia più leggere tutta la libreria alle app esterne. Il modulo usa quello che resta:

- **Importa da Google Foto** (nella barra della connessione): si sceglie dove copiare (di serie `~/Immagini/Google Foto`), la pagina di Google si apre in una nuova scheda, si scelgono fino a 2000 foto e video e si preme Fine; lilOS copia ciò che è stato scelto in una cartella con la data e l'ora, con i trasferimenti del kernel. Le foto arrivano originali, con i loro dati (EXIF). La copia va avviata entro un'ora: poi gli indirizzi di Google scadono.
- Gli **album creati da lilOS** sono le cartelle della connessione: quello che si copia dentro un album va nella libreria dell'utente e nell'album. Una nuova cartella è un nuovo album; un album si rinomina.
- Google non permette alle app di **eliminare** né di **rinominare** le foto, né di eliminare gli album: dal menu una foto si **toglie dall'album** (resta nella libreria), e un album si elimina da photos.google.com.

## Impostazioni

Ogni installazione usa il **proprio progetto Google Cloud**. Un amministratore lo imposta in **Pannello di controllo → Progetto Google**: ID client, **segreto client** (cifrato nel kernel, non si rivede), tipo di client; l'accesso a Google lo fa il kernel. Nelle schede Google Drive e Google Foto restano le impostazioni del modulo: per Drive «Condivisi con me» e il formato dei documenti copiati; **Google Foto** si può spegnere (resta solo Drive).

1. [console.cloud.google.com](https://console.cloud.google.com) → nuovo progetto → **API e servizi** → abilita **Google Drive API** e, per Google Foto, **Google Photos Picker API** e **Photos Library API**.
2. **Schermata di consenso OAuth**: **Interno** con Google Workspace; altrimenti **Esterno** e poi **Pubblica l'app** (in «Test» l'accesso scade ogni 7 giorni; un'app non verificata con l'ambito `drive` ha al massimo 100 utenti). Ambiti: `https://www.googleapis.com/auth/drive`; per Google Foto `photospicker.mediaitems.readonly`, `photoslibrary.appendonly`, `photoslibrary.readonly.appcreateddata`, `photoslibrary.edit.appcreateddata`.
3. **Credenziali** → **ID client OAuth** di tipo **Applicazione web**, con gli URI di reindirizzamento `<indirizzo di lilOS>/api/net/signin/callback` e `http://127.0.0.1:53682/` (il Pannello di controllo li mostra).

Google rimanda la finestra di accesso solo a un indirizzo **https con un nome di dominio**, o a `http://localhost`. Se lilOS è aperto in altro modo (per esempio `http://192.168.1.10:8790`) l'accesso si fa **incollando l'indirizzo**: la pagina di Google si apre in una nuova scheda, alla fine finisce su una pagina che non si apre (`http://127.0.0.1:53682/…`), e l'utente ne incolla l'indirizzo in lilOS. Con un client di tipo **App desktop** l'accesso è sempre così.

Fornisce i servizi `netfs.gdrive` e `netfs.gphotos`. Nessuna dipendenza. Richiede lilOS 1.22.0 o successivo.

## Soglie dei file grandi

Dalla 1.1.0. La dimensione dei pezzi con cui un file va su Drive è un'impostazione del modulo (un amministratore la cambia; vale subito, anche per i trasferimenti che partono dopo). Un invio interrotto riparte dall'ultimo pezzo:

| Chiave | Cosa | Predefinito |
|---|---|---|
| `pieceMb` | Dimensione dei pezzi (MB), un numero intero: così è sempre un multiplo di 256 KB, come chiede Google | 8 (da 1 a 1024) |
