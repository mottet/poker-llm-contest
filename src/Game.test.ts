// Game.test.ts

import { Game } from './Game';
import { Player } from './models/Player';
import { Deck } from './models/Deck';
import { GameState } from './models/GameState';
import { Card } from './models/Card';
import { FullPlayerAction, PlayerActionType } from './models/PlayerAction';
import { rankingHands } from './rankingHands';

jest.mock('./models/Deck');
jest.mock('./rankingHands');

// Mock implementation for Deck
(Deck as jest.Mock).mockImplementation(() => {
  return {
    shuffle: jest.fn(),
    deal: jest.fn().mockReturnValue({ suit: 'Hearts', rank: '2' }), // Mocked card
  };
});

// Mock implementation for rankingHands
(rankingHands as jest.Mock).mockImplementation((players: Player[], communityCards: Card[]) => {
  return [
    {
      players: [players[1]],
    },
    {
      players: [players[2]],
    },
    {
      players: [players[0]],
    },
  ];
});

// MockPlayer class to control player decisions
class MockPlayer extends Player {
  private decisions: FullPlayerAction[] = [];
  private decisionIndex: number = 0;

  constructor(id: number, name: string, chips: number) {
    super(id, name, chips);
  }

  addDecision(action: FullPlayerAction) {
    this.decisions.push(action);
  }

  async makeDecision(gameState: GameState, possibleActions: PlayerActionType[]): Promise<FullPlayerAction> {
    if (this.decisionIndex >= this.decisions.length) {
      // Default to 'fold' if no more decisions
      return {
        type: 'fold',
        playerId: this.id,
        playerName: this.name,
      };
    }
    const action = this.decisions[this.decisionIndex];
    this.decisionIndex++;
    return action;
  }
}

describe('Game class', () => {
  let players: MockPlayer[];
  let game: Game;

  beforeEach(() => {
    // Initialize mock players without decisions
    players = [
      new MockPlayer(1, 'Alice', 1000),
      new MockPlayer(2, 'Bob', 1000),
      new MockPlayer(3, 'Charlie', 1000),
      new MockPlayer(4, 'Diana', 1000),
    ];
    // Create a new game with the players
    game = new Game(players);
  });

  it('should initialize the game correctly', () => {
    expect(game).toBeDefined();
    expect(game['players'].length).toBe(4);
  });

  it('should make blinds pay correctly', () => {
    game['gameState'].smallBlind = 5;
    game['gameState'].bigBlind = 10;
    (game as any).makeBlindsPay();

    expect(players[0].chips).toBe(995); // Alice pays small blind
    expect(players[0].totalRoundBet).toBe(5);
    expect(players[1].chips).toBe(990); // Bob pays big blind
    expect(players[1].totalRoundBet).toBe(10);
    expect(game['gameState'].pot).toBe(15);
    expect(game['gameState'].currentBet).toBe(10);
  });

  // it('should process a betting round correctly', async () => {
  //   game['gameState'].currentBet = 10;
  //   await (game as any).bettingRound(true);

  //   // Check that all players have acted
  //   players.forEach((player) => {
  //     expect(player.hasActed).toBe(true);
  //   });

  //   // Check that the pot has increased accordingly
  //   expect(game['gameState'].pot).toBeGreaterThan(15);
  // });

  it('should create side pots correctly', () => {
    // Set up players with different bets
    players[0].totalRoundBet = 100;
    players[1].totalRoundBet = 200;
    players[2].totalRoundBet = 300;
    players[3].totalRoundBet = 400;

    const sidePots = (game as any).createSidePots();

    expect(sidePots.length).toBe(4);

    expect(sidePots[0]).toEqual({
      amount: 400,
      players: [players[0], players[1], players[2], players[3]],
    });

    expect(sidePots[1]).toEqual({
      amount: 300,
      players: [players[1], players[2], players[3]],
    });

    expect(sidePots[2]).toEqual({
      amount: 200,
      players: [players[2], players[3]],
    });

    expect(sidePots[3]).toEqual({
      amount: 100,
      players: [players[3]],
    });
  });

  it('should eliminate players with zero chips and rotate blinds', () => {
    // Set up players with varying chips
    players[0].chips = 0; // Alice is out
    players[1].chips = 500;
    players[2].chips = 1000;
    players[3].chips = 0; // Diana is out

    (game as any).eliminatePlayersAndMoveBlinds();

    expect(game['players'].length).toBe(2);
    expect(game['players'][0].name).toBe('Bob');
    expect(game['players'][1].name).toBe('Charlie');
  });

  it('should eliminate players with zero chips and rotate blinds without skipping player in edge cases', () => {
    // Set up players with varying chips
    players[0].chips = 500;
    players[1].chips = 0; // Bob is out
    players[2].chips = 1000;
    players[3].chips = 0; // Diana is out

    (game as any).eliminatePlayersAndMoveBlinds();

    expect(game['players'].length).toBe(2);
    expect(game['players'][0].name).toBe('Charlie');
    expect(game['players'][1].name).toBe('Alice');
  });

  it('should play a full round with players making decisions in order', async () => {

    // --- Pre-Flop Betting Round ---
    // Small blind (Alice) and big blind (Bob) have already posted blinds
    // Action starts with player after big blind, which is Charlie (index 2)

    // Pre-Flop actions
    players[2].addDecision({ type: 'call', playerId: 3, playerName: 'Charlie' });
    players[3].addDecision({ type: 'call', playerId: 4, playerName: 'Diana' });
    players[0].addDecision({ type: 'call', playerId: 1, playerName: 'Alice' });
    players[1].addDecision({ type: 'check', playerId: 2, playerName: 'Bob' });

    // --- Flop Betting Round ---
    // Action starts with first active player after the dealer (typically small blind)

    players[0].addDecision({ type: 'check', playerId: 1, playerName: 'Alice' });
    players[1].addDecision({ type: 'bet', playerId: 2, playerName: 'Bob', amount: 50 });
    players[2].addDecision({ type: 'call', playerId: 3, playerName: 'Charlie' });
    players[3].addDecision({ type: 'fold', playerId: 4, playerName: 'Diana' });
    players[0].addDecision({ type: 'call', playerId: 1, playerName: 'Alice' });

    // --- Turn Betting Round ---

    players[0].addDecision({ type: 'check', playerId: 1, playerName: 'Alice' });
    players[1].addDecision({ type: 'check', playerId: 2, playerName: 'Bob' });
    players[2].addDecision({ type: 'bet', playerId: 3, playerName: 'Charlie', amount: 100 });
    players[0].addDecision({ type: 'fold', playerId: 1, playerName: 'Alice' });
    players[1].addDecision({ type: 'call', playerId: 2, playerName: 'Bob' });

    // --- River Betting Round ---

    players[1].addDecision({ type: 'check', playerId: 2, playerName: 'Bob' });
    players[2].addDecision({ type: 'bet', playerId: 3, playerName: 'Charlie', amount: 200 });
    players[1].addDecision({ type: 'fold', playerId: 2, playerName: 'Bob' });

    // Now play the round
    await game.playRound();

    // After the round, pot should be zero
    expect(game['gameState'].pot).toBe(0);

    // Players' chips should reflect the outcome
    const totalChips = players.reduce((sum, player) => sum + player.chips, 0);
    expect(totalChips).toBe(4000); // Total chips remain constant

    // Check the final chip counts for each player
    expect(players[0].chips).toBe(940);
    expect(players[1].chips).toBe(840);
    expect(players[2].chips).toBe(1230);
    expect(players[3].chips).toBe(990);
  });

});

