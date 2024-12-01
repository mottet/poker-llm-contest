
export type BlindActionType = 'smallBlind' | 'bigBlind';
export type PlayerActionType = 'raise' | 'bet' | 'fold' | 'call' | 'check';

export type PossibleAction =
    | {
          type: 'raise' | 'bet';
          minimalAmount: number;
      }
    | {
          type: 'fold' | 'call' | 'check';
      };

export type PlayerAction =
    | {
          type: 'smallBlind' | 'bigBlind' | 'raise' | 'bet';
          amount: number;
      }
    | {
          type: 'fold' | 'call' | 'check';
      };

export interface BasePlayerAction {
    playerId: number;
    playerName: string;
}

export type FullPlayerAction = BasePlayerAction & PlayerAction;

export function describePlayerAction(playerAction: FullPlayerAction) {
    switch (playerAction.type) {
        case 'smallBlind':
            return `Player ${playerAction.playerName} posts small blind of ${playerAction.amount}`;
        case 'bigBlind':
            return `Player ${playerAction.playerName} posts big blind of ${playerAction.amount}`;
        case 'fold':
            return `Player ${playerAction.playerName} folds.`;
        case 'call':
            return `Player ${playerAction.playerName} calls.`;
        case 'raise':
            return `Player ${playerAction.playerName} raises by ${playerAction.amount}.`;
        case 'check':
            return `Player ${playerAction.playerName} checks.`;
        case 'bet':
            return `Player ${playerAction.playerName} bets ${playerAction.amount}.`;
    }
}

export function describePossibleAction(possibleAction: PossibleAction) {
    switch (possibleAction.type) {
        case 'fold':
            return `fold`;
        case 'call':
            return `call`;
        case 'raise':
            return `raise by at least ${possibleAction.minimalAmount}`;
        case 'check':
            return `check`;
        case 'bet':
            return `bet at least ${possibleAction.minimalAmount}`;
    }
}
