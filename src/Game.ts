import { Player } from './models/Player';
import { Deck } from './models/Deck';
import { GameState } from './models/GameState';
import { describePlayerAction, FullPlayerAction, PossibleAction } from './models/PlayerAction';
import { HandValue, rankingHands } from './rankingHands';
import { Rank } from './models/Card';

export class Game {
    private deck!: Deck;
    private gameState: GameState;

    constructor(private players: Player[], smallBlind: number = 5, bigBlind: number = 10) {
        this.gameState = new GameState(players, smallBlind, bigBlind);
    }

    async playRound() {
        this.gameState.reset()
        this.players.forEach(player => {
            player.isActive = player.chips > 0;
            player.totalHandRoundBet = 0;
            player.hasActed = false;
            player.isAllIn = false;
        });

        await this.bettingPhases();

        // Showdown
        this.payWinners();

        // Eliminate players with no chips left and move blinds
        this.eliminatePlayersAndMoveBlinds();

        console.log(`\nPlayers stack:\n${this.gameState.playersStack()}`);
    }

    private async bettingPhases() {
        this.prepareDeck();
        this.makeBlindsPay();

        // Pre-Flop
        this.dealInitialCards();
        await this.bettingRound(true);

        if (this.players.filter(p => p.isActive).length < 2) {
            return;
        }

        // Flop
        this.dealCommunityCards(3);
        await this.bettingRound();
        if (this.players.filter(p => p.isActive).length < 2) {
            return;
        }
    
        // Turn
        this.dealCommunityCards(1);
        await this.bettingRound();
        if (this.players.filter(p => p.isActive).length < 2) {
            return;
        }
    
        // River
        this.dealCommunityCards(1);
        await this.bettingRound();
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
        smallBlindPlayer.totalHandRoundBet += smallBlindAmount;
        smallBlindPlayer.currentBet = smallBlindAmount;
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
        bigBlindPlayer.totalHandRoundBet += bigBlindAmount;
        bigBlindPlayer.currentBet = bigBlindAmount;
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
            if (player.showHandInLog) {
                console.log(`${player.name}: ${player.hand}`);
            }
        });
    }

    private dealCommunityCards(count: number) {
        for (let i = 0; i < count; i++) {
            this.gameState.communityCards.push(this.deck.deal());
        }
        this.gameState.addLog(`\nCommunity card are now: ${ this.gameState.communityCards.join("|") }`);
    }

    private async bettingRound(isFirstRound: boolean = false) {
        // Determine the starting player
        let currentPlayerIndex = isFirstRound ? (2 % this.players.length) : 0;

        
        // Reset players' hasActed status
        this.players.forEach(player => {
            if (player.isActive && !player.isAllIn) {
                player.hasActed = false;
            }
        });
        this.gameState.lastRaiseBy = this.gameState.bigBlind;

        let roundActive = this.shouldContinueBettingRound();
        while (roundActive) {
            const currentPlayer = this.players[currentPlayerIndex];

            if (currentPlayer.isActive && !currentPlayer.isAllIn && !currentPlayer.hasActed) {
                const possibleActions = this.getPossibleActions(currentPlayer);
                const action = await currentPlayer.makeDecision(this.gameState, possibleActions);

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
            player.currentBet = 0;
            player.hasActed = false;
        });
        this.gameState.currentBet = 0;
    }

    private getPossibleActions(player: Player): PossibleAction[] {
        // Check if the action is valid based on the game state
        const possibleActions: PossibleAction[] = [{ type: 'fold' }, { type: 'allIn' }];

        if (this.gameState.currentBet === 0 || player.currentBet === this.gameState.currentBet) {
            possibleActions.push({ type: 'check' });
        }
        if (this.gameState.currentBet > player.currentBet) {
            possibleActions.push({ type: 'call' });
        }
        if (this.gameState.currentBet === 0) {
            possibleActions.push({ type: 'bet', minimalAmount: Math.min(player.chips, this.gameState.lastRaiseBy) });
        }
        if (this.gameState.currentBet > 0 && player.chips + player.currentBet - this.gameState.currentBet > 0) {
            possibleActions.push({ type: 'raise', minimalAmount: Math.min(player.chips + player.currentBet - this.gameState.currentBet, this.gameState.lastRaiseBy) });
        }

        return possibleActions;
    }

    private validateAction(player: Player, action: FullPlayerAction): boolean {
        // Check if the action is valid based on the game state
        switch (action.type) {
            case 'fold':
            case 'allIn':
                return true;
            case 'check':
                return this.gameState.currentBet === 0 || player.currentBet === this.gameState.currentBet;
            case 'call':
                return this.gameState.currentBet > player.currentBet;
            case 'bet':
                return this.gameState.currentBet === 0 && action.amount > 0 && action.amount <= player.chips;
            case 'raise':
                const minRaise = Math.min(player.chips + player.currentBet - this.gameState.currentBet, this.gameState.lastRaiseBy);
                return this.gameState.currentBet > 0 && action.amount >= minRaise && action.amount <= player.chips;
            default:
                return false;
        }
    }

    private processAction(player: Player, action: FullPlayerAction) {
        // Validate the action before processing
        const isValid = this.validateAction(player, action);
        if (!isValid) {
            // If action is invalid, force a fold
            (action as any) = { type: 'fold' };
            this.gameState.addLog(describePlayerAction(action));
            this.gameState.actions.push(action);
            return;
        }

        switch (action.type) {
            case 'fold':
                player.isActive = false;
                break;
            case 'allIn':
                const allInAmount = player.chips;
                player.chips -= allInAmount;
                player.currentBet += allInAmount;
                player.totalHandRoundBet += allInAmount;
                this.gameState.pot += allInAmount;
                player.isAllIn = true;
                break;
            case 'call':
                const callAmount = Math.min(player.chips, this.gameState.currentBet - player.currentBet);
                player.chips -= callAmount;
                player.currentBet += callAmount;
                player.totalHandRoundBet += callAmount;
                this.gameState.pot += callAmount;
                break;
            case 'raise':
                const totalRaise = Math.min(player.chips, this.gameState.currentBet + action.amount - player.currentBet);
                action.amount = totalRaise - this.gameState.currentBet + player.currentBet;
                if (this.gameState.lastRaiseBy < action.amount) {
                    this.gameState.lastRaiseBy = action.amount;
                }
                player.chips -= totalRaise;
                player.currentBet += totalRaise;
                player.totalHandRoundBet += totalRaise;
                this.gameState.currentBet = player.currentBet;
                this.gameState.pot += totalRaise;
                break;
            case 'check':
                // No chips are bet when checking
                break;
            case 'bet':
                const betAmount = Math.min(player.chips, action.amount);
                action.amount = betAmount;
                player.chips -= betAmount;
                player.currentBet = betAmount;
                player.totalHandRoundBet += betAmount;
                this.gameState.currentBet = betAmount;
                this.gameState.lastRaiseBy = betAmount;
                this.gameState.pot += betAmount;
                break;
        }
        if (player.chips === 0) {
            (action as any) = { type: 'allIn' };
            player.isAllIn = true;
        }
        this.gameState.addLog(describePlayerAction(action));
        this.gameState.actions.push(action);
    }

    private shouldContinueBettingRound(): boolean {
        const activePlayers = this.players.filter(p => p.isActive && !p.isAllIn);
        // Betting round ends if:
        // - All active players have acted
        // - All bets are equal
        // - Only one player is active and not allin
        if (activePlayers.length === 1) {
            return false;
        }
        const allPlayersHaveActed = activePlayers.every(p => p.hasActed);
        const betsAreEqual = activePlayers.every(p => p.currentBet === this.gameState.currentBet);

        return !(allPlayersHaveActed && betsAreEqual);
    }

    private payWinners() {
        const activePlayers = this.players.filter(p => p.isActive);
        if (activePlayers.length === 0) throw Error("Should have at least one active player.");
        if (activePlayers.length === 1) {
            activePlayers[0].chips += this.gameState.pot;
            console.log(`Player ${activePlayers[0].name} wins the pot of ${this.gameState.pot}.`);
            this.gameState.pot = 0;
            return;
        }

        // Create side pots based on players' total bets
        const sidePots = this.createSidePots();

        let bestHandRank = rankingHands(activePlayers, this.gameState.communityCards);

        // Log the best hands of all active players
        bestHandRank.forEach(rank => {
            const playerNames = rank.players.map(p => p.name).join(", ");
            const kicker = rank.hand.kickersRank.length > 0 ? ` with kickers: ${rank.hand.kickersRank.map(k => Object.values(Rank)[k]).join(", ")}`: null;
            console.log(`Players ${playerNames} have a hand value of ${HandValue[rank.hand.handValue]}${kicker}`);
        });

        // Distribute each side pot to the winner(s)
        const paidPlayers: Record<string, number> = {};
        for (const pot of sidePots) {
            // Find the highest hand among players eligible for this pot
            const eligiblePlayers = bestHandRank.find(h => h.players.some(p => pot.players.includes(p)))!.players;
            const winners = eligiblePlayers.filter(ep => pot.players.includes(ep));

            // Divide the pot among winners
            const potShare = pot.amount / winners.length;
            winners.forEach(winner => {
                winner.chips += potShare;
                paidPlayers[winner.name] = (paidPlayers[winner.name] || 0) + potShare;
            });
        }
        Object.keys(paidPlayers).forEach(p => console.log(`Player ${p} wins ${paidPlayers[p]} from the pot.`))

        this.gameState.pot = 0;
    }

    private createSidePots() {
        const pots = [];
        const playersWithBets = this.players.filter(p => p.totalHandRoundBet > 0);

        // Sort players by total bet amount
        let sortedPlayers = playersWithBets.sort((a, b) => a.totalHandRoundBet - b.totalHandRoundBet);

        while (sortedPlayers.length > 0) {
            const smallestBet = sortedPlayers[0].totalHandRoundBet;

            // Calculate the pot amount
            const potAmount = smallestBet * sortedPlayers.length;

            // Add the pot to the list
            pots.push({
                amount: potAmount,
                players: [...sortedPlayers],
            });
            
            // Subtract the smallest bet from each player's totalRoundBet
            // and remove player if totalRoundBet is now zero
            sortedPlayers = sortedPlayers.filter(p => {
                p.totalHandRoundBet -= smallestBet;
                return p.totalHandRoundBet > 0;
            });
        }

        return pots;
    }

    private eliminatePlayersAndMoveBlinds() {
        this.players = [...this.players.slice(1), this.players[0]].filter(player => player.chips > 0);
    }
}