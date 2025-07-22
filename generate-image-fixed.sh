#!/usr/bin/env bash

# Set NODE_PATH to include the home directory node_modules
export NODE_PATH="$HOME/node_modules:$NODE_PATH"

# Run the original script with all arguments
"$(dirname "$0")/generate-image.sh" "$@"