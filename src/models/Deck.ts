import { Card, Suit, Rank } from './Card';

export class Deck {
    private cards: Card[] = [];

    constructor() {
        this.initializeDeck();
        this.shuffle();
    }

    private initializeDeck() {
        for (const suit of Object.values(Suit)) {
            for (const rank of Object.values(Rank)) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(): Card {
        return this.cards.pop()!;
    }
}