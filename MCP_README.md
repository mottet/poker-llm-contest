# Model Context Protocol (MCP) Integration

This poker game now supports the Model Context Protocol (MCP), allowing LLMs to play poker through structured tool calls and resource access instead of text-based prompts.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is a standard that allows applications to provide context and functionality to LLMs in a structured way. Instead of using text prompts, LLMs can use tools and access resources through a well-defined protocol.

## MCP Features in Poker Game

### 🛠️ Tools Available

The MCP server exposes the following poker action tools:

- **`fold`** - Fold your hand and forfeit the current round
- **`call`** - Match the current bet
- **`check`** - Pass action without betting (when no bet is required)
- **`bet`** - Place a bet with specified amount
- **`raise`** - Increase the current bet by specified amount
- **`all_in`** - Bet all remaining chips
- **`analyze_hand`** - Get hand analysis and recommendations

### 📚 Resources Available

- **`poker://game-state`** - Complete current game state including:
  - Player information (hand, chips, position)
  - Game information (pot, current bet, community cards)
  - Possible actions with constraints
  - Round history

- **`poker://possible-actions`** - List of valid actions for current player

- **`poker://rules`** - Texas Hold'em rules and basic strategy guide

## Usage

### 1. Using MCP Players in Game

```typescript
import { Game } from './Game';
import { McpPlayer } from './models/McpPlayer';

// Create MCP players
const players = [
  new McpPlayer(0, 'McpBot1', 1000, true, 2000), // 2 second timeout
  new McpPlayer(1, 'McpBot2', 1000, true, 2000),
  // Mix with other player types...
];

const game = new Game(players);
await game.playRound();
```

### 2. Standalone MCP Server

Run the standalone MCP server that LLM clients can connect to:

```bash
# Build the project
npm run build

# Start MCP server
npm run mcp-server
```

### 3. MCP Client Configuration

Configure your MCP client to connect to the poker server:

```json
{
  "mcpServers": {
    "poker": {
      "command": "node",
      "args": ["path/to/dist/mcp-server.js"]
    }
  }
}
```

### 4. Demo

Run the interactive demo to see MCP integration in action:

```bash
npm run mcp-demo
```

## MCP vs Traditional LLM Integration

| Aspect | Traditional (Text Prompts) | MCP Integration |
|--------|---------------------------|-----------------|
| **Interface** | Text parsing of responses | Structured tool calls |
| **Reliability** | Prone to parsing errors | Type-safe, validated actions |
| **Context** | Text description | Structured resources |
| **Debugging** | Parse response strings | Inspect tool call parameters |
| **Extensibility** | Modify prompt templates | Add new tools/resources |

## Example MCP Interaction

1. **LLM requests game state**: Calls `get_game_state` tool
2. **Server responds** with structured JSON:
   ```json
   {
     "player": {
       "hand": ["A♥", "K♠"],
       "chips": 950,
       "position": "button"
     },
     "gameState": {
       "pot": 45,
       "currentBet": 10,
       "communityCards": ["Q♥", "J♠", "T♣"]
     },
     "possibleActions": [
       {"type": "call"},
       {"type": "raise", "minimalAmount": 20},
       {"type": "fold"}
     ]
   }
   ```
3. **LLM analyzes** structured data (has straight draw!)
4. **LLM calls action tool**: `raise` with `amount: 30`
5. **Server validates** and executes action

## Benefits of MCP Integration

✅ **Type Safety**: All actions are validated with schemas  
✅ **Structured Data**: No more text parsing errors  
✅ **Rich Context**: LLMs get complete game state information  
✅ **Extensible**: Easy to add new tools and resources  
✅ **Debuggable**: Clear tool calls and parameters  
✅ **Interoperable**: Works with any MCP-compliant client  
✅ **Backward Compatible**: Existing LLM players continue to work  

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │    │   MCP Server    │    │   Poker Game    │
│   (LLM/AI)      │◄──►│   (Protocol)    │◄──►│   (Engine)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                        │                        │
       │                        │                        │
   Tool Calls              Tool Handlers            Game Logic
   Resources               Resource Providers       State Management
```

## Implementation Details

- **McpServer.ts**: Defines MCP tools and resources for poker actions
- **McpPlayer.ts**: Player class that uses MCP protocol for decisions  
- **mcp-server.ts**: Standalone MCP server for external clients
- **Backward Compatibility**: Existing LLM players (OpenAI, Anthropic, etc.) continue to work unchanged

The MCP integration provides a modern, structured approach to LLM-game interaction while maintaining full compatibility with existing implementations.