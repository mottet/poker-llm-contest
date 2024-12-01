import { Game } from './Game';
import { LLMPlayer } from './models/LLMPlayer';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // const apiKey = process.env.OPENAI_API_KEY;
  // if (!apiKey) {
  //   console.error('OpenAI API key is required.');
  //   return;
  // }

  // const players = [
  //   //new LLMPlayer(1, 'LLM Bot 1', 1000, apiKey),
  //   //new LLMPlayer(2, 'LLM Bot 2', 1000, apiKey),
  // ];

  // const game = new Game(players);
  // await game.playRound();
}

main();