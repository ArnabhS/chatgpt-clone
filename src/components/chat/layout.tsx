"use client";

import { useState } from "react";
import Sidebar from "./sidebar";
import ChatWindow from "./chat-window";
import ChatInput from "./chat-input";

export default function ChatLayout() {
  const [messages, setMessages] = useState([]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <ChatWindow messages={messages} />
        <ChatInput
          onSend={(msg) => setMessages((prev) => [...prev, msg])}
        />
      </div>
    </div>
  );
}
