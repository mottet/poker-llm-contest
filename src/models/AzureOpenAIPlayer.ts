import { setTimeout } from "timers/promises";
import { LLMPlayer } from "./LLMPlayer";

export class AzureOpenAIPlayer extends LLMPlayer {
  private logName: string;
  private api: string;
  private apiKey: string;

  constructor(
    id: number,
    name: string,
    chips: number,
    private model: string,
    showHandInLog: boolean = true,
  ) {
    super(id, name, chips, showHandInLog);
    this.logName = `${new Date().toISOString()}_${model}_${name}.log`;
    this.api = process.env.AZURE_OPEN_AI_API_ENDPOINT!;
    this.apiKey = process.env.AZURE_OPEN_AI_API_KEY!;
    if (!this.api || !this.apiKey) {
      throw new Error("Missing API credentials for Azure OpenAI");
    }
  }

  async queryLLM(prompt: string): Promise<string> {
    const headers = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
    };

    const data = {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
      model: this.model,
    };

    await this.logToFile(this.logName, `Request:\n${JSON.stringify(data)}\n`);
    let retry = 0;
    // await setTimeout(1000); // Wait for 1 seconds to avoid spamming api
    while (retry++ <= 10) {
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
          const error = await response.text();
          console.error(`LLM call failed: ${response.statusText}:\n${error}`);
          break;
        }
        console.log(`Rate limit exceeded. Retrying in ${retry * 5} seconds...`);
        await setTimeout(retry * 5000); // Wait for 5 seconds times the number of retries before retrying
      } catch (error) {
        console.error(`LLM call failed: ${error}`);
        return "Fold.";
      }
    }
    return "Fold.";
  }
}
