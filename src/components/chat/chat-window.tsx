"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatWindow({ messages }: { messages: any[] }) {
  return (
    <ScrollArea className="flex-1 px-4 py-6 space-y-4">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`whitespace-pre-wrap max-w-2xl mx-auto p-3 rounded-lg ${
            msg.role === "user" ? "bg-primary text-white" : "bg-muted"
          }`}
        >
          {msg.content}
        </div>
      ))}
    </ScrollArea>
  );
}
