# logicstudio-collections

I blocchi di Logic Studio per **liste** e **matrici**.

Una **lista** (o array) è un elenco ordinato di valori; una **matrice** è una lista di righe della stessa lunghezza. Gli indici partono da 0 e un indice negativo conta dalla fine (-1 è l'ultimo). I blocchi non modificano mai la lista in ingresso: danno sempre una copia nuova. Una lista può avere al massimo 100000 elementi.

- **Liste**: Length, Leggi/Scrivi lista[i], Push · Unshift, Inserisci e Rimuovi (splice), Slice, Concat liste (con porte aggiungibili), Includes · IndexOf, Reverse, Sort (anche per un campo degli oggetti), Distinct, Filter, Map campo, Sum · Min · Max · Avg, Range, Split, Join, For each, Accumula (push con limite), Random.
- **Matrici**: Nuova matrice, Shape, Leggi/Scrivi m[r][c], Riga m[r], Colonna m[][c], Transpose, A + B, A − B, A × B, Scala (k·A), Identità (eye), Det (fino a 10×10), Reshape, Flatten.

I nomi richiamano le funzioni equivalenti dei linguaggi di programmazione (dalla 1.1.0).

Gli errori (indice fuori dalla lista, matrici di misure incompatibili…) escono dalla porta «Eccezione» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine`.
