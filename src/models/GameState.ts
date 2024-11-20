import { Card } from './Card';

export interface GameState {
    smallBlind: number;
    bigBlind: number;
    pot: number;
    currentBet: number;
    communityCards: Card[];
    lastAction?: string;
}