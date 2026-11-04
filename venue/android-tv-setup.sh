#!/data/data/com.termux/files/usr/bin/bash
# Run once inside Termux on the Android TV:  curl -fsSL https://rebornwave.group/api/karaoke/android-setup.sh | bash
# The connector itself is downloaded from the app (/api/karaoke/bridge.mjs), so nothing has to be copied to the TV.
# The token comes from the app: Admin - Requests - Karaoke system - Make token. It is asked here and kept only in ~/karaoke/run.sh on the TV.
set -e

CLOUD_URL="https://rebornwave.group"
BOX_URL="http://192.168.100.4:8084/demo"
HOME_DIR="$HOME/karaoke"
BOOT_DIR="$HOME/.termux/boot"

termux-setup-storage || true
pkg update -y
pkg install -y nodejs termux-api curl

mkdir -p "$HOME_DIR" "$BOOT_DIR"
curl -fsSL "$CLOUD_URL/api/karaoke/bridge.mjs" -o "$HOME_DIR/karaoke-bridge.mjs"

read -r -p "Paste the karaoke token: " TOKEN < /dev/tty # the script itself may be piped in from curl

cat > "$HOME_DIR/run.sh" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
export CLOUD_URL="$CLOUD_URL" KARAOKE_TOKEN="$TOKEN" BOX_URL="$BOX_URL"
cd "$HOME_DIR"
while true; do node karaoke-bridge.mjs >> bridge.log 2>&1; sleep 5; done
EOF
chmod 700 "$HOME_DIR/run.sh"

# Termux:Boot (separate app) runs everything in this folder when the TV starts.
printf '#!/data/data/com.termux/files/usr/bin/bash\n"%s/run.sh" &\n' "$HOME_DIR" > "$BOOT_DIR/start-karaoke.sh"
chmod 700 "$BOOT_DIR/start-karaoke.sh"

echo "Done. Start it now with:  $HOME_DIR/run.sh &"
echo "Watch it with:  tail -f $HOME_DIR/bridge.log"
