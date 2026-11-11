# Scegli file

`ui.file` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un pulsante che apre la finestra di lilOS per scegliere un file (o una cartella), e accanto il percorso scelto. Il percorso va allo schema, pronto per i blocchi che leggono e scrivono file.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra il campo. |
| **Estensioni (separate da virgola, vuoto: tutte)** | testo | vuoto | Quali file si possono scegliere: `csv, txt` (il punto davanti si può scrivere o no: `.csv` va bene). Vuoto: tutti. Non conta quando si sceglie una cartella. |
| **Scegli** | un file, una cartella | un file | Cosa si sceglie. Cambia anche l'icona del pulsante. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **percorso** (`value`) | testo | Mostra quel percorso accanto al pulsante, senza che la componente mandi niente. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara e il pulsante non si può più premere. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **percorso** (`value`) | testo | Il percorso scelto, quando l'utente sceglie un file o una cartella. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

All'apertura si vede «—» e un pulsante «…» con l'icona di un file o di una cartella.

1. L'utente preme il pulsante: si apre la finestra di scelta di lilOS, con i file e le cartelle a cui l'utente ha accesso.
2. Se sceglie un file (o una cartella), il percorso compare accanto al pulsante e parte su **percorso**, per esempio `/home/anna/Documenti/conti.csv`.
3. Se chiude la finestra senza scegliere, non succede niente: resta il percorso di prima.

- Scegliere di nuovo lo stesso file lo manda di nuovo.
- Il percorso è quello di lilOS, che comincia con la tua home (`/home/anna/…`). I blocchi di lilOS lo accettano così com'è. Il programma gira con i permessi di chi lo ha avviato: la scelta di un file non dà al programma permessi in più.
- I blocchi dei file lavorano solo nella home: se l'utente sceglie un file fuori dalla sua home, il blocco [readFile](lilos.fileRead) va in **Eccezione** con «Puoi usare solo i file della tua home (~/… oppure /home/anna/…): …». Anche la cartella `.config` è esclusa.
- Un percorso lungo si accorcia con «…» alla fine; per vederlo tutto, allarga la finestra.
- Dallo schema, **percorso** cambia solo la scritta: non controlla che il file esista, e non apre niente. `null` riporta «—».
- Funziona anche nell'**Anteprima** dell'IDE.

## Esempi

### 1. Aprire un file di testo

```
Finestra «Lettore»
└ Colonna (radice)
  ├ Scegli file  file1   Etichetta «File da leggere»  Estensioni «txt, md»
  └ Console      console1
```

```
[Scegli file: File da leggere] percorso ──▶ percorso [readFile] contenuto ──▶ valore [Print (console.log)]
```

Nel [readFile](lilos.fileRead) accendi «lo avvia» sull'ingresso **percorso** (di serie è spento): il file si legge appena l'utente lo sceglie, e il suo contenuto compare nella console della finestra.

### 2. Scegliere la cartella di destinazione

```
Finestra «Esporta»
└ Colonna (radice)
  ├ Scegli file  file1    Etichetta «Salva in»  Scegli una cartella
  └ Pulsante     button1  Testo «Esporta»
```

```
[Scegli file: Salva in] percorso ──▶ cartella [Template (formatta): «{cartella}/rapporto.txt»] testo ──▶ percorso [writeFile]
[Pulsante: Esporta] premuto ──▶ invia [Costante · Variabile: «Rapporto del giorno»] valore ──▶ contenuto [writeFile]
```

L'utente sceglie la cartella e poi preme **Esporta**: il blocco [writeFile](lilos.fileWrite) scrive `rapporto.txt` in quella cartella. Se preme **Esporta** prima di scegliere, il file va nel percorso delle impostazioni del blocco.

## Accessibilità e tastiera

- Il pulsante si raggiunge con **Tab** e si preme con **Invio** o **Spazio**; la finestra di scelta si usa con la tastiera come nel resto di lilOS.
- Il pulsante ha come testo solo «…»: un lettore di schermo non dice a cosa serve, e l'**Etichetta** sopra non è collegata. Il percorso scelto è testo normale, letto dopo il pulsante.

## Vedi anche

- [readFile](lilos.fileRead), [writeFile](lilos.fileWrite), [readdir (elenca cartella)](lilos.folderList)
- [Componenti UI standard](logicstudio-ui)
