import OpenAI from "openai";
import { OpenAIClientPlayer } from "./OpenAIClientPlayer";

export class DeepSeekClientPlayer extends OpenAIClientPlayer {
  constructor(
    id: number,
    name: string,
    chips: number,
    model: string,
    showHandInLog: boolean = true,
  ) {
    super(id, name, chips, model, showHandInLog);
    this.logName = `${new Date().toISOString()}_DeepSeekClientPlayer_${name}.log`;
    this.openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_API_ENDPOINT,
    });
    this.model = model;
  }
}
