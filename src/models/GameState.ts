import { Card } from './Card';
import { PlayerAction } from './PlayerAction';

export class GameState {
    constructor(
        public smallBlind: number,
        public bigBlind: number,
        public pot: number = 0,
        public currentBet: number = 0,
        public communityCards: Card[] = [],
        public actions: PlayerAction[] = [],
        public actionLog: string = "",
    ) { }

    public addLog(log: string) {
        console.log(log);
        this.actionLog += `\n${log}`
    }
}
