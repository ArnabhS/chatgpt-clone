"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { PenSquare, Search, Library, Sparkles, Zap, Crown, MessageSquare, Settings, User, X } from "lucide-react"

// Mock chat history data
const chatHistory = [
  "ChatGPT Clone Implementation",
  "Models for Subscription Tasks",
  "Move Row Menu Left",
  "Inline Edit Save Popup",
  "Todo list enhancements",
  "Todo and Chat Toggle",
  "React error debugging",
  "DialogTitle Accessibility Fix",
  "Slash menu removal",
  "List Item Conversion Issue",
  "Extract interview questions",
]

interface AppSidebarProps {
  isSheet?: boolean
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

export function AppSidebar({ isSheet = false, sidebarOpen = false, setSidebarOpen }: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredChats = chatHistory.filter((chat) => chat.toLowerCase().includes(searchQuery.toLowerCase()))

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#171717] border-r border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          {isSheet && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={() => setSidebarOpen?.(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button className="w-full bg-transparent border border-gray-600 text-white hover:bg-gray-700 justify-start gap-2">
          <PenSquare className="w-4 h-4" />
          New chat
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="p-3">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search chats"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
              />
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1 mb-6">
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
              <Library className="w-4 h-4 mr-3" />
              Library
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
              <Sparkles className="w-4 h-4 mr-3" />
              Sora
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
              <Zap className="w-4 h-4 mr-3" />
              GPTs
            </Button>
          </div>

          {/* Chat History */}
          <div>
            <h3 className="text-gray-400 text-xs font-medium mb-2 px-2">Chats</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredChats.map((chat, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white text-sm py-2 px-3 h-auto"
                  >
                    <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span className="truncate text-left">{chat}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 space-y-1">
        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
          <Crown className="w-4 h-4 mr-3" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">Upgrade plan</span>
            <span className="text-xs text-gray-400">More access to the best models</span>
          </div>
        </Button>
        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
          <User className="w-4 h-4 mr-3" />
          Profile
        </Button>
        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Button>
      </div>
    </div>
  )

  if (isSheet) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[260px] bg-[#171717] border-gray-700">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="w-[260px]">
      <SidebarContent />
    </div>
  )
}
