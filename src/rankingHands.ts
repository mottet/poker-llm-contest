import { Player } from './models/Player';
import { Card, Suit } from './models/Card';


export enum HandValue {
    HighCard,
    OnePair,
    TwoPair,
    ThreeOfAKind,
    Straight,
    Flush,
    FullHouse,
    FourOfAKind,
    StraightFlush
}

type Hand = {
    handValue: HandValue
    kickersRank: number[]
}

type PlayerRank = { players: Player[], hand: Hand }

export function rankingHands(players: Player[], communityCards: Card[]): PlayerRank[] {
    // Step 1: Evaluate each player's hand
    const evaluatedPlayers = players.map(player => ({
        player,
        hand: evaluateHand(player.hand, communityCards),
    }));

    // Step 2: Build rankings dynamically
    const groupedPlayers: PlayerRank[] = [];

    for (const evaluatedPlayer of evaluatedPlayers) {
        addPlayerToGroup(groupedPlayers, evaluatedPlayer);
    }

    return groupedPlayers;
}

function addPlayerToGroup(groupedPlayers: PlayerRank[], evaluatedPlayer: { player: Player, hand: Hand }) {
    const { player, hand } = evaluatedPlayer;
    for (let index = 0; index < groupedPlayers.length; ++index) {
        const result = compareHands(groupedPlayers[index].hand, hand);
        if (result > 0) {
            groupedPlayers.splice(index, 0, { players: [player], hand });
            return;
        }
        if (result === 0) {
            groupedPlayers[index].players.push(player);
            return;
        }
    }
    groupedPlayers.push({ players: [player], hand })
}

function compareHands(handA: Hand, handB: Hand): number {
    // Compare by hand value
    if (handB.handValue !== handA.handValue) {
        return handB.handValue - handA.handValue;
    }

    // Compare by kickers
    for (let i = 0; i < Math.min(handB.kickersRank.length, handA.kickersRank.length); i++) {
        if (handB.kickersRank[i] !== handA.kickersRank[i]) {
            return handB.kickersRank[i] - handA.kickersRank[i];
        }
    }

    return 0; // If completely identical, keep them in the same rank
}

function evaluateHand(playerHand: Card[], communityCards: Card[]): { handValue: HandValue, kickersRank: number[] } {
    const allCards = [...playerHand, ...communityCards];

    const flushHand = extractFlushHandIfAny(allCards);
    const rankCount = getRankCount(flushHand || allCards);

    const straightValue = getStraightValue(rankCount);

    if (flushHand) {
        if (straightValue !== -1) {
            return { handValue: HandValue.StraightFlush, kickersRank: [straightValue] };
        }
        return { handValue: HandValue.Flush, kickersRank: flushHand.map(h => h.rankValue).sort((a, b) => b - a).slice(0, 5) };
    }

    if (straightValue !== -1) {
        return { handValue: HandValue.Straight, kickersRank: [straightValue] };
    }

    const fourOfAKind = findRankWithCount(rankCount, 4);
    if (fourOfAKind !== null) {
        const kickerCards = getKickerCards(rankCount, [fourOfAKind], 1);
        return { handValue: HandValue.FourOfAKind, kickersRank: [fourOfAKind, ...kickerCards] };
    }

    const threeOfAKind = findRankWithCount(rankCount, 3);
    const pairForFullHouse = findRankWithCount(rankCount, 2, threeOfAKind);
    if (threeOfAKind !== null && pairForFullHouse !== null) {
        return { handValue: HandValue.FullHouse, kickersRank: [threeOfAKind, pairForFullHouse] };
    }

    if (threeOfAKind !== null) {
        const kickerCards = getKickerCards(rankCount, [threeOfAKind], 2);
        return { handValue: HandValue.ThreeOfAKind, kickersRank: [threeOfAKind, ...kickerCards] };
    }

    const pairs = findAllRanksWithCount(rankCount, 2);
    if (pairs.length >= 2) {
        const topTwoPairs = pairs.slice(0, 2);
        const kickerCards = getKickerCards(rankCount, topTwoPairs, 1);
        return { handValue: HandValue.TwoPair, kickersRank: [...topTwoPairs, ...kickerCards] };
    }

    const onePair = pairs.length > 0 ? pairs[0] : null;
    if (onePair !== null) {
        const kickerCards = getKickerCards(rankCount, [onePair], 3);
        return { handValue: HandValue.OnePair, kickersRank: [onePair, ...kickerCards] };
    }

    const highCardKickers = getKickerCards(rankCount, [], 5);
    return { handValue: HandValue.HighCard, kickersRank: highCardKickers };

}

function findRankWithCount(rankCount: number[], count: number, excludeRank: number | null = null): number | null {
    for (const [rank, rankCountValue] of rankCount.entries()) {
        if (rankCountValue === count && rank !== excludeRank) {
            return rank;
        }
    }
    return null;
}

function findAllRanksWithCount(rankCount: number[], count: number): number[] {
    return [...rankCount.entries()]
        .filter(([_, rankCountValue]) => rankCountValue === count)
        .map(([rank]) => rank)
        .sort((a, b) => b - a);
}

function getKickerCards(rankCount: number[], excludeRanks: number[], numberOfKicker: number): number[] {
    const cardList: number[] = [];
    for (const [rank, count] of rankCount.entries()) {
        if (!excludeRanks.includes(rank)) {
            for (let i = 0; i < count; i++) {
                cardList.push(rank);
            }
        }
    }
    return cardList.sort((a, b) => b - a).slice(0, numberOfKicker);
}

function getRankCount(cards: Card[]): number[] {
    const rankCount = Array(13).fill(0);
    for (const card of cards) {
        rankCount[card.rankValue]++;
    }
    return rankCount;
}

function extractFlushHandIfAny(cards: Card[]): Card[] | undefined {
    const suitCount: Record<Suit, Card[]> = {
        Clubs: [],
        Diamonds: [],
        Hearts: [],
        Spades: [],
    };
    for (const card of cards) {
        suitCount[card.suit].push(card);
    }
    return Object.values(suitCount).find(suitCards => suitCards.length >= 5);
}

/**
 * Checks if the given rank count array represents a straight hand.
 * 
 * A straight is a hand where all five cards are in sequential order, but not necessarily of the same suit.
 * This function checks for a straight by iterating through the rank count array from highest to lowest rank.
 * It checks if the current rank and the next four ranks have at least one card each. If the current rank is Ace (index 12),
 * it also checks if there is at least one card of rank Two (index 0) to account for the Ace-low straight (A-2-3-4-5).
 * 
 * @param rankCount An array representing the count of each rank in a hand, from Two to Ace.
 * @returns The highest rank of the straight if found, otherwise -1.
 */
function getStraightValue(rankCount: number[]): number {
    for (let i = rankCount.length - 1; i >= 3; i--) {
        if (rankCount[i] > 0 && rankCount[i - 1] > 0 && rankCount[i - 2] > 0 && rankCount[i - 3] > 0 && rankCount[((i - 4) + 13) % 13] > 0) {
            return i;
        }
    }
    return -1;
}
