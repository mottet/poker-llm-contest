export interface PlayerAction {
    type: 'fold' | 'call' | 'raise' | 'check' | 'bet';
    amount?: number;
}
