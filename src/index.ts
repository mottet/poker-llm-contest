import { Game } from './Game';
import { ConsolePlayer } from './models/ConsolePlayer';
import * as readline from 'readline';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { AzureOpenAIPlayer } from './models/AzureOpenAIPlayer';
import { Player } from './models/Player';

dotenv.config();

async function createPlayers() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const numberOfPlayers = await new Promise<number>((resolve) => {
    rl.question('Enter the number of players: ', (answer) => {
      resolve(parseInt(answer, 10));
    });
  });

  const players: ConsolePlayer[] = [];

  for (let i = 1; i <= numberOfPlayers; i++) {
    const playerName = await new Promise<string>((resolve) => {
      rl.question(`Enter name for Player ${i}: `, (name) => {
        resolve(name);
      });
    });

    const chipAmount = await new Promise<number>((resolve) => {
      rl.question(`Enter chip amount for Player ${i}: `, (amount) => {
        resolve(parseInt(amount, 10));
      });
    });

    players.push(new ConsolePlayer(i, playerName, chipAmount));
  }
  rl.close();

  return players;
}

async function playInteractiveGame(players: Player[]) {
  let continueGame: number = 10000;
  const game = new Game(players);

  do {
    await game.playRound();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (continueGame < 1) {
      continueGame = await new Promise<number>((resolve) => {
        rl.question('\n\nDo you want to play another round? Enter number to run multiple rounds ([yes]/no/<number_of_round>): ', (answer) => {
          if (answer.toLowerCase() === 'no') {
            resolve(0);
          } else if (!isNaN(Number(answer))) {
            resolve(Number(answer));
          }
          resolve(1);
        });
      });
    }

    rl.close();
  } while (players.filter(player => player.chips > 0).length >= 2 && continueGame-- > 0);

  console.log('Game over!');
}

async function playMultipleGames(players: Player[], numberOfGames: number = 1000) {
  const winCounts = new Map<string, number>();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = `poker_tournament_results_${timestamp}.log`;

  for (let gameCount = 0; gameCount < numberOfGames; gameCount++) {
    // Reset players' chips for each new game
    players.forEach(p => p.chips = 1000);

    const game = new Game(players);

    while (players.filter(player => player.chips > 0).length >= 2) {
      await game.playRound();
    }

    const winner = players.find(player => player.chips > 0);
    if (winner) {
      winCounts.set(winner.name, (winCounts.get(winner.name) || 0) + 1);
    }

    // Log current standings after each game
    const sortedWins = Array.from(winCounts.entries())
      .sort(([, a], [, b]) => b - a);

    let leaderboardText = `Game ${gameCount + 1} Rankings:\n`;
    sortedWins.forEach(([name, wins], index) => {
      leaderboardText += `${index + 1}. ${name}: ${wins} wins (${(wins / (gameCount + 1) * 100).toFixed(1)}%)\n`;
    });

    fs.writeFileSync(logFile, leaderboardText);
  }

  console.log('\nFinal Rankings:');
  const sortedWins = Array.from(winCounts.entries())
    .sort(([, a], [, b]) => b - a);

  sortedWins.forEach(([name, wins], index) => {
    console.log(`${index + 1}. ${name}: ${wins} wins (${(wins / numberOfGames * 100).toFixed(1)}%)`);
  });
}

async function main() {

  const players: Player[] = [
    new AzureOpenAIPlayer(0, "Marvin", 1000, "gpt-4o"),
    new AzureOpenAIPlayer(1, "Joce", 1000, "AI21-Jamba-1.5-Large"),
    new AzureOpenAIPlayer(2, "Dimitri", 1000, "Mistral-Large-2411"),
    new AzureOpenAIPlayer(3, "Thomas", 1000, "Llama-3.3-70B-Instruct"),
    new AzureOpenAIPlayer(4, "Belle", 1000, "gpt-4o"),
    new AzureOpenAIPlayer(5, "Roxane", 1000, "Mistral-Large-2411"),
    new AzureOpenAIPlayer(6, "Alice", 1000, "Llama-3.3-70B-Instruct"),
    new AzureOpenAIPlayer(7, "Nicolas", 1000, "AI21-Jamba-1.5-Large"),
  ]

  // Uncomment one of these lines to choose the mode:
  // await playInteractiveGame(players);
  await playMultipleGames(players, 1000);
}

main();
