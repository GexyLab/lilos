; The installation settings put next to the setup (lilos-install.json) go next to the program:
; at its first start the program reads them there (src/installFile.js).
!macro customInstall
  IfFileExists "$EXEDIR\lilos-install.json" 0 +2
    CopyFiles /SILENT "$EXEDIR\lilos-install.json" "$INSTDIR\lilos-install.json"
!macroend

; The lilos command the program put on the user's PATH (lilOS without UI: src/command.js) goes
; away with the program: without it, its Node is gone and the command would not start. Not on an
; update (the old version's uninstaller runs then too). The folder is the one path.ps1 wrote in
; HKCU\Software\GexyLab\lilOS; the uninstaller carries its own copy of path.ps1 (the program's is
; inside app.asar). lilOS and its data stay, as always (deleteAppDataOnUninstall: false).
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ReadRegStr $0 HKCU "Software\GexyLab\lilOS" "CommandPath"
    ${if} $0 != ""
      InitPluginsDir
      File "/oname=$PLUGINSDIR\lilos-path.ps1" "${PROJECT_DIR}\src\path.ps1"
      nsExec::Exec 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\lilos-path.ps1" remove'
      Pop $0
      Delete "$PLUGINSDIR\lilos-path.ps1"
    ${endIf}
  ${endIf}
!macroend
