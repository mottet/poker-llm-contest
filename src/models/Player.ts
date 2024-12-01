import { Card } from "./Card";
import { GameState } from "./GameState";
import {
  FullPlayerAction,
  PossibleAction,
} from "./PlayerAction";

export abstract class Player {
  public hand: Card[] = [];
  public currentBet: number = 0;
  public totalHandRoundBet: number = 0;
  public isActive: boolean = true;
  public isAllIn: boolean = false;
  public hasActed: boolean = false;

  constructor(public id: number, public name: string, public chips: number, public showHandInLog: boolean = false) {}

  abstract makeDecision(
    gameState: GameState,
    possibleActions: PossibleAction[]
  ): Promise<FullPlayerAction>;
}
