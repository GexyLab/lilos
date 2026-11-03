#!/bin/sh
# Adds the session «lilOS» to the login screen (run once, as root: sudo sh install-session.sh).
# It needs cage (apt install cage / dnf install cage). Remove it with: sudo rm /usr/share/wayland-sessions/lilos.desktop
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
command -v cage >/dev/null 2>&1 || echo "Attenzione: cage non è installato (apt install cage / dnf install cage)."
chmod 755 "$HERE/lilos-session"
mkdir -p /usr/share/wayland-sessions
cat > /usr/share/wayland-sessions/lilos.desktop <<EOF
[Desktop Entry]
Name=lilOS
Comment=lilOS come desktop intero
Exec=$HERE/lilos-session
Type=Application
DesktopNames=lilOS
EOF
echo "Sessione lilOS aggiunta: scegli «lilOS» nella schermata di accesso."
