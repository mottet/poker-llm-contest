import { Card } from './Card';
import { GameState } from './GameState';
import { FullPlayerAction } from './PlayerAction';

export abstract class Player {
    public hand: Card[] = [];
    private lastBet: number | null = null;
    public isActive: boolean = true;

    constructor(public id: number, public name: string, public chips: number) { }

    abstract makeDecision(gameState: GameState): Promise<FullPlayerAction>;

    getLastBet(): number | null
    {
        return this.lastBet;    
    }

    resetLastBet()
    {
        this.lastBet = null;
    }
}
