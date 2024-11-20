import { Card } from './Card';
import { GameState } from './GameState';
import { PlayerAction } from './PlayerAction';

export abstract class Player {
    public hand: Card[] = [];
    private lastBet: number | null = null;

    constructor(public id: number, public name: string, public chips: number) { }

    abstract makeDecision(gameState: GameState): Promise<PlayerAction>;

    getLastBet(): number | null
    {
        return this.lastBet;    
    }

    resetLastBet()
    {
        this.lastBet = null;
    }
}
