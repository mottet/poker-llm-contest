import { Player } from "./Player";
import { GameState } from "./GameState";
import { FullPlayerAction, PossibleAction, PlayerAction } from "./PlayerAction";
import { PokerMcpServer } from "./McpServer";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

/**
 * Player that uses MCP (Model Context Protocol) to make poker decisions
 * This player exposes the game state and actions through MCP tools and resources
 * and waits for MCP client responses to make decisions
 */
export class McpPlayer extends Player {
  private mcpServer: PokerMcpServer;
  private transport: StdioServerTransport | null = null;
  private logName: string;
  private pendingDecision: {
    resolve: (action: FullPlayerAction) => void;
    reject: (error: Error) => void;
  } | null = null;
  private decisionTimeoutMs: number = 1000; // Default 1 second timeout

  constructor(
    id: number, 
    name: string, 
    chips: number, 
    showHandInLog: boolean = true,
    decisionTimeoutMs: number = 1000
  ) {
    super(id, name, chips, showHandInLog);
    this.mcpServer = new PokerMcpServer();
    this.logName = `${new Date().toISOString()}_mcp_${name}.log`;
    this.decisionTimeoutMs = decisionTimeoutMs;
    this.setupMcpServer();
  }

  private setupMcpServer() {
    // Register a handler to receive tool call results
    // This is a simplified approach - in a real MCP setup, the client would call tools
    // and we'd need to handle the responses through the MCP protocol
    const server = this.mcpServer.getServer();
    
    // For now, we'll use a timeout-based approach to simulate MCP client interaction
    // In a real implementation, this would be handled by the MCP protocol
  }

  async makeDecision(
    gameState: GameState,
    possibleActions: PossibleAction[]
  ): Promise<FullPlayerAction> {
    // Set the current game context in the MCP server
    this.mcpServer.setGameContext(gameState, this, possibleActions);

    // Log the game state for debugging
    await this.logToFile(this.logName, `\n--- Decision Request ---\n`);
    await this.logToFile(this.logName, `Player: ${this.name}\n`);
    await this.logToFile(this.logName, `Hand: ${this.hand.map(card => card.toString()).join(", ")}\n`);
    await this.logToFile(this.logName, `Chips: ${this.chips}\n`);
    await this.logToFile(this.logName, `Pot: ${gameState.pot}\n`);
    await this.logToFile(this.logName, `Current bet: ${gameState.currentBet}\n`);
    await this.logToFile(this.logName, `Community cards: ${gameState.communityCards.map(card => card.toString()).join(", ")}\n`);
    await this.logToFile(this.logName, `Possible actions: ${JSON.stringify(possibleActions)}\n`);
    await this.logToFile(this.logName, `Round log: ${gameState.roundLog}\n`);

    // Start MCP server if not already started
    if (!this.transport) {
      await this.startMcpServer();
    }

    try {
      // Wait for MCP client to make a decision via tool calls
      // For demo purposes, we'll implement a simple timeout-based fallback
      const action = await this.waitForMcpDecision(gameState, possibleActions);
      
      await this.logToFile(this.logName, `Decision: ${JSON.stringify(action)}\n`);

      return {
        playerId: this.id,
        playerName: this.name,
        ...action
      };
    } catch (error) {
      await this.logToFile(this.logName, `Error making decision: ${error}\n`);
      // Fallback to fold if something goes wrong
      return {
        playerId: this.id,
        playerName: this.name,
        type: "fold"
      };
    }
  }

  private async startMcpServer(): Promise<void> {
    try {
      this.transport = new StdioServerTransport();
      const server = this.mcpServer.getServer();
      
      // In a real implementation, you would connect to the MCP client here
      // For demo purposes, we'll just set up the server
      await this.logToFile(this.logName, `MCP Server ready for player ${this.name}\n`);
    } catch (error) {
      await this.logToFile(this.logName, `Failed to start MCP server: ${error}\n`);
      throw error;
    }
  }

  private async waitForMcpDecision(
    gameState: GameState,
    possibleActions: PossibleAction[]
  ): Promise<PlayerAction> {
    // This is a simplified implementation for demonstration
    // In a real MCP setup, the client would call the tools and we'd handle the responses
    
    return new Promise((resolve, reject) => {
      this.pendingDecision = { resolve: resolve as any, reject };

      // For demo purposes, implement a simple rule-based decision with configurable timeout
      // In a real implementation, this would wait for MCP client tool calls
      const timeoutId = setTimeout(() => {
        try {
          const decision = this.makeSimpleDecision(gameState, possibleActions);
          if (this.pendingDecision) {
            this.pendingDecision.resolve({
              playerId: this.id,
              playerName: this.name,
              ...decision
            });
            this.pendingDecision = null;
          }
        } catch (error) {
          if (this.pendingDecision) {
            this.pendingDecision.reject(error as Error);
            this.pendingDecision = null;
          }
        }
      }, this.decisionTimeoutMs);

      // Store timeout ID so it can be cleared if manual decision is made
      (this.pendingDecision as any).timeoutId = timeoutId;
    });
  }

  private makeSimpleDecision(gameState: GameState, possibleActions: PossibleAction[]): PlayerAction {
    // Simple rule-based decision for demo purposes
    // This would be replaced by MCP client tool calls in a real implementation
    
    const canCheck = possibleActions.some(action => action.type === 'check');
    const canCall = possibleActions.some(action => action.type === 'call');
    const canBet = possibleActions.some(action => action.type === 'bet');
    const canRaise = possibleActions.some(action => action.type === 'raise');

    // Very simple strategy: check if possible, otherwise call if cheap, otherwise fold
    if (canCheck) {
      return { type: "check" };
    }

    if (canCall && gameState.currentBet <= this.chips * 0.1) {
      return { type: "call" };
    }

    if (canBet && this.chips > gameState.bigBlind * 5) {
      return { type: "bet", amount: gameState.bigBlind * 2 };
    }

    return { type: "fold" };
  }

  private async logToFile(logFile: string, message: string): Promise<void> {
    const fs = require('fs').promises;
    try {
      await fs.appendFile(logFile, message);
    } catch (error) {
      console.error(`Failed to write to log file ${logFile}:`, error);
    }
  }

  /**
   * Get the MCP server instance (for testing or external control)
   */
  getMcpServer(): PokerMcpServer {
    return this.mcpServer;
  }

  /**
   * Manually set a decision (for testing purposes)
   */
  setDecision(action: PlayerAction): void {
    if (this.pendingDecision) {
      // Clear any existing timeout
      if ((this.pendingDecision as any).timeoutId) {
        clearTimeout((this.pendingDecision as any).timeoutId);
      }
      
      this.pendingDecision.resolve({
        playerId: this.id,
        playerName: this.name,
        ...action
      });
      this.pendingDecision = null;
    }
  }
}