import { setTimeout } from "timers/promises";
import { LLMPlayer } from "./LLMPlayer";
import OpenAI from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources";

export class OpenAIClientPlayer extends LLMPlayer {
  protected logName: string;
  protected openai: OpenAI;
  protected model: string;

  constructor(
    id: number,
    name: string,
    chips: number,
    model: string,
    showHandInLog: boolean = true,
  ) {
    super(id, name, chips, showHandInLog);
    this.logName = `${new Date().toISOString()}_OpenAIClientPlayer_${name}.log`;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_ENDPOINT,
    });
    this.model = model;
  }

  async queryLLM(prompt: string): Promise<string> {
    const data: ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
    };

    await this.logToFile(this.logName, `Request:\n${JSON.stringify(data)}\n`);
    let retry = 0;
    // await setTimeout(1000); // Wait for 1 seconds to avoid spamming api
    while (retry++ <= 10) {
      try {
        const response = await this.openai.chat.completions.create(data);
        const llmResponse = response.choices[0].message.content || "Fold.";
        await this.logToFile(
          this.logName,
          `Response:\n${JSON.stringify(llmResponse)}\n`
          );
          return llmResponse;
      } catch (error) {
        if (error instanceof OpenAI.APIError) {
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
