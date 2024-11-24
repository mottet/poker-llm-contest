import { Player } from './models/Player';
import { Deck } from './models/Deck';
import { GameState } from './models/GameState';
import { describePlayerAction, FullPlayerAction } from './models/PlayerAction';
import { Card, Rank, Suit } from './models/Card';
import { rankingHands } from './rankingHands';

export class Game {
    private deck: Deck = new Deck();
    private gameState = new GameState(5, 10);

    constructor(private players: Player[]) { }

    async playRound() {
        // Reset active status for players with chips
        this.players.forEach(player => {
            player.isActive = player.chips > 0;
        });

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
        this.payWinner();

        // Eliminate players with no chips left
        this.eliminatePlayersAndMoveTheSmallBlindForward();
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
            const smallBlindPlayer = this.players[0];
            const bigBlindPlayer = this.players[1];

            // Small blind pays half the minimum bet
            const smallBlindAmount = Math.min(smallBlindPlayer.chips, this.gameState.smallBlind);
            smallBlindPlayer.chips -= smallBlindAmount;
            this.gameState.pot += smallBlindAmount;
            this.gameState.currentBet = smallBlindAmount;
            const smallBlindAction: FullPlayerAction = {
                type: 'smallBlind',
                playerId: smallBlindPlayer.id,
                playerName: smallBlindPlayer.name,
                amount: smallBlindAmount,
            }
            this.gameState.addLog(describePlayerAction(smallBlindAction));
            this.gameState.actions.push(smallBlindAction);

            // Big blind pays full minimum bet
            const bigBlindAmount = Math.min(bigBlindPlayer.chips, this.gameState.bigBlind);
            bigBlindPlayer.chips -= bigBlindAmount;
            this.gameState.pot += bigBlindAmount;
            this.gameState.currentBet = Math.max(smallBlindAmount, bigBlindAmount);
            const bigBlindAction: FullPlayerAction = {
                type: 'smallBlind',
                playerId: bigBlindPlayer.id,
                playerName: bigBlindPlayer.name,
                amount: bigBlindAmount,
            }
            this.gameState.addLog(describePlayerAction(smallBlindAction));
            this.gameState.actions.push(bigBlindAction);

        }

        let currentPlayerIndex = isFirstRound ? 2 % this.players.length : 0;

        while (!this.hasRoundEnded()) {
            const currentPlayer = this.players[currentPlayerIndex];

            if (currentPlayer.isActive) {
                const action = await currentPlayer.makeDecision(this.gameState);
                this.processAction(currentPlayer, action);
            }

            currentPlayerIndex = (currentPlayerIndex + 1) % this.players.length;
        }
    }

    private processAction(player: Player, action: FullPlayerAction) {
        switch (action.type) {
            case 'fold':
                player.isActive = false;
                break;
            case 'call':
                const callAmount = Math.min(player.chips, this.gameState.currentBet);
                player.chips -= callAmount;
                this.gameState.pot += callAmount;
                break;
            case 'raise':
                const raiseAmount = Math.min(player.chips, action.amount);
                player.chips -= raiseAmount;
                this.gameState.currentBet += raiseAmount;
                this.gameState.pot += raiseAmount;
                action.amount = raiseAmount;
                break;
            case 'check':
                break;
            case 'bet':
                const betAmount = Math.min(player.chips, action.amount);
                player.chips -= betAmount;
                if (betAmount >= this.gameState.currentBet) {
                    this.gameState.currentBet = betAmount;
                }
                this.gameState.pot += betAmount;
                action.amount = betAmount;
                break;
        }
        this.gameState.addLog(describePlayerAction(action));
        this.gameState.actions.push(action);
    }

    private hasRoundEnded(): boolean {
        const activePlayers = this.players.filter(p => p.isActive);
        if (activePlayers.length <= 1) return true;

        const firstBet = activePlayers[0].getLastBet();
        return activePlayers.every(p => p.getLastBet() === firstBet);
    }

    private payWinner() {
        const activePlayers = this.players.filter(p => p.isActive);
        if (activePlayers.length === 0) throw Error("Should have at least one active player.");
        if (activePlayers.length === 1) {
            activePlayers[0].chips += this.gameState.pot;
        }
        else {
            let bestHandRank = rankingHands(activePlayers, this.gameState.communityCards);
            const winners = bestHandRank[0].players;
            const potShare = this.gameState.pot / winners.length;
            winners.forEach(winner => {
                winner.chips += potShare;
            });
        }
        this.gameState.pot = 0;
        this.gameState.currentBet = 0;
    }

    private eliminatePlayersAndMoveTheSmallBlindForward() {
        this.players = [...this.players.slice(1), this.players[0]].filter(player => player.chips > 0);
    }
}