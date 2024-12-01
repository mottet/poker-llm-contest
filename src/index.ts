import { Game } from './Game';
import { ConsolePlayer } from './models/ConsolePlayer';
import * as readline from 'readline';
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

async function main() {

  // const players: ConsolePlayer[] = await createPlayers();
  // const players: ConsolePlayer[] = [
  //   new ConsolePlayer(0, "Marvin", 1000),
  //   new ConsolePlayer(1, "Joce", 1000),
  //   new ConsolePlayer(2, "Dimitri", 1000),
  //   new ConsolePlayer(3, "Thomas", 1000),
  // ]
  const api = process.env.AZURE_OPEN_AI_API_ENDPOINT;
  const apiKey = process.env.AZURE_OPEN_AI_API_KEY;

  if (!api || !apiKey) {
    console.error("Missing api endpoint and/or api key.");
    return;
  }

  const players: Player[] = [
    new AzureOpenAIPlayer(0, "Marvin", 1000, api, apiKey),
    new AzureOpenAIPlayer(1, "Joce", 1000, api, apiKey),
    new AzureOpenAIPlayer(2, "Dimitri", 1000, api, apiKey),
    new AzureOpenAIPlayer(3, "Thomas", 1000, api, apiKey),
  ]
  
  let continueGame: number = 0;
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

main();
