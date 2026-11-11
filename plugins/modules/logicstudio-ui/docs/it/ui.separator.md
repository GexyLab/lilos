# Separatore

`ui.separator` · Contenitori · [Componenti UI standard](logicstudio-ui) · versione 1

Una linea orizzontale sottile, o uno spazio vuoto, tra due componenti di una colonna.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Tipo** | linea, spazio | linea | **linea**: una riga sottile grigia, con un po' di spazio sopra e sotto. **spazio**: uno spazio vuoto. |
| **Dimensione (px)** | da 0 a 200 | 12 | L'altezza dello **spazio**. Con il tipo **linea** non conta (vedi sotto). |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro (si nota appena). Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde: lo spazio o la linea spariscono. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Exception** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

A differenza degli altri contenitori, il Separatore ha un oggetto che si può creare dall'IDE (non contiene niente: è un contenitore solo di nome).

## Come funziona

- **linea**: è sempre spessa 1 pixel, con 6 pixel di spazio sopra e sotto, larga quanto la colonna. La **Dimensione** non la cambia.
- **spazio**: un vuoto alto **Dimensione** pixel. Si somma allo **Spazio tra** della colonna: in una colonna con 10 px di spazio tra i pezzi, un separatore di 12 px dà 10 + 12 + 10 = 32 px tra le due componenti.
- **Funziona solo in verticale.** In una [Riga](ui.row) il separatore non ha larghezza e non si vede (né la linea né lo spazio). Per spaziare dentro una riga, usa lo **Spazio tra** della riga.
- La **linea** si vede solo in una colonna con allineamento **tutta la larghezza** (come la radice e il [Riquadro](ui.group)). In una [Colonna](ui.column) allineata a inizio, centro o fine, la linea non ha larghezza e sparisce; lo **spazio** invece funziona.
- In una [Griglia](ui.grid) il separatore occupa una cella come gli altri pezzi.

## Esempi

### 1. Separare due parti di un modulo

```
Finestra «Profilo»
└ Colonna (radice)
  ├ Campo di testo  text1  Etichetta «Nome»
  ├ Campo di testo  text2  Etichetta «Email»
  ├ Separatore      separator1  Tipo linea
  ├ Casella di spunta checkbox1 Etichetta «Ricevi le notizie»
  └ Pulsante        button1  Testo «Salva»
```

Una linea sottile divide i dati personali dalle preferenze.

### 2. Più aria prima dei pulsanti, e una parte che compare

```
Finestra «Ricerca»
└ Colonna (radice)
  ├ Campo di testo  text1       Etichetta «Cerca»
  ├ Separatore      separator1  Tipo spazio  Dimensione 24
  └ Riga
    ├ Pulsante  button1  Testo «Cerca»
    └ Pulsante  button2  Testo «Annulla»  Aspetto normale
```

I pulsanti stanno più staccati dal campo. Se crei l'oggetto del separatore e mandi `false` a **visibile**, lo spazio sparisce e i pulsanti risalgono vicino al campo.

## Vedi anche

- [Colonna](ui.column), [Riquadro](ui.group)
- [Componenti UI standard](logicstudio-ui)
