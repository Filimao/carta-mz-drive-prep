import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

import instrutorLogo from "@/assets/instrutor-facil.png";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

const SUGESTOES = [
  "Dá-me uma questão aleatória",
  "Explica as regras da rotunda",
  "Qual é o limite de álcool?",
  "Quais são os planos e preços?",
] as const;

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  function enviar(valor: string) {
    const limpo = valor.trim();
    if (!limpo || busy) return;
    setText("");
    void sendMessage({ text: limpo });
  }

  return (
    <div className="flex h-[min(80vh,600px)] w-[min(100vw-1.5rem,26rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={instrutorLogo}
            alt="Instrutor Fácil"
            width={512}
            height={512}
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-xl bg-secondary object-contain"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">Instrutor Fácil</p>
            <p className="truncate text-xs text-muted-foreground">
              Tira dúvidas sobre o exame teórico
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar assistente"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="gap-3">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <img
                  src={instrutorLogo}
                  alt=""
                  width={512}
                  height={512}
                  loading="lazy"
                  className="h-16 w-16 object-contain"
                />
              }
              title="Olá! Sou o Instrutor Fácil"
              description="Pergunta sobre sinais, prioridades, velocidades ou pede uma questão para treinar."
            >
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={`${message.id}-t-${index}`}>
                          {part.text}
                        </MessageResponse>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      const toolPart = part as ToolUIPart;
                      return (
                        <Tool defaultOpen={false} key={`${message.id}-x-${index}`}>
                          <ToolHeader state={toolPart.state} type={toolPart.type} />
                          <ToolContent>
                            <ToolInput input={toolPart.input} />
                            <ToolOutput
                              errorText={toolPart.errorText}
                              output={
                                toolPart.output ? (
                                  <pre className="overflow-x-auto text-xs">
                                    {JSON.stringify(toolPart.output, null, 2)}
                                  </pre>
                                ) : undefined
                              }
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Shimmer>A pensar...</Shimmer>}
          {error && (
            <p className="text-xs text-destructive">
              Ocorreu um erro a falar com o assistente. Tenta novamente.
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={(_message, event) => {
            event.preventDefault();
            enviar(text);
          }}
        >
          <PromptInputTextarea
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreve a tua pergunta..."
            value={text}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              disabled={!busy && text.trim().length === 0}
              onStop={() => stop()}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export function ChatBot() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-4 z-40 md:bottom-6">
      {open ? (
        <ChatPanel onClose={() => setOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir assistente Instrutor Fácil"
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Instrutor Fácil</span>
        </button>
      )}
    </div>
  );
}
