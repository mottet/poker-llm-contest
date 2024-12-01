import { LLMPlayer } from "./LLMPlayer";

export class ConsolePlayer extends LLMPlayer {
  constructor(id: number, name: string, chips: number) {
    super(id, name, chips);
  }

  async queryLLM(prompt: string): Promise<string> {
    const response = await new Promise<string>((resolve) => {
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      readline.question(`${prompt}\n`, (answer: string) => {
        readline.close();
        resolve(answer);
      });
    });
    return response;
  }
}
