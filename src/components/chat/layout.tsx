"use client"

import { useState, useEffect } from "react"
import { useUser, SignOutButton } from "@clerk/nextjs"
import { AppSidebar } from "./sidebar"
import ChatWindow from "./chat-window"
import ChatInput from "./chat-input"
import { TokenUsage } from "./token-usage"
import { Button } from "@/components/ui/button"
import { Share, MoreHorizontal, ChevronDown, Menu, User } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { v4 as uuidv4 } from 'uuid'
import { MODEL_CONFIGS, DEFAULT_MODEL } from '@/lib/trimMessages'
import { validateModelSwitch } from '@/lib/model-utils'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from '@ai-sdk/ui-utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageData?: string
  imageName?: string
}

export default function ChatLayout() {
  const { user } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)

  // useChat for text-only streaming
  const {
    messages: chatMessages,
    input,
    setInput,
    isLoading,
    handleInputChange,
    handleSubmit: handleTextSubmit,
    setMessages: setChatMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      userId: user?.id || "guest",
      chatId: currentChatId,
      modelName: selectedModel,
    },
  })

  // Local state for image messages
  const [messages, setMessages] = useState<Message[]>([])

  // Use messages from image logic if present, else useChat's messages (filtered to 'user'/'assistant')
  const displayMessages: Message[] = messages.length > 0
    ? messages
    : (chatMessages
        .filter((msg: UIMessage) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: UIMessage) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })) as Message[])

  // Custom submit handler for FormData
  const handleSubmit = async (formData: FormData | React.FormEvent<HTMLFormElement>) => {
    // If called from a form event, delegate to useChat's handleSubmit
    if (typeof (formData as React.FormEvent<HTMLFormElement>).preventDefault === 'function') {
      handleTextSubmit(formData as React.FormEvent<HTMLFormElement>)
      return
    }
    // Otherwise, it's a FormData (image upload)
    const fd = formData as FormData
    const message = fd.get('message') as string
    const imageData = fd.get('imageData') as string
    const imageName = fd.get('imageName') as string
    if (imageData) {
      fd.append('userId', user?.id || "guest")
      fd.append('chatId', currentChatId || '')
      fd.append('modelName', selectedModel)
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: message || '',
        imageData: imageData || undefined,
        imageName: imageName || undefined
      }
      setMessages(prev => [...prev, userMessage])
      setInput('')
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          body: fd,
        })
        if (response.ok) {
          const reader = response.body?.getReader()
          if (reader) {
            let assistantMessage = ''
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split('\n')
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    const assistantMsg: Message = {
                      id: uuidv4(),
                      role: 'assistant',
                      content: assistantMessage
                    }
                    setMessages(prev => [...prev, assistantMsg])
                    return
                  }
                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.text) {
                      assistantMessage += parsed.text
                    }
                  } catch {}
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error submitting message:', error)
      }
    } else {
      // fallback: should not happen, but just in case
      handleTextSubmit(fd as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

  // Start a new chat
  const startNewChat = () => {
    const newChatId = uuidv4()
    setCurrentChatId(newChatId)
    setMessages([])
    setChatMessages([])
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
        setChatMessages(data.messages || [])
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

  // Handle model switching with validation
  const handleModelSwitch = (newModel: string) => {
    if ((messages.length === 0) && (chatMessages.length === 0)) {
      setSelectedModel(newModel);
      return;
    }
    const validation = validateModelSwitch(messages.length > 0 ? messages : chatMessages, newModel);
    if (validation.canSwitch) {
      setSelectedModel(newModel);
    } else {
      console.warn('Cannot switch model:', validation.reason);
      alert(`Cannot switch to ${MODEL_CONFIGS[newModel]?.name}: ${validation.reason}`);
    }
  };

  // Replaces user message and regenerates assistant reply
  const handleEditMessage = async (index: number, newMessage: string) => {
    const updated = [...(messages.length > 0 ? messages : chatMessages)]
    updated[index] = { ...updated[index], content: newMessage }
    const sliceBefore = updated.slice(0, index + 1)
    await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ 
        messages: sliceBefore, 
        userId: user?.id || "guest",
        chatId: currentChatId,
        modelName: selectedModel,
      }),
    })
    window.location.reload()
  }

  return (
    <div className="flex h-screen bg-[#212121] relative">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? 'w-0' : 'w-[260px]'}`}> 
        <AppSidebar 
          onNewChat={startNewChat}
          onLoadChat={loadChat}
          currentChatId={currentChatId}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        {/* Collapse/Expand Button - always absolutely positioned */}
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute top-2 ${isCollapsed ? 'left-1' : 'right-2'} z-30 w-8 h-8 bg-[#232323] border border-[#353535] rounded-xl shadow hover:bg-[#2a2a2a] flex items-center justify-center`}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="16" height="14" rx="3" stroke="#fff" strokeWidth="1.5" fill="none" />
            <rect x="6.5" y="7" width="2" height="8" rx="1" fill="#fff" />
            <rect x="11.5" y="7" width="2" height="8" rx="1" fill="#fff" opacity="0.5" />
          </svg>
        </button>
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
              className="text-gray-400 hover:text-white hover:bg-[#303030] md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-[#303030] hover:text-white gap-1">
                  {MODEL_CONFIGS[selectedModel]?.name || 'ChatGPT'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#303030] border-gray-700">
                {Object.entries(MODEL_CONFIGS).map(([key, config]) => (
                  <DropdownMenuItem 
                    key={key}
                    className="text-white hover:bg-[#303030]"
                    onClick={() => handleModelSwitch(key)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{config.name}</span>
                      <span className="text-xs text-gray-400">
                        {config.maxTokens.toLocaleString()} tokens • ${config.costPer1kInput}/1k input
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#303030]">
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#303030]">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {/* User Menu with Logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#303030] p-1">
                  {user?.imageUrl ? (
                    <img 
                      src={user.imageUrl} 
                      alt={user.firstName || "User"} 
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#303030] border-gray-700">
                <DropdownMenuItem className="text-white hover:bg-[#303030]">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                    <span className="text-xs text-gray-400">Account</span>
                  </div>
                </DropdownMenuItem>
               
                <DropdownMenuItem className="text-red-400 hover:bg-[#303030]">
                  <SignOutButton>
                    <button className="flex items-center w-full text-left">
                      <span>Sign out</span>
                    </button>
                  </SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          <ChatWindow
            messages={displayMessages}
            onEditMessage={handleEditMessage}
            isLoading={isLoading}
            input={input}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        </div>
        {/* Token Usage Indicator */}
        <TokenUsage messages={displayMessages} selectedModel={selectedModel} />
        {displayMessages.length > 0 && (
          <div className="w-full bg-[#212121] border-t border-gray-700 sticky bottom-0 z-20">
            <div className="max-w-3xl mx-auto px-4">
              <ChatInput
                input={input}
                isLoading={isLoading}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
