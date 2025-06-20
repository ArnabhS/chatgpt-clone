"use client"


import { useState, useEffect, useRef } from "react"
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
  console.log(user?.id)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const sidebarRefreshRef = useRef<null | (() => Promise<void>)>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const displayMessages: Message[] = messages;

  const handleSubmit = async (formData: FormData | React.FormEvent<HTMLFormElement>) => {
    let fd: FormData;
    if (typeof (formData as React.FormEvent<HTMLFormElement>).preventDefault === 'function') {
      (formData as React.FormEvent<HTMLFormElement>).preventDefault();
      fd = new FormData();
      fd.append('message', input);
      fd.append('userId', user?.id || 'guest');
    } else {
      fd = formData as FormData;
      if (!fd.has('userId')) {
        fd.append('userId', user?.id || 'guest');
      }
    }
    const file = fd.get('files') as File | null;
    let userMessage: Message;
    if (file && file.type && file.type.startsWith('image/')) {
      const message = fd.get('message') as string;
      const imageData = fd.get('imageData') as string;
      const imageName = fd.get('imageName') as string;
      userMessage = {
        id: uuidv4(),
        role: 'user',

        content: `[Image Uploaded: ${imageName}] ${message || ''}`.trim(),
        imageData: imageData || undefined,
        imageName: imageName || undefined,
      };
    } else if (file && file.type === 'application/pdf') {
      const message = fd.get('message') as string;
      const pdfName = file.name;
      userMessage = {
        id: uuidv4(),
        role: 'user',
        content: message || (pdfName ? `Uploaded PDF: ${pdfName}` : ''),
        pdfName: pdfName || undefined,
      };
    } else {
      const message = fd.get('message') as string || input;
      userMessage = {
        id: uuidv4(),
        role: 'user',
        content: message,
      };
    }
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: fd,
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
                  setMessages(prev => [...prev, {
                    id: uuidv4(),
                    role: 'assistant',
                    content: assistantMessage || 'Sorry, no response was received from the AI.'
                  }]);
                  setIsLoading(false);
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    assistantMessage += parsed.text;
                    if (!gotFirstChunk) {
                      gotFirstChunk = true;
                    }
                  }
                } catch {}
              }
            }
          }
          if (!assistantMessage) {
            const errorMsg = 'Sorry, no response was received from the AI.';
            setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: errorMsg }]);
          }
        } else {
          const errorMsg = 'Sorry, there was a problem reading the response stream.';
          setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: errorMsg }]);
        }
      } else {
        const errorMsg = 'Sorry, the server returned an error. Please try again.';
        setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: errorMsg }]);
      }
    } catch (error) {
      const errorMsg = 'Sorry, something went wrong while processing your message. Please try again.';
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: errorMsg }]);
      console.error('Error submitting message:', error);
    }
    setIsLoading(false);
  };


  const startNewChat = () => {
    const newChatId = uuidv4()
    setCurrentChatId(newChatId)
    setMessages([])
    // Refresh sidebar if possible
    if (sidebarRefreshRef.current) {
      sidebarRefreshRef.current();
    }
  }



  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          userId: user?.id || 'guest',
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


  
  useEffect(() => {
    if (!currentChatId) {
      startNewChat()
    }
  }, [currentChatId])


  
  const handleModelSwitch = (newModel: string) => {
    if ((messages.length === 0)) {
      setSelectedModel(newModel);
      return;
    }
    const validation = validateModelSwitch(messages, newModel);
    if (validation.canSwitch) {
      setSelectedModel(newModel);
    } else {
      console.warn('Cannot switch model:', validation.reason);
      alert(`Cannot switch to ${MODEL_CONFIGS[newModel]?.name}: ${validation.reason}`);
    }
  };



  const handleEditMessage = async (formData: FormData) => {
    const newMessage = formData.get('message') as string;
    const editIndex = Number(formData.get('editIndex'));

    // Prepare the updated messages array
    const baseMessages = displayMessages.filter((msg) => msg.role === 'user' || msg.role === 'assistant');
    const updated = baseMessages.slice(0, editIndex);
    updated.push({
      ...baseMessages[editIndex],
      content: newMessage,
    });

    setMessages(updated);
    setEditingIndex(null);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          userId: user?.id || 'guest',
          chatId: currentChatId,
          modelName: selectedModel,
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
                  setMessages([...updated, {
                    id: uuidv4(),
                    role: 'assistant',
                    content: assistantMessage || 'Sorry, no response was received from the AI.'
                  }]);
                  setIsLoading(false);
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    assistantMessage += parsed.text;
                    if (!gotFirstChunk) {
                      gotFirstChunk = true;
                    }
                  }
                } catch {}
              }
            }
          }
          if (!assistantMessage) {
            const errorMsg = 'Sorry, no response was received from the AI.';
            setMessages([...updated, { id: uuidv4(), role: 'assistant', content: errorMsg }]);
          }
        } else {
          const errorMsg = 'Sorry, there was a problem reading the response stream.';
          setMessages([...updated, { id: uuidv4(), role: 'assistant', content: errorMsg }]);
        }
      } else {
        const errorMsg = 'Sorry, the server returned an error. Please try again.';
        setMessages([...updated, { id: uuidv4(), role: 'assistant', content: errorMsg }]);
      }
    } catch (error) {
      const errorMsg = 'Sorry, something went wrong while processing your edit. Please try again.';
      setMessages([...updated, { id: uuidv4(), role: 'assistant', content: errorMsg }]);
      console.error('Error submitting edit:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-[#212121]">
     
      <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-[260px]'} relative`}>
        <AppSidebar 
          onNewChat={startNewChat}
          onLoadChat={loadChat}
          currentChatId={currentChatId}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          refreshSidebar={(fn) => { sidebarRefreshRef.current = fn; }}
        />
      
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
     
      <div className="md:hidden">
        <AppSidebar
          isSheet
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onNewChat={startNewChat}
          onLoadChat={loadChat}
          currentChatId={currentChatId}
          refreshSidebar={(fn) => { sidebarRefreshRef.current = fn; }}
        />
      </div>
     
      <div className="flex flex-col flex-1 relative bg-[#212121]">
       
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
  editingIndex={editingIndex}
  setEditingIndex={setEditingIndex}
  isLoading={isLoading}
  input={input}
  onInputChange={handleInputChange}
  onSubmit={handleSubmit}
  onEditSubmit={handleEditMessage}
/>

        </div>
        {/* Token Usage Indicator */}
        <TokenUsage messages={displayMessages} selectedModel={selectedModel} />
        {displayMessages.length > 0 && editingIndex === null && (
          <div className="w-full bg-[#212121] border-t border-[#303030] sticky bottom-0 z-20">
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
