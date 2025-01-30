import { setTimeout } from "timers/promises";
import { LLMPlayer } from "./LLMPlayer";

export class OllamaPlayer extends LLMPlayer {
  private logName: string;
  private api: string;
  private model: string;

  constructor(
    id: number,
    name: string,
    chips: number,
    model: string,
    showHandInLog: boolean = true,
  ) {
    super(id, name, chips, showHandInLog);
    this.logName = `${new Date().toISOString()}_ollama_${model}_${name}.log`;
    this.api = process.env.OLLAMA_API_ENDPOINT || 'http://localhost:11434';
    this.model = model;
  }

  async queryLLM(prompt: string): Promise<string> {
    const headers = {
      "Content-Type": "application/json",
    };

    const data = {
      model: this.model,
      prompt: prompt,
      stream: false,
    };

    await this.logToFile(this.logName, `Request:\n${JSON.stringify(data)}\n`);
    let retry = 0;

    while (retry++ <= 3) {
      try {
        const response = await fetch(`${this.api}/api/generate`, {
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

          return llmResponse.response || "Fold.";
        } else {
          const error = await response.text();
          console.error(`Ollama call failed: ${response.statusText}:\n${error}`);
          await setTimeout(retry * 1000); // Wait for 1 second times the number of retries before retrying
          continue;
        }
      } catch (error) {
        console.error(`Ollama call failed: ${error}`);
        return "Fold.";
      }
    }
    return "Fold.";
  }
} 