describe('Game class with all-in scenario', () => {
  let players: MockPlayer[];
  let game: Game;

  beforeEach(() => {
    // Initialize players
    players = [
      new MockPlayer(1, 'Alice', 500),
      new MockPlayer(2, 'Bob', 1000),
      new MockPlayer(3, 'Charlie', 200),
      new MockPlayer(4, 'Diana', 800),
    ];
    game = new Game(players, 100, 200);
  });

  it('should handle all-in situations correctly', async () => {
    // Add decisions to simulate an all-in scenario

    // --- Pre-Flop Betting Round ---
    // Small blind (Alice) and big blind (Bob)
    // Action starts with Charlie

    // Pre-Flop actions
    players[2].addDecision({ type: 'call', playerId: 3, playerName: 'Charlie' }); // Charlie calls with 200 (all-in)
    players[3].addDecision({ type: 'raise', playerId: 4, playerName: 'Diana', amount: 200 }); // Diana raises
    players[0].addDecision({ type: 'call', playerId: 1, playerName: 'Alice' }); // Alice calls
    players[1].addDecision({ type: 'call', playerId: 2, playerName: 'Bob' }); // Bob calls

    // Since Charlie is all-in, he cannot act further

    // --- Flop Betting Round ---
    // Players: Alice, Bob, Diana
    players[0].addDecision({ type: 'check', playerId: 1, playerName: 'Alice' }); // Alice checks
    players[1].addDecision({ type: 'bet', playerId: 2, playerName: 'Bob', amount: 500 }); // Bob bets (all-in)
    players[3].addDecision({ type: 'call', playerId: 4, playerName: 'Diana' }); // Diana calls
    players[0].addDecision({ type: 'fold', playerId: 1, playerName: 'Alice' }); // Alice folds

    // --- Turn and River Betting Rounds ---
    // No further actions as Bob is all-in

    await game.playRound();

    // Verify that the pot has been distributed correctly

    // Calculate expected side pots
    // Side Pot 1: Charlie's all-in (200) x 4 players = 800
    // Side Pot 2: Alice's remaining bet (200) x 3 players = 600
    // Side Pot 3: Diane's all-in (400) x 2 players = 800
    // Side Pot 3: Bob's remaining all-in (100) x 1 players = 100
    // Total pot: 800 + 600 + 800 + 100 = 2300

    // hand order
    // Charlie
    // Diane
    // Bob


    // Verify that total chips remain constant
    const totalChips = players.reduce((sum, player) => sum + player.chips, 0);
    expect(totalChips).toBe(2500); // Initial total chips

    // Check the final chip counts for each player
    expect(players[0].chips).toBe(100);
    expect(players[1].chips).toBe(200);
    expect(players[2].chips).toBe(800);
    expect(players[3].chips).toBe(1400);
  });
});