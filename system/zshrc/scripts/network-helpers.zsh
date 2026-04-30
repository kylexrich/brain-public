myips() {
  local v4 v6
  v4=$(curl -s --max-time 2 -4 https://ifconfig.me)
  v6=$(curl -s --max-time 2 -6 https://ifconfig.me)
  [[ -z "$v4" ]] && v4="n/a"
  [[ -z "$v6" ]] && v6="n/a"
  printf 'IPv4: %s/32\nIPv6: %s/128\n' "$v4" "$v6"
}

killPort() {
  if [[ $# -eq 0 ]]; then
    echo "usage: killPort <port> [port ...]"
    return 1
  fi
  npx --yes kill-port "$@"
}

devurl() {
  local port="${1:-3000}"
  local ip=""

  # Try macOS first
  if command -v ipconfig >/dev/null 2>&1; then
    for iface in en0 en1; do
      ip=$(ipconfig getifaddr "$iface" 2>/dev/null) && break
    done
  fi

  # Fallback for Linux
  if [[ -z "$ip" ]] && command -v ip >/dev/null 2>&1; then
    ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '/src/ {print $7; exit}')
  fi

  if [[ -z "$ip" ]]; then
    echo "❌ Could not determine local LAN IP."
    return 1
  fi

  local url="http://$ip:$port/"

  echo "📡 Local dev URL:"
  echo "   $url"

  # If we can, also copy it to clipboard
  if command -v pbcopy >/dev/null 2>&1; then
    printf '%s' "$url" | pbcopy
    echo "   (Copied to clipboard)"
  elif command -v xclip >/dev/null 2>&1; then
    printf '%s' "$url" | xclip -selection clipboard
    echo "   (Copied to clipboard)"
  fi
}
