import { Player } from "./Player";
import { GameState } from "./GameState";
import {
  describePossibleAction,
  FullPlayerAction,
  PlayerAction,
  PossibleAction,
} from "./PlayerAction";

export abstract class LLMPlayer extends Player {

  constructor(id: number, name: string, chips: number) {
    super(id, name, chips);
  }

  async makeDecision(
    gameState: GameState,
    possibleActions: PossibleAction[]
  ): Promise<FullPlayerAction> {
    const prompt = this.generatePrompt(gameState, possibleActions);
    const response = await this.queryLLM(prompt);
    return {
      playerId: this.id,
      playerName: this.name,
      ...this.parseResponse(response),
    };
  }

  protected generatePrompt(
    gameState: GameState,
    possibleActions: PossibleAction[]
  ): string {
    const handDescription = this.hand
      .map((card) => card.toString())
      .join(" and ");
    const communityCards = gameState.communityCards.length
      ? gameState.communityCards.map((card) => card.toString()).join(", ")
      : "not deal yet";
    return `You are playing Texas Hold'em poker. Your hand is ${handDescription}. The community cards are ${communityCards}. The pot is ${
      gameState.pot
    } chips. It's your turn. Do you ${possibleActions
      .map(describePossibleAction)
      .join(", ")}?`;
  }

  abstract queryLLM(prompt: string): Promise<string>;

  protected parseResponse(response: string): PlayerAction {
    const action = response.toLowerCase();
    if (action.includes("fold")) {
      return { type: "fold" };
    } else if (action.includes("call")) {
      return { type: "call" };
    } else if (action.includes("raise")) {
      const amount = this.extractAmount(response) || 10;
      return { type: "raise", amount };
    } else if (action.includes("check")) {
      return { type: "check" };
    } else if (action.includes("bet")) {
      const amount = this.extractAmount(response) || 10;
      return { type: "bet", amount };
    } else {
      return { type: "fold" };
    }
  }

  protected extractAmount(response: string): number | null {
    const match = response.match(/(\d+)/);
    return match ? parseInt(match[0], 10) : null;
  }
}
