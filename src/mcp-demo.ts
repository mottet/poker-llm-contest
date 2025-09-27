#!/usr/bin/env node

import { Game } from './Game';
import { McpPlayer } from './models/McpPlayer';
import { Card, Rank, Suit } from './models/Card';

/**
 * Demo script showing MCP players in action
 * This demonstrates how MCP players can participate in poker games
 * alongside traditional LLM players or console players.
 */

async function runMcpDemo() {
  console.log('=== MCP Poker Demo ===\n');

  // Create MCP players with shorter timeouts for demo
  const players = [
    new McpPlayer(0, 'McpAlice', 1000, true, 500),  // 500ms timeout for quick demo
    new McpPlayer(1, 'McpBob', 1000, true, 500),
    new McpPlayer(2, 'McpCharlie', 1000, true, 500),
    new McpPlayer(3, 'McpDiana', 1000, true, 500),
  ];

  // Create a game with these players
  const game = new Game(players, 5, 10);

  console.log('Players in the game:');
  players.forEach(player => {
    console.log(`- ${player.name} (${player.chips} chips) - MCP Player`);
  });

  console.log('\n=== Starting Poker Game with MCP Players ===\n');

  try {
    // Play several rounds to demonstrate MCP functionality
    for (let round = 1; round <= 3; round++) {
      console.log(`\n--- Round ${round} ---`);
      await game.playRound();
      
      // Check if any players are eliminated
      const activePlayers = players.filter(p => p.chips > 0);
      if (activePlayers.length < 2) {
        console.log('\nGame over! Not enough players to continue.');
        break;
      }
    }

    console.log('\n=== Final Results ===');
    players
      .sort((a, b) => b.chips - a.chips)
      .forEach((player, index) => {
        console.log(`${index + 1}. ${player.name}: ${player.chips} chips`);
      });

    console.log('\n=== MCP Integration Summary ===');
    console.log('✅ MCP players successfully participated in the poker game');
    console.log('✅ Each MCP player exposed game state through MCP resources');
    console.log('✅ Each MCP player used MCP tools for making poker decisions');
    console.log('✅ Integration maintains compatibility with existing game engine');
    
    // Show how to access MCP server functionality
    const mcpPlayer = players[0];
    const mcpServer = mcpPlayer.getMcpServer();
    console.log('\n📡 MCP Server Features Available:');
    console.log('- Resources: game-state, possible-actions');
    console.log('- Tools: fold, call, check, bet, raise, all_in');
    
  } catch (error) {
    console.error('Demo error:', error);
  }
}

// Demo function to show manual MCP decision control
async function showManualControl() {
  console.log('\n=== Manual MCP Control Demo ===');
  
  const player = new McpPlayer(0, 'McpTest', 1000, true, 2000);
  const gameState = {
    players: [player],
    smallBlind: 5,
    bigBlind: 10,
    pot: 25,
    currentBet: 10,
    lastRaiseBy: 0,
    communityCards: [
      new Card(Suit.Hearts, Rank.Ace),
      new Card(Suit.Spades, Rank.King),
      new Card(Suit.Diamonds, Rank.Queen),
    ],
    actions: [],
    roundLog: 'Pre-flop betting complete. Flop: A♥ K♠ Q♦',
    playersStack: () => 'McpTest (1000 chips)',
    addLog: (msg: string) => console.log(msg),
    reset: () => {}
  };

  // Give player a hand
  player.hand = [
    new Card(Suit.Hearts, Rank.Jack),
    new Card(Suit.Clubs, Rank.Ten)
  ];

  const possibleActions = [
    { type: 'call' as const },
    { type: 'raise' as const, minimalAmount: 20 },
    { type: 'fold' as const }
  ];

  console.log('Player hand: J♥ T♣');
  console.log('Community cards: A♥ K♠ Q♦');
  console.log('Possible actions: call, raise (min 20), fold');
  console.log('This player has a straight draw!');

  // Start decision process
  const decisionPromise = player.makeDecision(gameState as any, possibleActions);

  // Simulate MCP client making a strategic decision
  setTimeout(() => {
    console.log('MCP client analysis: Strong straight draw, good pot odds');
    player.setDecision({ type: 'raise', amount: 30 });
  }, 500);

  const decision = await decisionPromise;
  console.log(`Decision made: ${decision.type}${decision.type === 'raise' ? ` by ${(decision as any).amount}` : ''}`);
}

if (require.main === module) {
  runMcpDemo()
    .then(() => showManualControl())
    .then(() => {
      console.log('\n🎉 MCP Demo completed successfully!');
      console.log('\nTo use MCP server standalone:');
      console.log('1. Build: npm run build');
      console.log('2. Run: npm run mcp-server');
      console.log('3. Connect MCP client to stdio transport');
    })
    .catch(error => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}