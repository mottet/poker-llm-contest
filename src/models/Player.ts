import { Card } from './Card';
import { GameState } from './GameState';
import { FullPlayerAction, PlayerActionType } from './PlayerAction';

export abstract class Player {
    public hand: Card[] = [];
    public lastBet: number = 0;
    public totalRoundBet: number = 0;
    public isActive: boolean = true;
    public isAllIn: boolean = false;
    public hasActed: boolean = false;

    constructor(public id: number, public name: string, public chips: number) { }

    abstract makeDecision(gameState: GameState, possibleActions: PlayerActionType[]): Promise<FullPlayerAction>;

}
