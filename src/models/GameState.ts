import { Card } from "./Card";
import { Player } from "./Player";
import { PlayerAction } from "./PlayerAction";

export class GameState {
  constructor(
    public players: Player[],
    public smallBlind: number,
    public bigBlind: number,
    public pot: number = 0,
    public currentBet: number = 0,
    public lastRaiseBy: number = 0,
    public communityCards: Card[] = [],
    public actions: PlayerAction[] = [],
    public roundLog: string = ""
  ) {}

  public addLog(log: string) {
    console.log(log);
    this.roundLog += `\n${log}`;
  }

  public playersStack() {
    return this.players.map((p) => `${p.name} (${p.chips} chips)`).join("\n");
  }

  public reset() {
    this.pot = 0;
    this.currentBet = 0;
    this.lastRaiseBy = 0;
    this.communityCards = [];
    this.actions = [];
    this.roundLog = "";
  }
}
