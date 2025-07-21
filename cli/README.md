# Semantest CLI

Command-line interface for the Semantest distributed testing framework.

## Installation

```bash
npm install -g semantest-cli
```

Or install from source:

```bash
cd cli
npm install
npm run build
npm link
```

## Configuration

Set the default server URL:

```bash
semantest-cli config --set server=ws://localhost:8080
```

View all configuration:

```bash
semantest-cli config --list
```

## Usage

### Send Events

Send a simple event:

```bash
semantest-cli event ImageRequested --param prompt="blue cat"
```

Send an event with multiple parameters:

```bash
semantest-cli event TestStarted --param suite=integration --param browser=chrome --param headless=true
```

### Check Server Status

```bash
semantest-cli status
```

With verbose output:

```bash
semantest-cli status --verbose
```

### Event Examples

```bash
# Image generation request
semantest-cli event ImageRequested --param prompt="sunset over mountains" --param size=1024x1024

# Test execution
semantest-cli event TestStarted --param suite=e2e --param browser=firefox
semantest-cli event TestCompleted --param suite=e2e --param passed=45 --param failed=2

# Browser automation
semantest-cli event NavigateTo --param url="https://example.com"
semantest-cli event ClickElement --param selector="#submit-button"
semantest-cli event TypeText --param selector="#search-input" --param text="test query"

# Custom events
semantest-cli event CustomAction --param action=screenshot --param filename="test.png"
```

## Environment Variables

- `SEMANTEST_SERVER` - Default WebSocket server URL (default: ws://localhost:8080)

## Options

### Global Options

- `-h, --help` - Display help
- `-V, --version` - Display version

### Event Command Options

- `-p, --param <key=value...>` - Event parameters in key=value format
- `-s, --server <url>` - Override server URL
- `-t, --timeout <ms>` - Response timeout in milliseconds (default: 30000)
- `-v, --verbose` - Enable verbose output

### Config Command Options

- `-g, --get <key>` - Get configuration value
- `-s, --set <key=value>` - Set configuration value
- `-l, --list` - List all configuration
- `-r, --reset` - Reset to defaults

### Status Command Options

- `-s, --server <url>` - Override server URL
- `-v, --verbose` - Enable verbose output

## Exit Codes

- `0` - Success
- `1` - Error (connection failed, timeout, etc.)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev event TestEvent --param foo=bar

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```