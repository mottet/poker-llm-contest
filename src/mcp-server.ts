#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * Standalone MCP Server for Poker Game
 * 
 * This server can be used by MCP clients to play poker.
 * It exposes poker actions as tools and game state as resources.
 * 
 * Usage:
 * node dist/mcp-server.js
 * 
 * Or in an MCP client configuration:
 * {
 *   "mcpServers": {
 *     "poker": {
 *       "command": "node",
 *       "args": ["path/to/dist/mcp-server.js"]
 *     }
 *   }
 * }
 */

// Simple game state storage for demonstration
let gameState = {
  currentPlayer: null as any,
  gameInfo: null as any,
  possibleActions: [] as any[],
  lastAction: null as any
};

async function main() {
  const server = new McpServer({
    name: "poker-game-server",
    version: "1.0.0",
  });

  // Tool for getting game state
  server.registerTool("get_game_state",
    {
      title: "Get Game State",
      description: "Get the current poker game state including player hand, pot, community cards, and possible actions",
      inputSchema: {}
    },
    async () => {
      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify(gameState, null, 2)
        }]
      };
    }
  );

  // Tool for folding
  server.registerTool("fold",
    {
      title: "Fold",
      description: "Fold your hand and forfeit the current round",
      inputSchema: {}
    },
    async () => {
      gameState.lastAction = { type: "fold" };
      return {
        content: [{ 
          type: "text" as const, 
          text: "Action recorded: fold"
        }]
      };
    }
  );

  // Tool for calling
  server.registerTool("call",
    {
      title: "Call",
      description: "Match the current bet",
      inputSchema: {}
    },
    async () => {
      gameState.lastAction = { type: "call" };
      return {
        content: [{ 
          type: "text" as const, 
          text: "Action recorded: call"
        }]
      };
    }
  );

  // Tool for checking
  server.registerTool("check",
    {
      title: "Check",
      description: "Pass the action to the next player without betting (only when no bet is required)",
      inputSchema: {}
    },
    async () => {
      gameState.lastAction = { type: "check" };
      return {
        content: [{ 
          type: "text" as const, 
          text: "Action recorded: check"
        }]
      };
    }
  );

  // Tool for betting
  server.registerTool("bet",
    {
      title: "Bet",
      description: "Place a bet (when no one has bet yet)",
      inputSchema: {
        amount: z.number().min(1).describe("Amount to bet in chips")
      }
    },
    async ({ amount }) => {
      gameState.lastAction = { type: "bet", amount };
      return {
        content: [{ 
          type: "text" as const, 
          text: `Action recorded: bet ${amount} chips`
        }]
      };
    }
  );

  // Tool for raising
  server.registerTool("raise",
    {
      title: "Raise",
      description: "Increase the current bet",
      inputSchema: {
        amount: z.number().min(1).describe("Amount to raise by (additional chips)")
      }
    },
    async ({ amount }) => {
      gameState.lastAction = { type: "raise", amount };
      return {
        content: [{ 
          type: "text" as const, 
          text: `Action recorded: raise by ${amount} chips`
        }]
      };
    }
  );

  // Tool for going all-in
  server.registerTool("all_in",
    {
      title: "All In",
      description: "Bet all remaining chips",
      inputSchema: {}
    },
    async () => {
      gameState.lastAction = { type: "allIn" };
      return {
        content: [{ 
          type: "text" as const, 
          text: "Action recorded: all-in"
        }]
      };
    }
  );

  // Tool for analyzing hand strength
  server.registerTool("analyze_hand",
    {
      title: "Analyze Hand",
      description: "Get analysis of current hand strength and recommendations",
      inputSchema: {}
    },
    async () => {
      if (!gameState.currentPlayer || !gameState.gameInfo) {
        return {
          content: [{ 
            type: "text" as const, 
            text: "No active game to analyze"
          }]
        };
      }

      // Simple hand analysis based on available information
      const analysis = {
        hand: gameState.currentPlayer.hand || [],
        communityCards: gameState.gameInfo.communityCards || [],
        potOdds: gameState.gameInfo.pot > 0 ? (gameState.gameInfo.currentBet / gameState.gameInfo.pot) : 0,
        chipRatio: gameState.currentPlayer.chips > 0 ? (gameState.gameInfo.currentBet / gameState.currentPlayer.chips) : 0,
        recommendation: "analyze hand strength and pot odds"
      };

      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify(analysis, null, 2)
        }]
      };
    }
  );

  // Resource for current game state
  server.registerResource(
    "game-state",
    "poker://game-state",
    {
      title: "Current Game State",
      description: "Complete information about the current poker game state",
      mimeType: "application/json"
    },
    async () => {
      return {
        contents: [{
          uri: "poker://game-state",
          text: JSON.stringify(gameState, null, 2)
        }]
      };
    }
  );

  // Resource for poker rules and strategy
  server.registerResource(
    "poker-rules",
    "poker://rules",
    {
      title: "Poker Rules",
      description: "Texas Hold'em poker rules and basic strategy",
      mimeType: "text/plain"
    },
    async () => {
      const rules = `Texas Hold'em Poker Rules:

1. Each player receives 2 hole cards
2. There are 4 betting rounds: Pre-flop, Flop (3 community cards), Turn (1 card), River (1 card)
3. Players can: fold, check (if no bet), call (match bet), bet/raise
4. Best 5-card hand wins using hole cards + community cards

Basic Strategy:
- Play tight with strong starting hands (pairs, high cards)
- Consider pot odds when calling
- Position matters - play more hands in late position
- Observe opponents' betting patterns
- Manage your bankroll - don't risk too much on weak hands`;

      return {
        contents: [{
          uri: "poker://rules",
          text: rules
        }]
      };
    }
  );

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('MCP Server error:', error);
    process.exit(1);
  });
}