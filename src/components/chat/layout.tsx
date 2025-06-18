"use client"

import { useState, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { useUser } from "@clerk/nextjs"
import { AppSidebar } from "./sidebar"
import ChatWindow from "./chat-window"
import ChatInput from "./chat-input"
import { Button } from "@/components/ui/button"
import { Share, MoreHorizontal, ChevronDown, Menu, ChevronLeft, ChevronRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { v4 as uuidv4 } from 'uuid'

export default function ChatLayout() {
  const { user } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)

  const { messages, input, setInput, isLoading, handleInputChange, handleSubmit, setMessages } = useChat({
    api: "/api/chat",
    body: {
      userId: user?.id || "guest",
      chatId: currentChatId,
    },
  })

  // Start a new chat
  const startNewChat = () => {
    const newChatId = uuidv4()
    setCurrentChatId(newChatId)
    setMessages([])
  }

  // Load an existing chat
  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          userId: user?.id || "guest",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentChatId(chatId)
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading chat:', error)
    }
  }

  // Start a new chat when component first loads
  useEffect(() => {
    if (!currentChatId) {
      startNewChat()
    }
  }, [currentChatId])

  // Replaces user message and regenerates assistant reply
  const handleEditMessage = async (index: number, newMessage: string) => {
    const updated = [...messages]
    updated[index] = { ...updated[index], content: newMessage }

    // Slice only up to edited user message
    const sliceBefore = updated.slice(0, index + 1)
    await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ 
        messages: sliceBefore, 
        userId: user?.id || "guest",
        chatId: currentChatId,
      }),
    })

    window.location.reload() // force rerender (can be optimized)
  }

  return (
    <div className="flex h-screen bg-[#212121]">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? 'w-0' : 'w-[260px]'}`}>
        <AppSidebar 
          onNewChat={startNewChat}
          onLoadChat={loadChat}
          currentChatId={currentChatId}
        />
      </div>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="sm"
        className="hidden md:flex absolute left-[260px] top-4 z-10 text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-300"
        style={{ left: isCollapsed ? '0' : '260px' }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <AppSidebar 
          isSheet 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          onNewChat={startNewChat}
          onLoadChat={loadChat}
          currentChatId={currentChatId}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 relative bg-[#212121]">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-gray-700 bg-[#212121] px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-700 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-gray-700 gap-1">
                  ChatGPT
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                <DropdownMenuItem className="text-white hover:bg-gray-700">ChatGPT-4</DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-gray-700">ChatGPT-3.5</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          <ChatWindow
            messages={messages}
            onEditMessage={handleEditMessage}
            isLoading={isLoading}
            input={input}
            setInput={setInput}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        </div>
        {messages.length > 0 && (
          <div className="w-full bg-[#212121] border-t border-gray-700 sticky bottom-0 z-20">
            <div className="max-w-3xl mx-auto px-4">
              <ChatInput
                input={input}
                isLoading={isLoading}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
                setInput={setInput}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
