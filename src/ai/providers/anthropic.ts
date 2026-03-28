import type { ChatMessage, ChatProvider } from "../ChatProvider";

export class AnthropicProvider implements ChatProvider {
  id = "anthropic";
  name = "Anthropic (Claude)";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "claude-sonnet-4-20250514") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key is not set");
    }

    // Separate system messages from user/assistant messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const systemPrompt =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join("\n\n")
        : undefined;

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: conversationMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Anthropic API error (${response.status}): ${errorBody}`
      );
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textBlock = data.content.find((b) => b.type === "text");
    if (!textBlock?.text) {
      throw new Error("No text content in Anthropic response");
    }

    return textBlock.text;
  }
}
