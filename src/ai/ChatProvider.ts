export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatProvider {
  id: string;
  name: string;
  sendMessage(messages: ChatMessage[]): Promise<string>;
}
