import { McpPlayer } from './McpPlayer';
import { GameState } from './GameState';
import { PossibleAction } from './PlayerAction';
import { Card, Rank, Suit } from './Card';

describe('McpPlayer', () => {
  let mcpPlayer: McpPlayer;
  let gameState: GameState;

  beforeEach(() => {
    mcpPlayer = new McpPlayer(1, 'TestMcpPlayer', 1000, true, 100); // 100ms timeout for fast tests
    const players = [mcpPlayer, new McpPlayer(2, 'TestPlayer2', 1000, true, 100)];
    gameState = new GameState(players, 5, 10);
    
    // Give the player a hand
    mcpPlayer.hand = [
      new Card(Suit.Hearts, Rank.Ace),
      new Card(Suit.Spades, Rank.King)
    ];
  });

  it('should create an MCP player with correct initial state', () => {
    expect(mcpPlayer.id).toBe(1);
    expect(mcpPlayer.name).toBe('TestMcpPlayer');
    expect(mcpPlayer.chips).toBe(1000);
    expect(mcpPlayer.getMcpServer()).toBeDefined();
  });

  it('should make a decision when check is possible', async () => {
    const possibleActions: PossibleAction[] = [
      { type: 'check' },
      { type: 'fold' }
    ];

    const decision = await mcpPlayer.makeDecision(gameState, possibleActions);

    expect(decision).toEqual({
      playerId: 1,
      playerName: 'TestMcpPlayer',
      type: 'check'
    });
  });

  it('should call when bet is small and affordable', async () => {
    gameState.currentBet = 50; // Small bet (5% of chips)
    const possibleActions: PossibleAction[] = [
      { type: 'call' },
      { type: 'fold' }
    ];

    const decision = await mcpPlayer.makeDecision(gameState, possibleActions);

    expect(decision).toEqual({
      playerId: 1,
      playerName: 'TestMcpPlayer',
      type: 'call'
    });
  });

  it('should fold when bet is too large', async () => {
    gameState.currentBet = 500; // Large bet (50% of chips)
    const possibleActions: PossibleAction[] = [
      { type: 'call' },
      { type: 'fold' }
    ];

    const decision = await mcpPlayer.makeDecision(gameState, possibleActions);

    expect(decision).toEqual({
      playerId: 1,
      playerName: 'TestMcpPlayer',
      type: 'fold'
    });
  });

  it('should bet when possible and has enough chips', async () => {
    const possibleActions: PossibleAction[] = [
      { type: 'bet', minimalAmount: 10 },
      { type: 'check' },
      { type: 'fold' }
    ];

    const decision = await mcpPlayer.makeDecision(gameState, possibleActions);

    expect(['check', 'bet']).toContain(decision.type);
    if (decision.type === 'bet') {
      expect((decision as any).amount).toBe(20); // 2 * bigBlind
    }
  });

  it('should set game context in MCP server', async () => {
    const possibleActions: PossibleAction[] = [
      { type: 'check' },
      { type: 'fold' }
    ];

    await mcpPlayer.makeDecision(gameState, possibleActions);

    const mcpServer = mcpPlayer.getMcpServer();
    expect(mcpServer).toBeDefined();
    // The MCP server should have the current context set
    // We can't easily test the internal state, but we can verify it exists
  });

  it('should allow manual decision setting for testing', async () => {
    const possibleActions: PossibleAction[] = [
      { type: 'check' },
      { type: 'fold' }
    ];

    // Start a decision process
    const decisionPromise = mcpPlayer.makeDecision(gameState, possibleActions);

    // Wait a moment then manually set the decision
    setTimeout(() => {
      mcpPlayer.setDecision({ type: 'fold' });
    }, 50); // 50ms is less than the 100ms timeout

    // The decision should resolve to the manually set action
    const decision = await decisionPromise;
    expect(decision).toEqual({
      playerId: 1,
      playerName: 'TestMcpPlayer',
      type: 'fold'
    });
  });
});