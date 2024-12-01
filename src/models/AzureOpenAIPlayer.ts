import { setTimeout } from "timers/promises";
import { LLMPlayer } from "./LLMPlayer";

export class AzureOpenAIPlayer extends LLMPlayer {
  private logName: string;

  constructor(
    id: number,
    name: string,
    chips: number,
    private api: string,
    private apiKey: string,
    showHandInLog: boolean = true,
  ) {
    super(id, name, chips, showHandInLog);
    this.logName = `${new Date().toISOString()}_AzureOpenAIPlayer_${name}.log`;
  }

  async queryLLM(prompt: string): Promise<string> {
    const headers = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
    };

    const data = {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
    };

    await this.logToFile(this.logName, `Request:\n${JSON.stringify(data)}\n`);
    let retry = 3;
    await setTimeout(1000); // Wait for 1 seconds to avoid spamming api
    while (retry-- > 0) {
      try {
        const response = await fetch(this.api, {
          method: "POST",
          headers,
          body: JSON.stringify(data),
        });
        if (response.ok) {
          const llmResponse = await response.json();
          await this.logToFile(
            this.logName,
            `Response:\n${JSON.stringify(llmResponse)}\n`
          );

          return llmResponse.choices?.[0]?.message?.content || "Fold.";
        } else if (response.status !== 429) {
          console.error(`LLM call failed: ${response.statusText}`);
          break;
        }
        console.log("Rate limit exceeded. Retrying in 5 seconds...");
        await setTimeout(5000); // Wait for 5 seconds before retrying
      } catch (error) {
        console.error(`LLM call failed: ${error}`);
        return "Fold.";
      }
    }
    return "Fold.";
  }
}
