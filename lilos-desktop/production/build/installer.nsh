; The installation settings put next to the setup (lilos-install.json) go next to the program:
; at its first start the program reads them there (src/installFile.js).
!macro customInstall
  IfFileExists "$EXEDIR\lilos-install.json" 0 +2
    CopyFiles /SILENT "$EXEDIR\lilos-install.json" "$INSTDIR\lilos-install.json"
!macroend
