#!/bin/bash
# ============================================================
# Login Reliability Stress Test
# Runs 100 consecutive login attempts and reports results.
# ============================================================

API_BASE="${API_BASE:-http://43.204.34.10:8000/api/v1}"
EMAIL="${TEST_EMAIL:-rahul.jha.work7@gmail.com}"
PASSWORD="${TEST_PASSWORD:-Qwerty@54321}"

success=0
failures=0
total_time=0

echo "=========================================="
echo " Login Reliability Stress Test"
echo "=========================================="
echo "API:      $API_BASE"
echo "Email:    $EMAIL"
echo "Attempts: 100"
echo "=========================================="
echo ""

for i in $(seq 1 100); do
    start=$(date +%s%N)

    response=$(curl -s -w "\n%{http_code}" \
        -X POST "$API_BASE/admin/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
        --max-time 10 2>/dev/null)

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    end=$(date +%s%N)
    elapsed_ms=$(( (end - start) / 1000000 ))

    if [ "$http_code" = "200" ]; then
        success=$((success + 1))
        total_time=$((total_time + elapsed_ms))
        if [ $((i % 10)) -eq 0 ]; then
            echo "  [$i] OK (${elapsed_ms}ms)"
        fi
    else
        failures=$((failures + 1))
        echo "  [$i] FAIL (${elapsed_ms}ms) - HTTP $http_code"
    fi
done

avg_time=0
if [ $success -gt 0 ]; then
    avg_time=$((total_time / success))
fi

echo ""
echo "=========================================="
echo " RESULTS"
echo "=========================================="
echo "  Success:  $success"
echo "  Failures: $failures"
echo "  Avg time: ${avg_time}ms"
echo ""

if [ "$failures" -eq 0 ]; then
    echo "  ✅ ALL PASSED — Login is reliable!"
    exit 0
else
    echo "  ❌ $failures FAILURES DETECTED — Investigate further."
    exit 1
fi
