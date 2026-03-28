import { create } from "zustand";
import type { ChatMessage } from "../ai/ChatProvider";
import { AnthropicProvider } from "../ai/providers/anthropic";
import { OpenAIProvider } from "../ai/providers/openai";
import {
  buildSystemPrompt,
  buildScoreContext,
  extractScoreFromResponse,
} from "../ai/ScoreContext";
import { applyAIEdit } from "../ai/DiffApply";
import { expandPreset } from "../ai/presets";
import { useEditorStore } from "./EditorState";

export type ProviderType = "anthropic" | "openai";

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  provider: ProviderType;
  apiKey: string;
  error: string | null;

  sendMessage(text: string): Promise<void>;
  setProvider(p: ProviderType): void;
  setApiKey(key: string): void;
  clearMessages(): void;
}

function loadSettings(): { provider: ProviderType; apiKey: string } {
  try {
    const stored = localStorage.getItem("notation-ai-settings");
    if (stored) {
      const parsed = JSON.parse(stored) as {
        provider?: string;
        apiKey?: string;
      };
      return {
        provider: (parsed.provider as ProviderType) ?? "anthropic",
        apiKey: parsed.apiKey ?? "",
      };
    }
  } catch {
    // ignore
  }
  return { provider: "anthropic", apiKey: "" };
}

function saveSettings(provider: ProviderType, apiKey: string) {
  try {
    localStorage.setItem(
      "notation-ai-settings",
      JSON.stringify({ provider, apiKey })
    );
  } catch {
    // ignore
  }
}

export const useChatStore = create<ChatStore>((set, get) => {
  const initial = loadSettings();

  return {
    messages: [],
    isLoading: false,
    provider: initial.provider,
    apiKey: initial.apiKey,
    error: null,

    async sendMessage(text: string) {
      const state = get();
      if (state.isLoading) return;
      if (!state.apiKey) {
        set({ error: "Please set your API key in the AI settings." });
        return;
      }

      // Check for preset commands
      const expandedPrompt = expandPreset(text);
      const userText = expandedPrompt ?? text;

      // Add user message
      const userMessage: ChatMessage = { role: "user", content: text };
      set({
        messages: [...state.messages, userMessage],
        isLoading: true,
        error: null,
      });

      try {
        // Build provider
        const provider =
          state.provider === "anthropic"
            ? new AnthropicProvider(state.apiKey)
            : new OpenAIProvider(state.apiKey);

        // Build context
        const score = useEditorStore.getState().score;
        const systemPrompt = buildSystemPrompt();
        const scoreContext = buildScoreContext(score);

        // Build message list
        const allMessages: ChatMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "system", content: scoreContext },
          // Include previous conversation (skip system messages)
          ...state.messages.filter((m) => m.role !== "system"),
          { role: "user", content: userText },
        ];

        const responseText = await provider.sendMessage(allMessages);

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: responseText,
        };

        // Check if response contains a .notation code block
        const notationText = extractScoreFromResponse(responseText);
        if (notationText) {
          const result = applyAIEdit(score, notationText);
          if (result.ok) {
            // Apply to editor state — setScore triggers re-render
            useEditorStore.getState().setScore(result.score);
            // Mark as dirty since AI made edits
            useEditorStore.setState({ isDirty: true });
          } else {
            set((s) => ({
              messages: [
                ...s.messages,
                assistantMessage,
                {
                  role: "assistant" as const,
                  content: `⚠ Could not apply edit: ${result.error}`,
                },
              ],
              isLoading: false,
            }));
            return;
          }
        }

        set((s) => ({
          messages: [...s.messages, assistantMessage],
          isLoading: false,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        set((s) => ({
          messages: s.messages, // keep messages as-is
          isLoading: false,
          error: message,
        }));
      }
    },

    setProvider(p: ProviderType) {
      set({ provider: p });
      saveSettings(p, get().apiKey);
    },

    setApiKey(key: string) {
      set({ apiKey: key });
      saveSettings(get().provider, key);
    },

    clearMessages() {
      set({ messages: [], error: null });
    },
  };
});
