# Immagine

`ui.image` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Mostra un'immagine presa dalla cartella del progetto: un logo, uno schema d'impianto, una foto che cambia secondo lo stato del programma.

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
| **sorgente** (`source`) | testo | Il percorso di un'altra immagine del progetto, per esempio `risorse/rosso.png`. Un testo vuoto toglie l'immagine. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

L'Immagine mostra **solo file del progetto**, mai indirizzi di internet né file fuori dalla cartella del progetto.

- Il percorso è **relativo alla cartella del progetto** (quella con il file `.lsproj`): `risorse/logo.png`, `risorse/icone/ok.svg`. Le barre `/` all'inizio non contano. Un percorso come `~/Immagini/foto.jpg` o `https://…` non mostra niente.
- Con l'ingresso **sorgente** puoi indicare anche un file fuori da **risorse**, purché sia dentro la cartella del progetto.
- Se il file non c'è, è una cartella o non si può leggere, l'immagine sparisce (senza errori).
- Un file che non è un'immagine (per esempio un `.txt`) non si vede.
- Vanno bene i formati che il browser sa mostrare: PNG, JPEG, GIF (anche animate), SVG, WebP.

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
[Campo numerico: Persone in coda] valore ──▶ a [Confronta: a > b] se vero  ──▶ invia [Valore: risorse/rosso.png] valore ──▶ sorgente [Immagine: image1]
[Valore: 10] valore ──▶ b                    se falso ──▶ invia [Valore: risorse/verde.png] valore ──▶ sorgente
```

Con più di 10 persone l'immagine diventa rossa, altrimenti verde. I due [Valori](core.value) sono di tipo testo, con **Invia all'avvio** spento.

## Accessibilità

La **Descrizione** è il testo alternativo dell'immagine. Lasciala vuota per un'immagine solo decorativa (i lettori di schermo la saltano); scrivila quando l'immagine dice qualcosa. Attenzione: quando lo schema cambia l'immagine, la descrizione resta quella delle proprietà. Nell'esempio del semaforo, affianca all'immagine un testo che dica lo stato a parole.

## Vedi anche

- [Etichetta](ui.label), [Spia](ui.lamp)
- [Progetti](ide/projects), per la cartella **risorse**
- [Componenti UI standard](logicstudio-ui)
