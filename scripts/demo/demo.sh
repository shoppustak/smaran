#!/usr/bin/env bash
#
# Seed or tear down Smaran demo fixtures.
#
#   scripts/demo/demo.sh seed     --yes
#   scripts/demo/demo.sh teardown --yes
#
# Env:
#   DEMO_PUROHIT_PHONE  (required) purohit's WhatsApp number, digits only, exactly as
#                       Meta sends it in `from` — no '+', no spaces. e.g. 919876543210
#   DEMO_YAJMAN_PHONE   (optional) family-side number for the corroboration +
#                       subscription demo. Omit to skip the family half.
#   DEMO_UPI            (optional) purohit VPA shown in the dakshina deep link.
#   SMARAN_TARGET       prod (default) | dev
#
# Credentials are read from docs/db-creds (gitignored) straight into a variable and
# never printed. This writes to PRODUCTION by default — hence the required --yes.
set -euo pipefail

cd "$(dirname "$0")/../.."

CMD="${1:-}"
shift || true
CONFIRM="no"
for arg in "$@"; do [ "$arg" = "--yes" ] && CONFIRM="yes"; done

case "$CMD" in
  seed|teardown) ;;
  *) echo "usage: $0 {seed|teardown} --yes" >&2; exit 2 ;;
esac

: "${DEMO_PUROHIT_PHONE:?set DEMO_PUROHIT_PHONE (digits only, as Meta sends it, e.g. 919876543210)}"
DEMO_YAJMAN_PHONE="${DEMO_YAJMAN_PHONE:-}"
DEMO_UPI="${DEMO_UPI:-ramesh.sharma@okhdfcbank}"
SMARAN_TARGET="${SMARAN_TARGET:-prod}"

if [[ ! "$DEMO_PUROHIT_PHONE" =~ ^[0-9]{8,15}$ ]]; then
  echo "DEMO_PUROHIT_PHONE must be digits only (no '+'), 8-15 chars. Got: $DEMO_PUROHIT_PHONE" >&2
  echo "Meta sends 'from' without a plus — a mismatch here means the bot won't recognise you as the purohit." >&2
  exit 2
fi

if [ "$SMARAN_TARGET" = "prod" ]; then
  SECTION="### smaran-prod"; REF="yffhxgyvemwvfebwvztm"
else
  SECTION="### smaran-dev";  REF="ajzoxgjvtxhzzkgxxmxv"
fi

DB_PASS="$(awk -v s="$SECTION" '$0==s{f=1} f && /db pass/{print $NF; exit}' docs/db-creds)"
[ -n "$DB_PASS" ] || { echo "could not read the $SMARAN_TARGET password from docs/db-creds" >&2; exit 1; }
CONN="postgresql://postgres.${REF}:${DB_PASS}@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

echo "target      : $SMARAN_TARGET ($REF)"
echo "action      : $CMD"
echo "purohit     : $DEMO_PUROHIT_PHONE"
echo "yajman      : ${DEMO_YAJMAN_PHONE:-<none — family half of the demo will be skipped>}"
echo "marker      : locality_key = 'smaran-demo' (teardown only ever removes these)"

if [ "$CONFIRM" != "yes" ]; then
  echo
  echo "Refusing to touch $SMARAN_TARGET without --yes. Re-run with --yes to proceed." >&2
  exit 3
fi

if [ "$CMD" = "seed" ]; then
  psql "$CONN" -v ON_ERROR_STOP=1 \
    -v phone="$DEMO_PUROHIT_PHONE" \
    -v yajman_phone="$DEMO_YAJMAN_PHONE" \
    -v upi="$DEMO_UPI" \
    -f scripts/demo/seed-demo.sql
else
  psql "$CONN" -v ON_ERROR_STOP=1 \
    -v phone="$DEMO_PUROHIT_PHONE" \
    -f scripts/demo/teardown-demo.sql
fi
