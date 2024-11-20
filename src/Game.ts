import { Player } from './models/Player';
import { Deck } from './models/Deck';
import { GameState } from './models/GameState';
import { PlayerAction } from './models/PlayerAction';

class LinkedListNode<T> {
    constructor(
        public value: T,
        public prev: LinkedListNode<T> | null = null,
        public next: LinkedListNode<T> | null = null
    ) { }
}

class LinkedList<T> {
    private currentNode: LinkedListNode<T> | null = null;
    constructor(values: T[]) {
        if (!values || values.length === 0) {
            return;
        }

        this.currentNode = new LinkedListNode(values[0]);
        let current = this.currentNode;
        for (let i = 1; i < values.length; i++) {
            const newNode = new LinkedListNode(values[i]);
            newNode.prev = current;
            current.next = newNode;
            current = newNode;
        }
        // Make it circular
        current.next = this.currentNode;
        this.currentNode.prev = current;
    }

    public current = () => this.currentNode?.value;
    public next = () => this.currentNode = this.currentNode?.next!;
    public prev = () => this.currentNode = this.currentNode?.prev!;

    public isEmpty = () => !this.currentNode;
    public isUnique = () => !!this.currentNode && this.currentNode === this.currentNode?.next;
    public isUniqueOrEmpty = () => this.currentNode === this.currentNode?.next;

    public every(predicate: (value: T) => boolean) {
        if (!this.currentNode) {
            return false;
        }
        const startingPoint = this.currentNode;
        let current = this.currentNode;
        do {
            if (!predicate(current.value)) {
                return false;
            }
            current = current.next!;
        } while (startingPoint != current);
        return true;
    }

    public removeCurrentAndMoveNext() {
        if (this.isEmpty()) {
            return;
        }
        if (this.isUnique()) {
            this.currentNode!.prev = null;
            this.currentNode!.next = null;
            this.currentNode = null;
            return;
        }

        const nodeToRemove = this.currentNode!;
        this.currentNode = nodeToRemove.next;
        nodeToRemove.prev!.next = nodeToRemove.next;
        nodeToRemove.next!.prev = nodeToRemove.prev;

        // Clean up the removed node
        nodeToRemove.next = null;
        nodeToRemove.prev = null;
    }
}

export class Game {
    private deck: Deck = new Deck();
    private gameState: GameState = {
        smallBlind: 5,
        bigBlind: 10,
        pot: 0,
        currentBet: 0,
        communityCards: [],
    };

    private activePlayers?: LinkedList<Player>;
    private smallBlindIndex: number = 0;

    constructor(private players: Player[]) { }

    async start() {
        // Create circular doubly-linked list from players
        this.activePlayers = new LinkedList<Player>(this.players);

        this.dealInitialCards();
        await this.bettingRound(true);

        // Flop
        this.dealCommunityCards(3);
        await this.bettingRound();

        // Turn
        this.dealCommunityCards(1);
        await this.bettingRound();

        // River
        this.dealCommunityCards(1);
        await this.bettingRound();

        // Showdown
        this.determineWinner();
    }

    private dealInitialCards() {
        this.players.forEach(player => {
            player.hand.push(this.deck.deal(), this.deck.deal());
        });
    }

    private dealCommunityCards(count: number) {
        for (let i = 0; i < count; i++) {
            this.gameState.communityCards.push(this.deck.deal());
        }
    }

    private async bettingRound(isFirstRound: boolean = false) {
        if (isFirstRound) {
            // Get small blind and big blind players
            const smallBlindPlayer = this.players[this.smallBlindIndex];
            const bigBlindPlayer = this.players[(this.smallBlindIndex + 1) % this.players.length];

            // Small blind pays half the minimum bet
            smallBlindPlayer.chips -= this.gameState.smallBlind;
            this.gameState.pot += this.gameState.smallBlind;
            console.log(`${smallBlindPlayer.name} posts small blind of ${this.gameState.smallBlind}`);

            // Big blind pays full minimum bet
            bigBlindPlayer.chips -= this.gameState.bigBlind;
            this.gameState.pot += this.gameState.bigBlind;
            this.gameState.currentBet = this.gameState.bigBlind;
            console.log(`${bigBlindPlayer.name} posts big blind of ${this.gameState.bigBlind}`);

            // Increment small blind position for next hand
            this.smallBlindIndex = (this.smallBlindIndex + 1) % this.players.length;
        }
        while (!this.activePlayers!.isUnique() && !this.activePlayersHasEqualBets()) {
            const action = await this.activePlayers!.current()!.makeDecision(this.gameState);
            this.processAction(this.activePlayers!.current()!, action);
            this.activePlayers?.next();
        }
    }

    private processAction(player: Player, action: PlayerAction) {
        console.log(`${player.name} decides to ${action.type}.`);

        switch (action.type) {
            case 'fold':
                this.activePlayers?.removeCurrentAndMoveNext();
                break;
            case 'call':
                player.chips -= this.gameState.currentBet;
                this.gameState.pot += this.gameState.currentBet;
                break;
            case 'raise':
                const raiseAmount = action.amount || 0;
                player.chips -= raiseAmount;
                this.gameState.currentBet += raiseAmount;
                this.gameState.pot += raiseAmount;
                break;
            case 'check':
                // Player does nothing
                break;
            case 'bet':
                const betAmount = action.amount || 0;
                player.chips -= betAmount;
                this.gameState.currentBet = betAmount;
                this.gameState.pot += betAmount;
                break;
        }

        // Update game state as needed
    }

    private activePlayersHasEqualBets(): boolean {
        if (!this.activePlayers) {
            return false;
        }
        const betOfCurrentPlayer = this.activePlayers.current()!.getLastBet();
        return this.activePlayers.every(p => p.getLastBet() === betOfCurrentPlayer);
    }

    private determineWinner() {
        // Implement hand evaluation logic to determine the winner
        console.log('Determining the winner...');
    }
}