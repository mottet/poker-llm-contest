export enum Suit {
    Hearts = 'Hearts',
    Diamonds = 'Diamonds',
    Clubs = 'Clubs',
    Spades = 'Spades',
}

export enum Rank {
    Two = '2',
    Three = '3',
    Four = '4',
    Five = '5',
    Six = '6',
    Seven = '7',
    Eight = '8',
    Nine = '9',
    Ten = '10',
    Jack = 'J',
    Queen = 'Q',
    King = 'K',
    Ace = 'A',
}

export class Card {
    constructor(public suit: Suit, public rank: Rank) { }

    toString() {
        return `${this.rank} of ${this.suit}`;
    }
}
