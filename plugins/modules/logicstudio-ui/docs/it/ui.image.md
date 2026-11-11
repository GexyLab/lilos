# Immagine

`ui.image` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Mostra un'immagine presa dalla cartella del progetto (un logo, uno schema d'impianto, una foto che cambia secondo lo stato del programma) oppure un'immagine fatta dal programma, come le foto e i fotogrammi della webcam dei blocchi [Hardware](logicstudio-hardware).

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Immagine** | un file della cartella **risorse** del progetto, o «—» | — (nessuna) | L'immagine mostrata all'apertura. L'elenco mostra tutti i file sotto **risorse**, anche nelle sottocartelle. |
| **Adatta** | tutta l'immagine, riempi lo spazio | tutta l'immagine | Come l'immagine entra in uno spazio di proporzioni diverse: **tutta l'immagine** la mostra intera (con bande vuote), **riempi lo spazio** la ritaglia. Vedi sotto: oggi si nota di rado. |
| **Descrizione** | testo (traducibile) | vuoto | Il testo alternativo, letto dai lettori di schermo al posto dell'immagine. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **sorgente** (`source`) | testo | Il percorso di un'altra immagine del progetto, per esempio `risorse/rosso.png`, oppure un'immagine come data URL (`data:image/jpeg;base64,…`, vedi sotto). Un testo vuoto toglie l'immagine. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Exception** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

L'Immagine mostra **solo file del progetto** o **immagini mandate dal programma**, mai indirizzi di internet né file fuori dalla cartella del progetto.

- Il percorso è **relativo alla cartella del progetto** (quella con il file `.lsproj`): `risorse/logo.png`, `risorse/icone/ok.svg`. Le barre `/` all'inizio non contano. Un percorso come `~/Immagini/foto.jpg` o `https://…` non mostra niente.
- Con l'ingresso **sorgente** puoi indicare anche un file fuori da **risorse**, purché sia dentro la cartella del progetto.
- Se il file non c'è, è una cartella o non si può leggere, l'immagine sparisce (senza errori).
- Un file che non è un'immagine (per esempio un `.txt`) non si vede.
- Vanno bene i formati che il browser sa mostrare: PNG, JPEG, GIF (anche animate), SVG, WebP.

### Immagini mandate dal programma

Sull'ingresso **sorgente** può arrivare anche un'immagine intera, scritta come *data URL*: un testo che comincia con `data:image/jpeg;base64,` seguito dai dati dell'immagine. È quello che mandano [takePhoto (scatta foto)](hw.photo) e [Fotogrammi webcam (stream)](hw.webcamStream) sulla loro uscita **immagine**.

- Vanno bene solo PNG, JPEG, WebP e GIF (`data:image/png;base64,…`, `data:image/jpeg;base64,…`, `data:image/webp;base64,…`, `data:image/gif;base64,…`). SVG no, e nessun altro tipo di `data:`.
- Al massimo **2 MB** di testo (circa 1,5 MB di immagine): un'immagine più grande non si vede.
- Un data URL non valido (dati con caratteri sbagliati, tipo non ammesso, troppo grande) toglie l'immagine, senza errori.
- Una nuova immagine prende subito il posto della precedente: con i fotogrammi della webcam l'Immagine diventa un video a pochi fotogrammi al secondo. Le immagini mandate così non restano in memoria nella finestra.

**Dimensioni.** L'immagine si vede alla sua misura naturale, ma mai più larga della componente: se è più grande, si rimpicciolisce mantenendo le proporzioni. In una [Colonna](ui.column) con allineamento **tutta la larghezza** può quindi occupare tutta la larghezza della finestra; scegli un'immagine della misura che ti serve.

**Adatta** ha effetto solo quando l'immagine ha una larghezza e un'altezza fisse diverse dalle sue proporzioni, e l'IDE oggi non permette di dargliele (neanche in un'[Area libera](ui.free)): nella maggior parte delle finestre le due scelte si vedono uguali.

Se lo stesso programma cambia spesso immagine, ogni immagine mostrata resta in memoria nella finestra finché la finestra non si chiude.

## Esempi

### 1. Il logo in alto

```
Finestra «Ordini»
└ Colonna (radice)
  ├ Riga  Allineamento centro
  │ ├ Immagine   image1  Immagine «risorse/logo.png»  Descrizione «Logo della ditta Rossi»
  │ └ Etichetta  label1  Testo «Ordini del giorno»  Dimensione titolo
  └ Tabella      table1
```

Non serve l'oggetto: l'immagine è sempre la stessa. Copia `logo.png` (piccolo, per esempio 48 × 48 pixel) nella cartella **risorse** del progetto.

### 2. Un semaforo

Nella cartella **risorse** metti `verde.png`, `giallo.png` e `rosso.png`.

```
Finestra «Coda»
└ Colonna (radice)
  ├ Immagine        image1   Immagine «risorse/verde.png»  Descrizione «Stato della coda»
  └ Campo numerico  number1  Etichetta «Persone in coda»
```

```
[Campo numerico: Persone in coda] valore ──▶ a [Confronto (== ≠ < >): a > b] se vero  ──▶ invia [Costante · Variabile: risorse/rosso.png] valore ──▶ sorgente [Immagine: image1]
[Costante · Variabile: 10] valore ──▶ b                    se falso ──▶ invia [Costante · Variabile: risorse/verde.png] valore ──▶ sorgente
```

Con più di 10 persone l'immagine diventa rossa, altrimenti verde. I due blocchi [Costante · Variabile](core.value) sono di tipo testo e hanno l'ingresso **invia** collegato, quindi mandano il percorso solo dopo il confronto.

### 3. La webcam in una finestra

```
Finestra «Ingresso»
└ Colonna (radice)
  ├ Immagine       image1   Descrizione «Webcam dell'ingresso»
  └ Interruttore   toggle1  Etichetta «Webcam accesa»
```

```
[Interruttore: toggle1] valore ──▶ acceso [Fotogrammi webcam (stream): 2 al secondo, 320 × 240] immagine ──▶ sorgente [Immagine: image1]
```

Quando accendi l'[Interruttore](ui.toggle), la finestra mostra la webcam del computer dove gira lilOS, due fotogrammi al secondo; spegnendolo l'immagine resta ferma sull'ultimo. Serve il permesso per la webcam: vedi [Hardware](logicstudio-hardware).

## Accessibilità

La **Descrizione** è il testo alternativo dell'immagine. Lasciala vuota per un'immagine solo decorativa (i lettori di schermo la saltano); scrivila quando l'immagine dice qualcosa. Attenzione: quando lo schema cambia l'immagine, la descrizione resta quella delle proprietà. Nell'esempio del semaforo, affianca all'immagine un testo che dica lo stato a parole.

## Vedi anche

- [Etichetta](ui.label), [Spia](ui.lamp)
- [takePhoto (scatta foto)](hw.photo), [Fotogrammi webcam (stream)](hw.webcamStream), per le immagini della webcam
- [Progetti](ide/projects), per la cartella **risorse**
- [Componenti UI standard](logicstudio-ui)
