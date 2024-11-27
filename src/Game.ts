import { Player } from './models/Player';
import { Deck } from './models/Deck';
import { GameState } from './models/GameState';
import { describePlayerAction, FullPlayerAction } from './models/PlayerAction';
import { rankingHands } from './rankingHands';

export class Game {
    private deck!: Deck;
    private gameState = new GameState(5, 10);

    constructor(private players: Player[]) { }

    async playRound() {
        // Reset active status for players with chips
        this.players.forEach(player => {
            player.isActive = player.chips > 0;
            player.lastBet = 0;
            player.totalRoundBet = 0;
        });

        this.prepareDeck();

        this.makeBlindsPay();

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
        this.payWinners();

        // Eliminate players with no chips left and move blinds
        this.eliminatePlayersAndMoveBlinds();
    }

    private prepareDeck() {
        this.gameState.communityCards = [];
        this.players.forEach(player => {
            player.hand = [];
        });
        this.deck = new Deck();
        this.deck.shuffle(); // Ensure the deck is shuffled before dealing
    }

    private makeBlindsPay() {
        const smallBlindPlayer = this.players[0];
        const bigBlindPlayer = this.players[1];

        // Small blind pays half the minimum bet
        const smallBlindAmount = Math.min(smallBlindPlayer.chips, this.gameState.smallBlind);
        smallBlindPlayer.chips -= smallBlindAmount;
        smallBlindPlayer.totalRoundBet = smallBlindAmount;
        this.gameState.pot += smallBlindAmount;
        this.gameState.currentBet = smallBlindAmount;
        const smallBlindAction: FullPlayerAction = {
            type: 'smallBlind',
            playerId: smallBlindPlayer.id,
            playerName: smallBlindPlayer.name,
            amount: smallBlindAmount,
        };
        this.gameState.addLog(describePlayerAction(smallBlindAction));
        this.gameState.actions.push(smallBlindAction);

        // Big blind pays full minimum bet
        const bigBlindAmount = Math.min(bigBlindPlayer.chips, this.gameState.bigBlind);
        bigBlindPlayer.chips -= bigBlindAmount;
        bigBlindPlayer.totalRoundBet = bigBlindAmount;
        this.gameState.pot += bigBlindAmount;
        this.gameState.currentBet = Math.max(smallBlindAmount, bigBlindAmount);
        const bigBlindAction: FullPlayerAction = {
            type: 'bigBlind',
            playerId: bigBlindPlayer.id,
            playerName: bigBlindPlayer.name,
            amount: bigBlindAmount,
        };
        this.gameState.addLog(describePlayerAction(bigBlindAction));
        this.gameState.actions.push(bigBlindAction);

        // Mark blinds as having acted
        smallBlindPlayer.hasActed = true;
        bigBlindPlayer.hasActed = true;

        // Handle all-in blinds
        if (smallBlindPlayer.chips === 0) smallBlindPlayer.isAllIn = true;
        if (bigBlindPlayer.chips === 0) bigBlindPlayer.isAllIn = true;
    }

    private dealInitialCards() {
        this.players.forEach(player => {
            player.hand = [this.deck.deal(), this.deck.deal()];
        });
    }

    private dealCommunityCards(count: number) {
        for (let i = 0; i < count; i++) {
            this.gameState.communityCards.push(this.deck.deal());
        }
    }

    private async bettingRound(isFirstRound: boolean = false) {
        // Determine the starting player
        let currentPlayerIndex = isFirstRound ? (2 % this.players.length) : 0;

        let roundActive = true;

        while (roundActive) {
            const currentPlayer = this.players[currentPlayerIndex];

            if (currentPlayer.isActive && !currentPlayer.isAllIn && !currentPlayer.hasActed) {
                const action = await currentPlayer.makeDecision(this.gameState);
                this.processAction(currentPlayer, action);

                // If a raise or bet occurred, reset hasActed for other players
                if (action.type === 'raise' || action.type === 'bet') {
                    this.players.forEach((player, index) => {
                        if (index !== currentPlayerIndex && player.isActive && !player.isAllIn) {
                            player.hasActed = false;
                        }
                    });
                }
                currentPlayer.hasActed = true;
            }

            // Move to the next player
            currentPlayerIndex = (currentPlayerIndex + 1) % this.players.length;

            // Check if the betting round has ended
            roundActive = this.shouldContinueBettingRound();
        }

        // Reset lastBet and currentBet for next round
        this.players.forEach(player => {
            player.lastBet = 0;
            player.hasActed = false;
        });
        this.gameState.currentBet = 0;
    }

