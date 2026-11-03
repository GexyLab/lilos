# Documentazione interna

Per chi mantiene lilOS: perché è fatto così, a che punto è, come si lavora.

- [Decisioni](decisioni.md): le scelte di architettura, le alternative scartate e quando conviene ripensarle.
- [Stato e roadmap](stato-e-roadmap.md): cosa c'è, i limiti noti, i prossimi passi.
- [Processo](processo.md): verifica delle modifiche, git, rilascio.

## Il progetto in breve

lilOS è un desktop web. Al posto di uno schermo fisso, i contenuti stanno su una **scrivania infinita** con zoom, pensata per il lavoro: interfaccia densa, poco spazio sprecato, molta area utile.

Obiettivi:

1. Finestre, app web, file e cartelle su una scrivania con zoom e spostamento.
2. Basi riutilizzabili: canvas, componenti, menu, persistenza ed eventi, su cui costruire tutto il resto.
3. Nessuna dipendenza a runtime finché non serve davvero.

Riferimenti:

- Repository: https://github.com/GexyLab/lilos
- Repository ufficiale dei pacchetti, app e moduli già costruiti (privato; File Manager, Editor, Pannello di controllo, AppStore, Pianificazione): https://github.com/GexyLab/lilos-plugins-official. I sorgenti stanno nel repository lilOS, sotto `plugins/` ([D71](decisioni.md#d71-i-sorgenti-delle-app-ufficiali-e-dei-moduli-stanno-nel-repository-di-lilos-sotto-plugins)).
- Mockup visivo delle finestre e delle app: `design/mockup.html` (da aprire direttamente nel browser).
