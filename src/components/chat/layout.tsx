"use client"


import { useState, useEffect } from "react"
import { SignOutButton, useUser } from "@clerk/nextjs"
import { AppSidebar } from "./sidebar"
import ChatWindow from "./chat-window"
import ChatInput from "./chat-input"
import { TokenUsage } from "./token-usage"
import { Button } from "@/components/ui/button"
import { Share, ChevronDown, Menu, User } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { v4 as uuidv4 } from 'uuid'
import { MODEL_CONFIGS, DEFAULT_MODEL } from '@/lib/trimMessages'
import { validateModelSwitch } from '@/lib/model-utils'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from '@ai-sdk/ui-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"


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


export default function ChatLayout() {
  const { user } = useUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Add local image loading state
  const [isImageLoading, setIsImageLoading] = useState(false)

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

  // Add error handling
  const [errorMessage, setErrorMessage] = useState<string | null>(null)


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
    if (typeof (formData as React.FormEvent<HTMLFormElement>).preventDefault === 'function') {
      handleTextSubmit(formData as React.FormEvent<HTMLFormElement>)
      return
    }
    const fd = formData as FormData
    const file = fd.get('files') as File | null

    if (file && file.type && file.type.startsWith('image/')) {
      const message = fd.get('message') as string
      const imageData = fd.get('imageData') as string
      const imageName = fd.get('imageName') as string
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: message || '',
        imageData: imageData || undefined,
        imageName: imageName || undefined,
      }
      setMessages(prev => [...prev, userMessage])
      setInput('')
      setIsImageLoading(true)
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          body: fd,
        })
        if (response.ok) {
          const reader = response.body?.getReader()
          if (reader) {
            let assistantMessage = ''
            let gotFirstChunk = false
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
                      role: 'assistant' as const,
                      content: assistantMessage || 'Sorry, no response was received from the AI.'
                    }
                    setMessages(prev => [...prev, assistantMsg])
                    setIsImageLoading(false)
                    return
                  }
                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.text) {
                      assistantMessage += parsed.text
                      if (!gotFirstChunk) {
                        setIsImageLoading(false)
                        gotFirstChunk = true
                      }
                    }
                  } catch {}
                }
              }
            }
            // If assistantMessage is still empty after streaming, show error
            if (!assistantMessage) {
              const errorMsg = 'Sorry, no response was received from the AI.';
              setErrorMessage(errorMsg);
              setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
            }
            setIsImageLoading(false)
          } else {
            setIsImageLoading(false)
            const errorMsg = 'Sorry, there was a problem reading the response stream.';
            setErrorMessage(errorMsg);
            setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
          }
        } else {
          setIsImageLoading(false)
          const errorMsg = 'Sorry, the server returned an error. Please try again.';
          setErrorMessage(errorMsg);
          setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
        }
      } catch (error) {
        setIsImageLoading(false)
        const errorMsg = 'Sorry, something went wrong while processing your file. Please try again.';
        setErrorMessage(errorMsg);
        setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
        console.error('Error submitting message:', error)
      }
      return
    }

    // Handle PDF files like images, but treat the response as text
    if (file && file.type === 'application/pdf') {
      const message = fd.get('message') as string
      const pdfName = file.name
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: message || (pdfName ? `Uploaded PDF: ${pdfName}` : ''),
        pdfName: pdfName || undefined,
      }
      setMessages(prev => [...prev, userMessage])
      setInput('')
      setIsImageLoading(true)
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          body: fd,
        })
        if (response.ok) {
          const reader = response.body?.getReader()
          if (reader) {
            let assistantMessage = ''
            let gotFirstChunk = false
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
                      role: 'assistant' as const,
                      content: assistantMessage || 'Sorry, no response was received from the AI.'
                    }
                    setMessages(prev => [...prev, assistantMsg])
                    setIsImageLoading(false)
                    return
                  }
                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.text) {
                      assistantMessage += parsed.text
                      if (!gotFirstChunk) {
                        setIsImageLoading(false)
                        gotFirstChunk = true
                      }
                    }
                  } catch {}
                }
              }
            }
            // If assistantMessage is still empty after streaming, show error
            if (!assistantMessage) {
              const errorMsg = 'Sorry, no response was received from the AI.';
              setErrorMessage(errorMsg);
              setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
            }
            setIsImageLoading(false)
          } else {
            setIsImageLoading(false)
            const errorMsg = 'Sorry, there was a problem reading the response stream.';
            setErrorMessage(errorMsg);
            setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
          }
        } else {
          setIsImageLoading(false)
          const errorMsg = 'Sorry, the server returned an error. Please try again.';
          setErrorMessage(errorMsg);
          setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
        }
      } catch (error) {
        setIsImageLoading(false)
        const errorMsg = 'Sorry, something went wrong while processing your file. Please try again.';
        setErrorMessage(errorMsg);
        setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
        console.error('Error submitting message:', error)
      }
      return
    }

    // For DOC/TXT or no file, use useChat's handleSubmit
    handleTextSubmit(fd as unknown as React.FormEvent<HTMLFormElement>)
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
  const handleEditMessage = async (formData: FormData) => {
    const newMessage = formData.get('message') as string;
    const editIndex = Number(formData.get('editIndex'));

    // Truncate messages up to and including the edited message
    const baseMessages = displayMessages.filter((msg) => msg.role === 'user' || msg.role === 'assistant');
    const updated = baseMessages.slice(0, editIndex);
    updated.push({
      ...baseMessages[editIndex],
      content: newMessage,
    });

    setChatMessages(updated);
    setMessages(updated);
    setEditingIndex(null);
    setInput('');
    setIsImageLoading(true);

    // POST to /api/chat as JSON
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          userId: user?.id || "guest",
          chatId: currentChatId,
          modelName: selectedModel,
          editing: true
        }),
      });
      if (response.ok) {
        const reader = response.body?.getReader();
        if (reader) {
          let assistantMessage = '';
          let gotFirstChunk = false;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  const assistantMsg = {
                    id: uuidv4(),
                    role: 'assistant' as const,
                    content: assistantMessage || 'Sorry, no response was received from the AI.',
                  };
                  setMessages(prev => [...prev, assistantMsg]);
                  setIsImageLoading(false);
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    assistantMessage += parsed.text;
                    if (!gotFirstChunk) {
                      setIsImageLoading(false);
                      gotFirstChunk = true;
                    }
                  }
                } catch {}
              }
            }
          }
          // If assistantMessage is still empty after streaming, show error
          if (!assistantMessage) {
            const errorMsg = 'Sorry, no response was received from the AI.';
            setErrorMessage(errorMsg);
            setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
          }
          setIsImageLoading(false);
        } else {
          setIsImageLoading(false);
          const errorMsg = 'Sorry, there was a problem reading the response stream.';
          setErrorMessage(errorMsg);
          setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
        }
      } else {
        setIsImageLoading(false);
        const errorMsg = 'Sorry, the server returned an error. Please try again.';
        setErrorMessage(errorMsg);
        setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
      }
    } catch (error) {
      setIsImageLoading(false);
      const errorMsg = 'Sorry, something went wrong while processing your edit. Please try again.';
      setErrorMessage(errorMsg);
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant' as const, content: errorMsg }]);
      console.error('Error submitting edit:', error);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121]">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-[260px]'} relative`}>
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
        <header className="flex h-14 items-center justify-between border-b border-[#303030] bg-[#212121] px-4">
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
              <DropdownMenuContent className="bg-[#303030] border-[#303030]">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#303030]">
                  <Share className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon!</p>
              </TooltipContent>
            </Tooltip>
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
  onEditSubmit={handleEditMessage}
  isLoading={isLoading || isImageLoading}
  input={input}
  onInputChange={handleInputChange}
  onSubmit={handleSubmit}
  editingIndex={editingIndex}
  setEditingIndex={setEditingIndex}
/>

        </div>
        {/* Token Usage Indicator */}
        <TokenUsage messages={displayMessages} selectedModel={selectedModel} />
        {displayMessages.length > 0 && editingIndex === null && (
          <div className="w-full bg-[#212121] border-t border-[#303030] sticky bottom-0 z-20">
            <div className="max-w-3xl mx-auto px-4">
              <ChatInput
                input={input}
                isLoading={isLoading || isImageLoading}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        )}
        {/* Render error message above chat window */}
        {errorMessage && (
          <div className="text-red-400 text-center py-2">{errorMessage}</div>
        )}
      </div>
    </div>
  )
}
