#!/usr/bin/env bash
# OnBrand API helper for agents without the MCP server. Needs ONBRAND_API_KEY.
set -euo pipefail
API="${ONBRAND_API_URL:-https://onbrand-api.vercel.app}/api/v1"
KEY="${ONBRAND_API_KEY:?Set ONBRAND_API_KEY (create one at /app/api-keys)}"
H=(-sS -H "X-API-Key: $KEY" -H "Content-Type: application/json")
j() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"; }
field() { python3 -c "import json,sys; d=json.load(sys.stdin); print(d$1)"; }

poll() { # poll URL until status completed|failed (handles 409 not_ready)
  for _ in $(seq 1 200); do
    out="$(curl "${H[@]}" -w '\n%{http_code}' "$1")"; code="${out##*$'\n'}"; body="${out%$'\n'*}"
    if [ "$code" = "424" ]; then echo "$body"; return 1; fi
    if [ "$code" = "200" ]; then
      st="$(printf '%s' "$body" | field '.get("status")')"
      if [ "$st" = "completed" ] || [ "$st" = "failed" ]; then printf '%s\n' "$body"; return 0; fi
    fi
    sleep 3
  done
  echo '{"error":"timed out"}'; return 1
}

cmd="${1:-help}"; shift || true
case "$cmd" in
  extract)   # extract URL [sections,comma,separated]  → waits, prints id + summary
    sec="${2:-}"; body="{\"url\": $(j "$1")${sec:+, \"sections\": $(python3 -c 'import json,sys; print(json.dumps(sys.argv[1].split(",")))' "$sec")}}"
    id="$(curl "${H[@]}" "$API/extract" -d "$body" | field '["id"]')"
    poll "$API/extract/$id/result?sections=identity" | python3 -c 'import json,sys; d=json.load(sys.stdin); i=(d.get("brand") or {}).get("identity") or {}; print(json.dumps({"id":d.get("id"),"status":d.get("status"),"brand":i.get("companyName"),"summary":i.get("summary"),"palette":d.get("palette"),"error":d.get("error")},indent=2))' ;;
  result)    curl "${H[@]}" "$API/extract/$1/result${2:+?sections=$2}" ;;
  brief)     curl "${H[@]}" "$API/extract/$1/brief" ;;
  tokens)    curl "${H[@]}" "$API/extract/$1/tokens?format=${2:-css}" ;;
  download)  curl "${H[@]}" "$API/extract/$1/download" ;;
  enhance)   curl "${H[@]}" "$API/enhance" -d "{\"extraction_id\": $(j "$1"), \"prompt\": $(j "$2")}" | field '["enhanced_prompt"]' ;;
  search)    curl "${H[@]}" "$API/search" -d "{\"query\": $(j "$1"), \"depth\": \"${2:-fast}\", \"top_k\": ${3:-6}}" ;;
  similar)   curl "${H[@]}" "$API/search/similar?extraction_id=$1&top_k=${2:-12}" ;;
  verify)    # verify REFERENCE_URL CANDIDATE_URL → waits, prints the verdict
    id="$(curl "${H[@]}" "$API/adherence" -d "{\"reference_url\": $(j "$1"), \"candidate_url\": $(j "$2")}" | field '["id"]')"
    poll "$API/adherence/$id/result" ;;
  verdict)   curl "${H[@]}" "$API/adherence/$1/result" ;;
  credits)   curl "${H[@]}" "$API/me" ;;
  *) echo "usage: onbrand.sh extract|result|brief|tokens|download|enhance|search|similar|verify|verdict|credits ..." ;;
esac
