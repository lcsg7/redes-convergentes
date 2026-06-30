#!/usr/bin/env bash
# Aplica/remove degradacao de rede na interface loopback (lo), por onde trafega
# todo o lab (network_mode: host -> navegador <-> asterisk em 127.0.0.1).
#
# Uso:
#   sudo bash scripts/netem.sh apply <delay_ms> <loss_pct> [tag]
#   sudo bash scripts/netem.sh clear
#   sudo bash scripts/netem.sh status
#
# A 'tag' e gravada em metrics/tag.txt e o chat-server a anexa a cada chamada
# no metrics.csv, rotulando os dados com o perfil de rede ativo.
set -euo pipefail

IFACE="lo"
METRICS_DIR="$(cd "$(dirname "$0")/.." && pwd)/metrics"
mkdir -p "$METRICS_DIR"

case "${1:-}" in
  apply)
    DELAY="${2:-0}"; LOSS="${3:-0}"; TAG="${4:-delay${DELAY}_loss${LOSS}}"
    tc qdisc replace dev "$IFACE" root netem delay "${DELAY}ms" loss "${LOSS}%"
    echo "$TAG" > "$METRICS_DIR/tag.txt"
    echo "[netem] aplicado em $IFACE: delay=${DELAY}ms loss=${LOSS}%  (tag=$TAG)"
    ;;
  clear)
    tc qdisc del dev "$IFACE" root 2>/dev/null || true
    echo "baseline" > "$METRICS_DIR/tag.txt"
    echo "[netem] limpo em $IFACE (tag=baseline)"
    ;;
  status)
    tc qdisc show dev "$IFACE"
    echo "tag atual: $(cat "$METRICS_DIR/tag.txt" 2>/dev/null || echo baseline)"
    ;;
  *)
    echo "uso: sudo bash $0 apply <delay_ms> <loss_pct> [tag] | clear | status"
    exit 1
    ;;
esac
