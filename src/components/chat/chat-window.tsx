"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { CheckIcon, XIcon, Copy, Edit } from "lucide-react"
import { Message } from "@ai-sdk/react"
import ChatInput from "./chat-input"
import ReactMarkdown from "react-markdown"

export default function ChatWindow({
  messages,
  onEditMessage,
  isLoading = false,
  input,
  setInput,
  onInputChange,
  onSubmit,
}: {
  messages: Message[]
  onEditMessage?: (index: number, newMessage: string) => void
  isLoading?: boolean
  input: string
  setInput: (val: string) => void
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => void
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <h1 className="text-3xl sm:text-4xl font-medium text-white mb-2">
              What are you working on?
            </h1>
            <div className="w-full max-w-2xl mt-6">
              <ChatInput
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                onInputChange={onInputChange}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user"
              const isEditing = editingIndex === idx

              return (
                <div key={idx} className="group">
                  <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`flex-1 max-w-2xl ${isUser ? "order-first" : ""}`}>
                      <div className={`relative ${isUser ? "text-right" : ""}`}>
                        {isEditing ? (
                          <div className="flex items-start gap-2">
                            <textarea
                              className="w-full bg-[#303030] text-white p-3 rounded-lg border border-gray-600 focus:border-gray-500 resize-none"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              rows={3}
                            />
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                                onClick={() => {
                                  if (onEditMessage) onEditMessage(idx, editValue)
                                  setEditingIndex(null)
                                }}
                              >
                                <CheckIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                                onClick={() => setEditingIndex(null)}
                              >
                                <XIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`prose prose-invert max-w-none ${
                                isUser ? "bg-[rgb(48,48,48)] text-white px-4 py-3 rounded-3xl inline-block" : "text-gray-100"
                              }`}
                            >
                              <div className="whitespace-pre-wrap">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div
                              className={`flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                                isUser ? "justify-end" : "justify-start"
                              }`}
                            >
                              {!isUser && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                                  onClick={() => copyToClipboard(msg.content)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              )}
                              {isUser && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                                  onClick={() => {
                                    setEditingIndex(idx)
                                    setEditValue(msg.content)
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="flex-1 max-w-2xl">
                  <div className="relative">
                    <div className="prose prose-invert max-w-none text-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  )
}
