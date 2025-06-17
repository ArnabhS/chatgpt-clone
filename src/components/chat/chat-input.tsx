"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput({ onSend }: { onSend: (msg: any) => void }) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSend({ role: "user", content: input });
    setInput("");
  };

  return (
    <div className="border-t p-4">
      <div className="max-w-2xl mx-auto flex items-end gap-2">
        <Textarea
          placeholder="Send a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="resize-none"
        />
        <Button onClick={handleSubmit}>Send</Button>
      </div>
    </div>
  );
}
