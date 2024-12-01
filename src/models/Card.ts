export enum Suit {
    Hearts = '♡',
    Diamonds = '♢',
    Clubs = '♣',
    Spades = '♠',
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
    Jack = 'Jack',
    Queen = 'Queen',
    King = 'King',
    Ace = 'Ace',
}

export enum ValueRank {
    Two,
    Three,
    Four,
    Five,
    Six,
    Seven,
    Eight,
    Nine,
    Ten,
    Jack,
    Queen,
    King,
    Ace,
}

export class Card {
    constructor(suit: Suit, rank: Rank) {
        this._suit = suit;
        this._rank = rank;
        this._rankValue = Object.values(Rank).indexOf(rank)
    }

    private _suit: Suit;
    get suit(): Suit {
        return this._suit;
    }
    private _rank: Rank;
    get rank(): Rank {
        return this._rank;
    }
    private _rankValue: number;
    get rankValue(): number {
        return this._rankValue;
    }

    toString() {
        return `${this.rank}${this.suit}`;
    }
}
