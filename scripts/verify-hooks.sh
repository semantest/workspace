#!/usr/bin/env bash

echo "=== Verifying Semantest Hooks ==="
echo

PROJECT_DIR="/home/chous/work/semantest"
HOOKS_DIR="$PROJECT_DIR/.claude/hooks"

# Check hooks directory
if [ ! -d "$HOOKS_DIR" ]; then
    echo "❌ Hooks directory missing: $HOOKS_DIR"
    exit 1
fi

echo "✓ Hooks directory exists"
echo

# List of required hooks
REQUIRED_HOOKS=(
    "all-to-scribe.sh"
    "agent-to-pm.sh"
    "blocker-detection.sh"
    "tool-usage-to-pm.sh"
    "tool-usage-to-scribe.sh"
    "notify-architect.sh"
)

# Check each hook
ALL_GOOD=true
for hook in "${REQUIRED_HOOKS[@]}"; do
    HOOK_PATH="$HOOKS_DIR/$hook"
    
    if [ ! -f "$HOOK_PATH" ]; then
        echo "❌ Missing: $hook"
        ALL_GOOD=false
    elif [ ! -x "$HOOK_PATH" ]; then
        echo "❌ Not executable: $hook"
        ALL_GOOD=false
    else
        # Check shebang
        SHEBANG=$(head -1 "$HOOK_PATH")
        if [ "$SHEBANG" != "#!/usr/bin/env bash" ]; then
            echo "❌ Wrong shebang in $hook: $SHEBANG"
            ALL_GOOD=false
        else
            echo "✓ $hook - OK"
        fi
    fi
done

echo
echo "=== Checking settings.json ==="

SETTINGS_FILE="$PROJECT_DIR/.claude/settings.json"
if [ ! -f "$SETTINGS_FILE" ]; then
    echo "❌ Missing settings.json"
    ALL_GOOD=false
else
    echo "✓ settings.json exists"
    
    # Check if hooks are configured
    if grep -q '"hooks"' "$SETTINGS_FILE"; then
        echo "✓ Hooks configured in settings.json"
    else
        echo "❌ No hooks section in settings.json"
        ALL_GOOD=false
    fi
fi

echo
if [ "$ALL_GOOD" = true ]; then
    echo "✅ All hooks verified successfully!"
else
    echo "❌ Some issues found. Please run the fix script."
fi