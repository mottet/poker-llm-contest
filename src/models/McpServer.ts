import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GameState } from "./GameState";
import { PossibleAction, PlayerActionType } from "./PlayerAction";
import { Player } from "./Player";

/**
 * MCP Server for Poker Game
 * Exposes poker game functionality through MCP tools and resources
 */
export class PokerMcpServer {
  private server: McpServer;
  private currentGameState: GameState | null = null;
  private currentPlayer: Player | null = null;
  private currentPossibleActions: PossibleAction[] = [];

  constructor() {
    this.server = new McpServer({
      name: "poker-game-server",
      version: "1.0.0",
    });

    this.registerTools();
    this.registerResources();
  }

  private registerTools() {
    // Tool for folding
    this.server.registerTool("fold",
      {
        title: "Fold",
        description: "Fold your hand and forfeit the current round",
        inputSchema: {}
      },
      async () => {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({ type: "fold" })
          }]
        };
      }
    );

    // Tool for calling
    this.server.registerTool("call",
      {
        title: "Call",
        description: "Match the current bet",
        inputSchema: {}
      },
      async () => {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({ type: "call" })
          }]
        };
      }
    );

    // Tool for checking
    this.server.registerTool("check",
      {
        title: "Check",
        description: "Pass the action to the next player without betting (only when no bet is required)",
        inputSchema: {}
      },
      async () => {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({ type: "check" })
          }]
        };
      }
    );

    // Tool for betting
    this.server.registerTool("bet",
      {
        title: "Bet",
        description: "Place a bet (when no one has bet yet)",
        inputSchema: {
          amount: z.number().min(1).describe("Amount to bet in chips")
        }
      },
      async ({ amount }) => {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({ type: "bet", amount })
          }]
        };
      }
    );

    // Tool for raising
    this.server.registerTool("raise",
      {
        title: "Raise",
        description: "Increase the current bet",
        inputSchema: {
          amount: z.number().min(1).describe("Amount to raise by (additional chips)")
        }
      },
      async ({ amount }) => {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({ type: "raise", amount })
          }]
        };
      }
    );

    // Tool for going all-in
    this.server.registerTool("all_in",
      {
        title: "All In",
        description: "Bet all remaining chips",
        inputSchema: {}
      },
      async () => {
        return {
          content: [{ 
            type: "text" as const, 
            text: JSON.stringify({ type: "allIn" })
          }]
        };
      }
    );
  }

  private registerResources() {
    // Resource for current game state
    this.server.registerResource(
      "game-state",
      "poker://game-state",
      {
        title: "Current Game State",
        description: "Information about the current poker game state",
        mimeType: "application/json"
      },
      async () => {
        if (!this.currentGameState || !this.currentPlayer) {
          return {
            contents: [{
              uri: "poker://game-state",
              text: JSON.stringify({ error: "No active game state" })
            }]
          };
        }

        const gameInfo = {
          player: {
            id: this.currentPlayer.id,
            name: this.currentPlayer.name,
            chips: this.currentPlayer.chips,
            hand: this.currentPlayer.hand.map(card => card.toString()),
            currentBet: this.currentPlayer.currentBet,
            totalHandRoundBet: this.currentPlayer.totalHandRoundBet,
            isActive: this.currentPlayer.isActive,
            isAllIn: this.currentPlayer.isAllIn,
            hasActed: this.currentPlayer.hasActed
          },
          gameState: {
            pot: this.currentGameState.pot,
            currentBet: this.currentGameState.currentBet,
            lastRaiseBy: this.currentGameState.lastRaiseBy,
            communityCards: this.currentGameState.communityCards.map(card => card.toString()),
            roundLog: this.currentGameState.roundLog,
            smallBlind: this.currentGameState.smallBlind,
            bigBlind: this.currentGameState.bigBlind,
            playersStack: this.currentGameState.playersStack()
          },
          possibleActions: this.currentPossibleActions.map(action => {
            if ('minimalAmount' in action) {
              return {
                type: action.type,
                minimalAmount: action.minimalAmount
              };
            }
            return { type: action.type };
          })
        };

        return {
          contents: [{
            uri: "poker://game-state",
            text: JSON.stringify(gameInfo, null, 2)
          }]
        };
      }
    );

    // Resource for possible actions
    this.server.registerResource(
      "possible-actions",
      "poker://possible-actions",
      {
        title: "Possible Actions",
        description: "List of actions the current player can take",
        mimeType: "application/json"
      },
      async () => {
        const actions = this.currentPossibleActions.map(action => {
          if ('minimalAmount' in action) {
            return {
              type: action.type,
              minimalAmount: action.minimalAmount,
              description: `${action.type} (minimum ${action.minimalAmount} chips)`
            };
          }
          return { 
            type: action.type,
            description: action.type
          };
        });

        return {
          contents: [{
            uri: "poker://possible-actions",
            text: JSON.stringify(actions, null, 2)
          }]
        };
      }
    );
  }

  /**
   * Update the current game context
   */
  setGameContext(gameState: GameState, player: Player, possibleActions: PossibleAction[]) {
    this.currentGameState = gameState;
    this.currentPlayer = player;
    this.currentPossibleActions = possibleActions;
  }

  /**
   * Get the MCP server instance
   */
  getServer(): McpServer {
    return this.server;
  }
}