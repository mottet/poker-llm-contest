import { Player } from './Player';
import { GameState } from './GameState';
import { FullPlayerAction, PlayerAction } from './PlayerAction';
import { OpenAIApi, Configuration } from 'openai';

export class LLMPlayer extends Player {
  private openai: OpenAIApi;

  constructor(id: number, name: string, chips: number, apiKey: string) {
    super(id, name, chips);
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
  }

  async makeDecision(gameState: GameState): Promise<FullPlayerAction> {
    const prompt = this.generatePrompt(gameState);
    const response = await this.queryLLM(prompt);
    return { playerId: this.id, playerName: this.name, ...this.parseResponse(response)};
  }

  private generatePrompt(gameState: GameState): string {
    const handDescription = this.hand.map(card => card.toString()).join(' and ');
    const communityCards = gameState.communityCards.length
      ? gameState.communityCards.map(card => card.toString()).join(', ')
      : 'not deal yet';
    return `You are playing Texas Hold'em poker. Your hand is ${handDescription}. The community cards are ${communityCards}. The pot is ${gameState.pot} chips. It's your turn. Do you fold, call, raise, check, or bet?`;
  }

  private async queryLLM(prompt: string): Promise<string> {
    const response = await this.openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 50,
      temperature: 0.7,
    });
    return response.data.choices[0].text.trim();
  }

  private parseResponse(response: string): PlayerAction {
    const action = response.toLowerCase();
    if (action.includes('fold')) {
      return { type: 'fold' };
    } else if (action.includes('call')) {
      return { type: 'call' };
    } else if (action.includes('raise')) {
      const amount = this.extractAmount(response) || 10;
      return { type: 'raise', amount };
    } else if (action.includes('check')) {
      return { type: 'check' };
    } else if (action.includes('bet')) {
      const amount = this.extractAmount(response) || 10;
      return { type: 'bet', amount };
    } else {
      return { type: 'call' };
    }
  }

  private extractAmount(response: string): number | null {
    const match = response.match(/(\d+)/);
    return match ? parseInt(match[0], 10) : null;
  }
}
