import { setTimeout } from "timers/promises";
import { LLMPlayer } from "./LLMPlayer";
import Anthropic from '@anthropic-ai/sdk';
import { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources";

export class AnthropicClientPlayer extends LLMPlayer {
  private logName: string;
  private anthropic: Anthropic;
  private model: string;

  constructor(
    id: number,
    name: string,
    chips: number,
    model: string,
    showHandInLog: boolean = true,
  ) {
    super(id, name, chips, showHandInLog);
    this.logName = `${new Date().toISOString()}_AnthropicClientPlayer_${name}.log`;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = model;
  }

  async queryLLM(prompt: string): Promise<string> {
    const data: MessageCreateParamsNonStreaming = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
    };

    await this.logToFile(this.logName, `Request:\n${JSON.stringify(data)}\n`);
    let retry = 0;
    // await setTimeout(1000); // Wait for 1 seconds to avoid spamming api
    while (retry++ <= 10) {
      try {
        const response = await this.anthropic.messages.create(data);
        const llmResponse = response.content[0].type === "text" ? response.content[0].text : "Fold.";
        await this.logToFile(
          this.logName,
          `Response:\n${JSON.stringify(llmResponse)}\n`
          );
          return llmResponse;
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          if (error.status !== 429) {
            console.error(`LLM call failed: ${error.message}`);
            break;
          }
          console.log(`Rate limit exceeded. Retrying in ${retry * 5} seconds...`);
          await setTimeout(retry * 5000); // Wait for 5 seconds times the number of retries before retrying
        } else {
          console.error(`LLM call failed: ${error}`);
          return "Fold.";
        }
      }
    }
    return "Fold.";
  }
}
