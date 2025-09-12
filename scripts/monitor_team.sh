#!/usr/bin/env bash
# Helper script for Ana to monitor team achievements

SESSION="chatgpt-dev-team"
TEAM=("Rafa:0" "Ana:1" "Wences:2" "Fran:3" "Elena:4" "Carlos:5")

echo "=== Team Status Report ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo ""

for member in "${TEAM[@]}"; do
    name="${member%%:*}"
    window="${member##*:}"
    
    echo "** $name (Window $window)"
    echo "Recent activity:"
    tmux capture-pane -t $SESSION:$window -p 2>/dev/null | tail -10 | grep -E "(commit|test|implement|fix|create|done|complete|success|built)" | head -3
    echo ""
done

echo "=== Key Achievements to Track ==="
echo "- Commits made (check git log in each module)"
echo "- Tests written (look for 'test:' commits)"
echo "- Features implemented"
echo "- Bottlenecks resolved"