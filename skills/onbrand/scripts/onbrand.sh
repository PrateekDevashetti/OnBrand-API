#!/usr/bin/env bash
# OnBrand API helper for agents without the MCP server.
set -euo pipefail
API="${ONBRAND_API_URL:-https://onbrand.trycanopy.space}/api/v1"
KEY="${ONBRAND_API_KEY:?Set ONBRAND_API_KEY (create one at /app/api-keys)}"
H=(-sS -H "Authorization: Bearer $KEY" -H "Content-Type: application/json")
json() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }

cmd="${1:-help}"; shift || true
case "$cmd" in
  extract) curl "${H[@]}" "$API/extract?wait=true" -d "{\"url\": $(json "$1"), \"depth\": \"${2:-light}\"}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); b=d.get("brand") or {}; i=b.get("identity") or {}; print(json.dumps({"id":d.get("id"),"status":d.get("status"),"company":i.get("companyName"),"summary":i.get("summary"),"palette":d.get("palette"),"error":d.get("error")},indent=2))' ;;
  get)     curl "${H[@]}" "$API/extract/$1" ;;
  brief)   curl "${H[@]}" "$API/extract/$1/brief" ;;
  tokens)  curl "${H[@]}" "$API/extract/$1/tokens?format=${2:-css}" ;;
  enhance) curl "${H[@]}" "$API/extract/$1/enhance" -d "{\"prompt\": $(json "$2")}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("prompt",""))' ;;
  search)  curl "${H[@]}" "$API/search" -d "{\"query\": $(json "$1"), \"depth\": \"${2:-light}\"}" ;;
  verify)  curl "${H[@]}" "$API/adherence?wait=true" -d "{\"reference\": $(json "$1"), \"design\": $(json "$2")}" ;;
  credits) curl "${H[@]}" "$API/me" ;;
  *) echo "usage: onbrand.sh extract|get|brief|tokens|enhance|search|verify|credits ..." ;;
esac
