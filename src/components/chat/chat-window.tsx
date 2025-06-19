"use client"

import { useState, useRef, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Copy, Edit } from "lucide-react"
import ChatInput from "./chat-input"
import ReactMarkdown from "react-markdown"
import Image from "next/image"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageData?: string
  imageName?: string
  pdfData?: string
  pdfName?: string
  txtData?: string
  txtName?: string
}

export default function ChatWindow({
  messages,
  editingIndex,
  setEditingIndex,
  isLoading = false,
  input,
  onInputChange,
  onSubmit,
  onEditSubmit,
}: {
  messages: Message[]
  onEditMessage?: (index: number, newMessage: string) => void
  isLoading?: boolean
  input: string
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (formData: FormData) => void
  editingIndex: number | null
  setEditingIndex: React.Dispatch<React.SetStateAction<number | null>>
  onEditSubmit?: (formData: FormData) => void
}) {
  
  const [editValue, setEditValue] = useState("")

  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleEditMessage = (formData: FormData) => {
    const newMessage = formData.get('message') as string;
    const editIndex = Number(formData.get('editIndex'));

    // 1. Copy all messages up to the edited one (excluding any after)
    let updated: Message[];
    if (messages.length > 0) {
      updated = messages.slice(0, editIndex);
      // 2. Add the edited message as the last user message
      updated.push({
        ...messages[editIndex],
        content: newMessage,
      });
      setEditingIndex(null);
    } else {
      updated = messages
        .filter((msg: Message) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: Message) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          imageData: (msg as { imageData?: string }).imageData,
          imageName: (msg as { imageName?: string }).imageName,
          pdfData: (msg as { pdfData?: string }).pdfData,
          pdfName: (msg as { pdfName?: string }).pdfName,
          txtData: (msg as { txtData?: string }).txtData,
          txtName: (msg as { txtName?: string }).txtName,
        }))
        .slice(0, editIndex);
      updated.push({
        ...messages[editIndex],
        content: newMessage,
      });
      setEditingIndex(null);
    }

    // 3. Call handleSubmit with the edited message
    const sendForm = new FormData();
    sendForm.append('message', newMessage);
    onSubmit(sendForm);
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-40">
            <h1 className="text-3xl sm:text-4xl font-medium text-white mb-2">
              What are you working on?
            </h1>
            <div className="w-full max-w-2xl mt-6">
              <ChatInput
                input={input}
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
                <div key={msg.id} className="group">
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
                                  if (onEditSubmit) {
                                    const formData = new FormData();
                                    formData.append('message', editValue);
                                    formData.append('editIndex', idx.toString());
                                    onEditSubmit(formData);
                                  }
                                  setEditingIndex(null);
                                }}
                              >
                                Send
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                                onClick={() => setEditingIndex(null)}
                              >
                                Cancel
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
                              {/* Image Display */}
                              {msg.imageData && (
                                <div className={`mb-3 ${isUser ? "text-left" : ""}`}>
                                  <Image
                                    src={msg.imageData}
                                    height={100}
                                    width={100}
                                    alt={msg.imageName || "Uploaded image"}
                                    className="max-w-full h-auto rounded-lg max-h-64 object-contain"
                                  />
                                  {msg.imageName && (
                                    <p className="text-xs text-gray-400 mt-1">{msg.imageName}</p>
                                  )}
                                </div>
                              )}
                              {/* PDF Display */}
                              {(msg.pdfName && !msg.pdfData) && (
                                <div className={`mb-3 flex items-center gap-2 ${isUser ? "text-left" : ""}`}>
                                  {/* Simple PDF icon using SVG */}
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="3" width="18" height="18" rx="2" fill="#E53E3E"/>
                                    <text x="7" y="17" fontSize="10" fill="white" fontFamily="Arial" fontWeight="bold">PDF</text>
                                  </svg>
                                  <span className="text-sm text-red-300 font-semibold">{msg.pdfName}</span>
                                </div>
                              )}
                              {msg.pdfData && (
                                <div className={`mb-3 ${isUser ? "text-left" : ""}`}>
                                  <a href={msg.pdfData} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                                    {msg.pdfName || "View PDF"}
                                  </a>
                                </div>
                              )}
                              {/* TXT Display */}
                              {msg.txtData && (
                                <div className={`mb-3 ${isUser ? "text-left" : ""}`}>
                                  <pre className="bg-[#232323] text-white p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                                    {msg.txtData.length > 1000 ? msg.txtData.slice(0, 1000) + '... (truncated)' : msg.txtData}
                                  </pre>
                                  {msg.txtName && (
                                    <a
                                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(msg.txtData)}`}
                                      download={msg.txtName}
                                      className="text-blue-400 underline text-xs mt-1 block"
                                    >
                                      Download TXT
                                    </a>
                                  )}
                                </div>
                              )}
                              
                              {/* Text Content */}
                              {msg.content && (
                                <div className="whitespace-pre-wrap">
                                  <ReactMarkdown
                                    components={{
                                      code({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean; children?: React.ReactNode }) {
                                        const match = /language-(\w+)/.exec(className || "")
                                        return !inline && match ? (
                                          <SyntaxHighlighter
                                            style={oneDark}
                                            language={match[1]}
                                            PreTag="div"
                                            {...props}
                                          >
                                            {String(children).replace(/\n$/, "")}
                                          </SyntaxHighlighter>
                                        ) : (
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        )
                                      }
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              )}
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
            {isLoading && (!messages.length || messages[messages.length - 1].role !== "assistant") && (
              <div className="flex gap-4 justify-start">
                <div className="flex-1 max-w-2xl">
                  <div className="relative">
                    <div className="prose prose-invert max-w-none text-gray-100">
                      <p>Analysing...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Auto-scroll anchor */}
      <div ref={bottomRef} />
    </ScrollArea>
  )
}