    private processAction(player: Player, action: FullPlayerAction) {
        switch (action.type) {
            case 'fold':
                player.isActive = false;
                break;
            case 'call':
                const callAmount = Math.min(player.chips, this.gameState.currentBet - player.totalRoundBet);
                player.chips -= callAmount;
                player.lastBet += callAmount;
                player.totalRoundBet += callAmount;
                this.gameState.pot += callAmount;
                if (player.chips === 0) player.isAllIn = true;
                break;
            case 'raise':
                const totalRaise = (this.gameState.currentBet - player.totalRoundBet) + action.amount;
                const actualRaiseAmount = Math.min(player.chips, totalRaise);
                action.amount = actualRaiseAmount;
                player.chips -= actualRaiseAmount;
                player.lastBet += actualRaiseAmount;
                player.totalRoundBet += actualRaiseAmount;
                this.gameState.currentBet = player.totalRoundBet;
                this.gameState.pot += actualRaiseAmount;
                if (player.chips === 0) player.isAllIn = true;
                break;
            case 'check':
                // No chips are bet when checking
                break;
            case 'bet':
                const betAmount = Math.min(player.chips, action.amount);
                action.amount = betAmount;
                player.chips -= betAmount;
                player.lastBet += betAmount;
                player.totalRoundBet += betAmount;
                if (betAmount >= this.gameState.currentBet) {
                    this.gameState.currentBet = betAmount;
                }
                this.gameState.pot += betAmount;
                if (player.chips === 0) player.isAllIn = true;
                break;
        }
        this.gameState.addLog(describePlayerAction(action));
        this.gameState.actions.push(action);
    }

    private shouldContinueBettingRound(): boolean {
        const activePlayers = this.players.filter(p => p.isActive && !p.isAllIn);

        // Betting round ends if:
        // - All active players have acted
        // - All bets are equal
        const allPlayersHaveActed = activePlayers.every(p => p.hasActed);
        const betsAreEqual = activePlayers.every(p => p.totalRoundBet === this.gameState.currentBet);

        return !(allPlayersHaveActed && betsAreEqual);
    }

    private payWinners() {
        const activePlayers = this.players.filter(p => p.isActive);
        if (activePlayers.length === 0) throw Error("Should have at least one active player.");
        if (activePlayers.length === 1) {
            activePlayers[0].chips += this.gameState.pot;
            this.gameState.pot = 0;
            return;
        }

        // Create side pots based on players' total bets
        const sidePots = this.createSidePots();

        let bestHandRank = rankingHands(activePlayers, this.gameState.communityCards);


        // Distribute each side pot to the winner(s)
        for (const pot of sidePots) {
            // Find the highest hand among players eligible for this pot
            const eligiblePlayers = bestHandRank.find(h => h.players.some(p => pot.players.includes(p)))!.players;
            const winners = eligiblePlayers.filter(ep => pot.players.includes(ep));

            // Divide the pot among winners
            const potShare = pot.amount / winners.length;
            winners.forEach(winner => {
                winner.chips += potShare;
            });
        }

        this.gameState.pot = 0;
    }

    private createSidePots() {
        const pots = [];
        const playersWithBets = this.players.filter(p => p.totalRoundBet > 0);

        // Sort players by total bet amount
        let sortedPlayers = playersWithBets.sort((a, b) => a.totalRoundBet - b.totalRoundBet);

        while (sortedPlayers.length > 0) {
            const smallestBet = sortedPlayers[0].totalRoundBet;
            const playersInPot = sortedPlayers.map(p => p);

            // Calculate the pot amount
            const potAmount = smallestBet * sortedPlayers.length;

            // Add the pot to the list
            pots.push({
                amount: potAmount,
                players: playersInPot,
            });

            // Subtract the smallest bet from each player's totalRoundBet
            sortedPlayers.forEach(p => {
                p.totalRoundBet -= smallestBet;
            });

            // Remove players whose totalRoundBet is now zero
            sortedPlayers = sortedPlayers.filter(p => p.totalRoundBet > 0);
        }

        return pots;
    }

    private eliminatePlayersAndMoveBlinds() {
        this.players = [...this.players.slice(1), this.players[0]].filter(player => player.chips > 0);
    }
}