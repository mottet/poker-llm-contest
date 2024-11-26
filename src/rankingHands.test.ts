import { describe } from "node:test";
import { Card, Suit, Rank, ValueRank } from "./models/Card";
import { HandValue, rankingHands } from "./rankingHands";
import { Player } from "./models/Player";
import { GameState } from "./models/GameState";
import { FullPlayerAction } from "./models/PlayerAction";

class PlayerTest extends Player {
  public hand: Card[];
  public isActive: boolean = true;

  constructor(name: string, hand: Card[]) {
    super(0, name, 0);
    this.hand = hand;
  }

  makeDecision(gameState: GameState): Promise<FullPlayerAction> {
    throw new Error("Method not implemented.");
  }
  getLastBet(): number | null {
    throw new Error("Method not implemented.");
  }
  resetLastBet(): void {
    throw new Error("Method not implemented.");
  }
}

describe("rankingHands", () => {
  it("should rank players correctly with different hand types", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.King),
      new Card(Suit.Clubs, Rank.King),
      new Card(Suit.Spades, Rank.Four),
      new Card(Suit.Diamonds, Rank.Two),
      new Card(Suit.Clubs, Rank.Three),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Hearts, Rank.Ace),
      new Card(Suit.Clubs, Rank.Ten), // High card
    ]);

    const player2 = new PlayerTest("Bob", [
      new Card(Suit.Diamonds, Rank.King),
      new Card(Suit.Spades, Rank.Queen), // Three of a Kind (Kings)
    ]);

    const player3 = new PlayerTest("Charlie", [
      new Card(Suit.Hearts, Rank.Queen),
      new Card(Suit.Diamonds, Rank.Jack), // High card
    ]);

    const player4 = new PlayerTest("David", [
      new Card(Suit.Spades, Rank.Ace),
      new Card(Suit.Spades, Rank.Seven), // High card
    ]);

    const result = rankingHands(
      [player1, player2, player3, player4],
      communityCards
    );

    expect(result).toEqual([
      {
        players: [player2], // Three of a Kind (Kings)
        hand: expect.objectContaining({
          handValue: HandValue.ThreeOfAKind,
          kickersRank: [ValueRank.King, ValueRank.Queen, ValueRank.Four],
        }),
      },
      {
        players: [player1], // Pair of Kings (Kicker Ace then Ten)
        hand: expect.objectContaining({
          handValue: HandValue.OnePair,
          kickersRank: [
            ValueRank.King,
            ValueRank.Ace,
            ValueRank.Ten,
            ValueRank.Four,
          ],
        }),
      },
      {
        players: [player4], // Pair of Kings (Kicker Ace then Seven)
        hand: expect.objectContaining({
          handValue: HandValue.OnePair,
          kickersRank: [
            ValueRank.King,
            ValueRank.Ace,
            ValueRank.Seven,
            ValueRank.Four,
          ],
        }),
      },
      {
        players: [player3], // Pair of Kings (Kicker Queen)
        hand: expect.objectContaining({
          handValue: HandValue.OnePair,
          kickersRank: [
            ValueRank.King,
            ValueRank.Queen,
            ValueRank.Jack,
            ValueRank.Four,
          ],
        }),
      },
    ]);
  });
  it("should handle a tie when both players have the same hand value and kickers", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.King),
      new Card(Suit.Clubs, Rank.Queen),
      new Card(Suit.Spades, Rank.Jack),
      new Card(Suit.Diamonds, Rank.Ten),
      new Card(Suit.Clubs, Rank.Two),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Hearts, Rank.Ace),
      new Card(Suit.Spades, Rank.Two),
    ]);

    const player2 = new PlayerTest("Bob", [
      new Card(Suit.Diamonds, Rank.Ace),
      new Card(Suit.Clubs, Rank.Three),
    ]);

    const result = rankingHands([player1, player2], communityCards);

    expect(result).toEqual([
      {
        players: [player1, player2],
        hand: expect.objectContaining({
          handValue: HandValue.Straight,
          kickersRank: [ValueRank.Ace],
        }),
      },
    ]);
  });

  it("should handle a straight Ace to Five", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.King),
      new Card(Suit.Clubs, Rank.Five),
      new Card(Suit.Spades, Rank.Four),
      new Card(Suit.Diamonds, Rank.Three),
      new Card(Suit.Clubs, Rank.Two),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Hearts, Rank.Ace),
      new Card(Suit.Spades, Rank.Two),
    ]);

    const player2 = new PlayerTest("Bob", [
      new Card(Suit.Diamonds, Rank.Four),
      new Card(Suit.Clubs, Rank.Three),
    ]);

    const result = rankingHands([player1, player2], communityCards);

    expect(result).toEqual([
      {
        players: [player1],
        hand: expect.objectContaining({
          handValue: HandValue.Straight,
          kickersRank: [ValueRank.Five],
        }),
      },
      {
        players: [player2],
        hand: expect.objectContaining({
          handValue: HandValue.TwoPair,
          kickersRank: [ValueRank.Four, ValueRank.Three, ValueRank.King],
        }),
      },
    ]);
  });

  it("should use kickers to break ties for identical hands", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.King),
      new Card(Suit.Clubs, Rank.King),
      new Card(Suit.Spades, Rank.King),
      new Card(Suit.Diamonds, Rank.Two),
      new Card(Suit.Clubs, Rank.Three),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Hearts, Rank.Ace),
      new Card(Suit.Clubs, Rank.Ten), // Three of a Kind (Kings) with Ace kicker
    ]);

    const player2 = new PlayerTest("Bob", [
      new Card(Suit.Hearts, Rank.Queen),
      new Card(Suit.Spades, Rank.Jack), // Three of a Kind (Kings) with Queen kicker
    ]);

    const result = rankingHands([player1, player2], communityCards);

    expect(result).toEqual([
      {
        players: [player1],
        hand: expect.objectContaining({
          handValue: HandValue.ThreeOfAKind,
          kickersRank: [ValueRank.King, ValueRank.Ace, ValueRank.Ten],
        }),
      },
      {
        players: [player2],
        hand: expect.objectContaining({
          handValue: HandValue.ThreeOfAKind,
          kickersRank: [ValueRank.King, ValueRank.Queen, ValueRank.Jack],
        }),
      },
    ]);
  });

  it("should correctly group and rank ties with multiple players", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Clubs, Rank.Nine),
      new Card(Suit.Hearts, Rank.Ten),
      new Card(Suit.Diamonds, Rank.Ten),
      new Card(Suit.Spades, Rank.King),
      new Card(Suit.Clubs, Rank.King), // Two Pair (Kings and Tens)
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Player 1", [
      new Card(Suit.Spades, Rank.Queen),
      new Card(Suit.Spades, Rank.Seven), // Two Pair (Kings and Tens, Queen kicker)
    ]);

    const player2 = new PlayerTest("Player 2", [
      new Card(Suit.Hearts, Rank.Queen),
      new Card(Suit.Clubs, Rank.Seven), // Two Pair (Kings and Tens, Queen kicker)
    ]);

    const player3 = new PlayerTest("Player 3", [
      new Card(Suit.Diamonds, Rank.Nine),
      new Card(Suit.Spades, Rank.Five), // Two Pair (Kings and Tens, Nine kicker)
    ]);

    const player4 = new PlayerTest("Player 4", [
      new Card(Suit.Spades, Rank.Four),
      new Card(Suit.Spades, Rank.Two), // Two Pair (Kings and Tens, Nine kicker)
    ]);

    const result = rankingHands(
      [player1, player2, player3, player4],
      communityCards
    );

    expect(result).toEqual([
      {
        players: [player1, player2],
        hand: expect.objectContaining({
          handValue: HandValue.TwoPair,
          kickersRank: [ValueRank.King, ValueRank.Ten, ValueRank.Queen],
        }), // Two Pair (Kings and Tens, Queen kicker)
      },
      {
        players: [player3, player4],
        hand: expect.objectContaining({
          handValue: HandValue.TwoPair,
          kickersRank: [ValueRank.King, ValueRank.Ten, ValueRank.Nine],
        }), // Two Pair (Kings and Tens, Nine kicker)
      },
    ]);
  });

  it("should rank Full House over a Flush", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.King),
      new Card(Suit.Clubs, Rank.King),
      new Card(Suit.Hearts, Rank.Four),
      new Card(Suit.Diamonds, Rank.Four),
      new Card(Suit.Hearts, Rank.Five),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Spades, Rank.Four),
      new Card(Suit.Clubs, Rank.Two), // Full House (Fours over Kings)
    ]);

    const player2 = new PlayerTest("Bob", [
      new Card(Suit.Hearts, Rank.Ace),
      new Card(Suit.Hearts, Rank.Queen), // Flush
    ]);

    const result = rankingHands([player1, player2], communityCards);

    expect(result).toEqual([
      {
        players: expect.arrayContaining([player1]), // Full House
        hand: expect.objectContaining({
          handValue: HandValue.FullHouse,
          kickersRank: [ValueRank.Four, ValueRank.King],
        }),
      },
      {
        players: expect.arrayContaining([player2]), // Flush
        hand: expect.objectContaining({
          handValue: HandValue.Flush,
          kickersRank: [
            ValueRank.Ace,
            ValueRank.King,
            ValueRank.Queen,
            ValueRank.Five,
            ValueRank.Four,
          ],
        }),
      },
    ]);
  });

  it("should rank a Straight Flush over a Four of a Kind over a Flush over a Straight", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.Four),
      new Card(Suit.Hearts, Rank.Five),
      new Card(Suit.Hearts, Rank.Six),
      new Card(Suit.Hearts, Rank.Seven),
      new Card(Suit.Spades, Rank.Seven),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Hearts, Rank.Three),
      new Card(Suit.Clubs, Rank.Three), // Straight Flush (Three to Seven)
    ]);

    const player2 = new PlayerTest("Charlie", [
      new Card(Suit.Hearts, Rank.Two),
      new Card(Suit.Hearts, Rank.Ten), // Flush (Hearts)
    ]);

    const player3 = new PlayerTest("David", [
      new Card(Suit.Diamonds, Rank.Nine),
      new Card(Suit.Clubs, Rank.Eight), // Straight (Five to Nine)
    ]);

    const player4 = new PlayerTest("Bob", [
      new Card(Suit.Clubs, Rank.Seven),
      new Card(Suit.Diamonds, Rank.Seven), // Four of a Kind (Sevens)
    ]);

    const result = rankingHands(
      [player1, player2, player3, player4],
      communityCards
    );

    expect(result).toEqual([
      {
        players: expect.arrayContaining([player1]), // Straight Flush
        hand: expect.objectContaining({
          handValue: HandValue.StraightFlush,
          kickersRank: [ValueRank.Seven],
        }),
      },
      {
        players: expect.arrayContaining([player4]), // Four of a Kind
        hand: expect.objectContaining({
          handValue: HandValue.FourOfAKind,
          kickersRank: [ValueRank.Seven, ValueRank.Six],
        }),
      },
      {
        players: expect.arrayContaining([player2]), // Flush
        hand: expect.objectContaining({
          handValue: HandValue.Flush,
          kickersRank: [
            ValueRank.Ten,
            ValueRank.Seven,
            ValueRank.Six,
            ValueRank.Five,
            ValueRank.Four,
          ],
        }),
      },
      {
        players: expect.arrayContaining([player3]), // Straight
        hand: expect.objectContaining({
          handValue: HandValue.Straight,
          kickersRank: [ValueRank.Nine],
        }),
      },
    ]);
  });

  it("should handle a large game with multiple flush", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Clubs, Rank.Two),
      new Card(Suit.Clubs, Rank.Five),
      new Card(Suit.Clubs, Rank.Six),
      new Card(Suit.Diamonds, Rank.Eight),
      new Card(Suit.Clubs, Rank.Nine),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Player 1", [
      new Card(Suit.Clubs, Rank.Seven),
      new Card(Suit.Clubs, Rank.Four), // Flush (Clubs)
    ]);

    const player2 = new PlayerTest("Player 2", [
      new Card(Suit.Clubs, Rank.Three),
      new Card(Suit.Hearts, Rank.Ten), // Flush (Clubs)
    ]);

    const player3 = new PlayerTest("Player 3", [
      new Card(Suit.Clubs, Rank.King),
      new Card(Suit.Spades, Rank.Four), // Flush (Clubs, High: King)
    ]);

    const result = rankingHands([player1, player2, player3], communityCards);

    expect(result).toEqual([
      {
        players: [player3],
        hand: expect.objectContaining({
          handValue: HandValue.Flush,
          kickersRank: [
            ValueRank.King,
            ValueRank.Nine,
            ValueRank.Six,
            ValueRank.Five,
            ValueRank.Two,
          ],
        }), // Flush (High: King)
      },
      {
        players: [player1],
        hand: expect.objectContaining({
          handValue: HandValue.Flush,
          kickersRank: [
            ValueRank.Nine,
            ValueRank.Seven,
            ValueRank.Six,
            ValueRank.Five,
            ValueRank.Four,
          ],
        }), // Flush (High: Seven)
      },
      {
        players: [player2],
        hand: expect.objectContaining({
          handValue: HandValue.Flush,
          kickersRank: [
            ValueRank.Nine,
            ValueRank.Six,
            ValueRank.Five,
            ValueRank.Three,
            ValueRank.Two,
          ],
        }), // Flush (High: Six)
      },
    ]);
  });

  it("should correctly identify the winner with a high card", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.Two),
      new Card(Suit.Clubs, Rank.Three),
      new Card(Suit.Spades, Rank.King),
      new Card(Suit.Diamonds, Rank.Five),
      new Card(Suit.Clubs, Rank.Seven),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Hearts, Rank.Ten), // High card
      new Card(Suit.Diamonds, Rank.Four),
    ]);

    const player2 = new PlayerTest("Bob", [
      new Card(Suit.Diamonds, Rank.Ace), // High card
      new Card(Suit.Spades, Rank.Six),
    ]);

    const player3 = new PlayerTest("Charlie", [
      new Card(Suit.Spades, Rank.Queen), // High card
      new Card(Suit.Clubs, Rank.Four),
    ]);

    const result = rankingHands([player1, player2, player3], communityCards);

    expect(result).toEqual([
      {
        players: [player2],
        hand: expect.objectContaining({
          handValue: HandValue.HighCard,
          kickersRank: [
            ValueRank.Ace,
            ValueRank.King,
            ValueRank.Seven,
            ValueRank.Six,
            ValueRank.Five,
          ],
        }),
      },
      {
        players: [player3],
        hand: expect.objectContaining({
          handValue: HandValue.HighCard,
          kickersRank: [
            ValueRank.King,
            ValueRank.Queen,
            ValueRank.Seven,
            ValueRank.Five,
            ValueRank.Four,
          ],
        }),
      },
      {
        players: [player1],
        hand: expect.objectContaining({
          handValue: HandValue.HighCard,
          kickersRank: [
            ValueRank.King,
            ValueRank.Ten,
            ValueRank.Seven,
            ValueRank.Five,
            ValueRank.Four,
          ],
        }),
      },
    ]);
  });

  it("should handle a tie when all players have the same high card", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.Queen),
      new Card(Suit.Clubs, Rank.King),
      new Card(Suit.Spades, Rank.Four),
      new Card(Suit.Diamonds, Rank.Five),
      new Card(Suit.Clubs, Rank.Six),
    ];

    // Players' hole cards
    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Hearts, Rank.Ten), // High card
      new Card(Suit.Diamonds, Rank.Two),
    ]);

    const player2 = new PlayerTest("Bob", [
      new Card(Suit.Diamonds, Rank.Ten), // High card
      new Card(Suit.Spades, Rank.Three),
    ]);

    const player3 = new PlayerTest("Charlie", [
      new Card(Suit.Spades, Rank.Ten), // High card
      new Card(Suit.Clubs, Rank.Two),
    ]);

    const result = rankingHands([player1, player2, player3], communityCards);

    expect(result).toEqual([
      {
        players: [player1, player2, player3],
        hand: expect.objectContaining({
          handValue: HandValue.HighCard,
          kickersRank: [
            ValueRank.King,
            ValueRank.Queen,
            ValueRank.Ten,
            ValueRank.Six,
            ValueRank.Five,
          ],
        }),
      },
    ]);
  });

  it("should correctly identify the winner between different Full Houses", () => {
    // Community cards
    const communityCards = [
      new Card(Suit.Hearts, Rank.King),
      new Card(Suit.Clubs, Rank.King),
      new Card(Suit.Spades, Rank.Four),
      new Card(Suit.Diamonds, Rank.Four),
      new Card(Suit.Hearts, Rank.Five),
    ];

    const player1 = new PlayerTest("Alice", [
      new Card(Suit.Clubs, Rank.Three), // Full House (Fours over Kings)
      new Card(Suit.Clubs, Rank.Four),
    ]);

    const player2 = new PlayerTest("Bob", [
      new Card(Suit.Spades, Rank.King), // Full House (Kings over Fours)
      new Card(Suit.Diamonds, Rank.Queen),
    ]);

    const player3 = new PlayerTest("Charlie", [
      new Card(Suit.Diamonds, Rank.King), // Full House (Kings over Five)
      new Card(Suit.Clubs, Rank.Five),
    ]);

    const player4 = new PlayerTest("David", [
      new Card(Suit.Spades, Rank.Five), // Full House (Five over Kings)
      new Card(Suit.Diamonds, Rank.Five),
    ]);

    const result = rankingHands([player1, player2, player3, player4], communityCards);

    expect(result).toEqual([
      {
        players: [player3], // Full House (Kings over Five) wins
        hand: expect.objectContaining({
          handValue: HandValue.FullHouse,
          kickersRank: [ValueRank.King, ValueRank.Five],
        }),
      },
      {
        players: [player2], // Full House (Kings over Fours)
        hand: expect.objectContaining({
          handValue: HandValue.FullHouse,
          kickersRank: [ValueRank.King, ValueRank.Four],
        }),
      },
      {
        players: [player4], // Full House (Five over Kings)
        hand: expect.objectContaining({
          handValue: HandValue.FullHouse,
          kickersRank: [ValueRank.Five, ValueRank.King],
        }),
      },
      {
        players: [player1], // Full House (Fours over Kings)
        hand: expect.objectContaining({
          handValue: HandValue.FullHouse,
          kickersRank: [ValueRank.Four, ValueRank.King],
        }),
      },
    ]);
  });
});
