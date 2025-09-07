# MCP Server Guide for Team

## Available MCP Servers

### 1. Playwright MCP (Browser Automation)
**For: Wences, Testing Team**

Available tools (via Playwright MCP):
- Navigate to URLs
- Click on elements  
- Fill in forms
- Take screenshots
- Evaluate JavaScript
- Wait for selectors

Note: Use the Playwright MCP server which should be available when using --play flag or through MCP integration

Example usage:
```
Use mcp_playwright_navigate to go to https://chat.openai.com
Use mcp_playwright_wait_for_selector to wait for textarea
Use mcp_playwright_fill to type in the prompt
Use mcp_playwright_click to click send button
```

### 2. Sequential MCP (Complex Analysis)
**For: Ana, Rafa**

Available tools:
- `mcp_sequential_thinking` - Multi-step analysis
- `mcp_sequential_planning` - Project planning
- `mcp_sequential_debugging` - Systematic debugging

### 3. Context7 MCP (Documentation)
**For: All team members**

Available tools:
- `mcp_context7_search_documentation` - Search library docs
- `mcp_context7_get_examples` - Get code examples
- `mcp_context7_best_practices` - Get best practices

### 4. Magic MCP (UI Components)
**For: Elena, Wences**

Available tools:
- `mcp_magic_create_component` - Generate UI components
- `mcp_magic_style_component` - Add styling
- `mcp_magic_responsive_design` - Make responsive

## How to Use MCP Tools

1. **Direct Usage**: Just mention the tool name and parameters
   Example: "Use mcp_playwright_navigate with url='chrome://extensions'"

2. **Check Available Tools**: Ask "What MCP tools are available?"

3. **Browser Connection**: The Chromium browser (PID 636725) is already running and authenticated

## Specific Instructions for Wences

To reload the Chrome extension:
1. `mcp_playwright_navigate` to 'chrome://extensions'
2. `mcp_playwright_screenshot` to see current state
3. `mcp_playwright_click` on the reload button for our extension
4. `mcp_playwright_navigate` to 'https://chat.openai.com'
5. Test your idle detection code

## Tips
- MCP tools work without any special flags now
- The browser is already authenticated with ChatGPT
- You can chain multiple MCP commands together
- Screenshots help verify what the browser sees