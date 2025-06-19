"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  PenSquare, Search, Library, Sparkles, Zap,
  Crown, X
} from "lucide-react";
import { useUser } from "@clerk/nextjs"
import Image from "next/image";

interface ChatItem {
  _id: string;
  title: string;
  latestMessage: string;
  createdAt: string;
  updatedAt: string;
}

interface AppSidebarProps {
  isSheet?: boolean;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  onNewChat?: () => void;
  onLoadChat?: (chatId: string) => void;
  currentChatId?: string | null;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export function AppSidebar({ 
  isSheet = false, 
  sidebarOpen = false, 
  setSidebarOpen,
  onNewChat,
  onLoadChat,
  currentChatId,
  isCollapsed = false,
  setIsCollapsed
}: AppSidebarProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const userId = user?.id; 

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`/api/chat/history?userId=${userId}`);
        const data = await res.json();
        setChatHistory(data.chats || []);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChats();
  }, [userId]);

  const filteredChats = chatHistory.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Collapsed sidebar: minimal vertical bar with only the logo at top
  if (isCollapsed && setIsCollapsed) {
    return (
      <div className="relative h-screen w-10 bg-[#171717] border-r border-[#303030] flex flex-col items-center pt-2">
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
          <Image src={'/chatgpt.png'} width={100} height={100} alt="logo"/>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-screen bg-[#171717] border-r border-[#303030] relative overflow-hidden">
      {/* Top row: Logo only */}
      <div className="absolute top-2 left-3 z-20 flex items-center">
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
          <Image src={'/chatgpt.png'} width={100} height={100} alt="logo"/>
        </div>
      </div>
      {/* Main scrollable content below the fixed top row */}
      <div className="flex-1 pt-14 overflow-y-auto">
        <div className="p-3 border-b border-[#303030]">
          <div className="flex items-center justify-between mb-3">
            
            {isSheet && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-[#303030]"
                onClick={() => setSidebarOpen?.(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button 
            className="w-full bg-transparent border border-gray-600 text-white hover:bg-[#303030] justify-start gap-2"
            onClick={onNewChat}
          >
            <PenSquare className="w-4 h-4" />
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="p-3">
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

            <div className="space-y-1 mb-6">
              <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-[#303030] hover:text-white">
                <Library className="w-4 h-4 mr-3" />
                Library
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-[#303030] hover:text-white">
                <Sparkles className="w-4 h-4 mr-3" />
                Sora
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-[#303030] hover:text-white">
                <Zap className="w-4 h-4 mr-3" />
                GPTs
              </Button>
            </div>

            <div>
              <h3 className="text-gray-400 text-xs font-medium mb-2 px-2">Chats</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {filteredChats.map((chat) => (
                    <Button
                      key={chat._id}
                      variant="ghost"
                      className={`w-full justify-start text-gray-300 hover:bg-[#303030] hover:text-white text-sm py-2 px-3 h-auto ${
                        currentChatId === chat._id ? 'bg-[#303030] text-white' : ''
                      }`}
                      onClick={() => onLoadChat?.(chat._id)}
                    >
                     
                      <span className="truncate text-left">{chat.title}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-[#303030] space-y-1">
          <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-[#303030] hover:text-white">
            <Crown className="w-4 h-4 mr-3" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">Upgrade plan</span>
              <span className="text-xs text-gray-400">More access to the best models</span>
            </div>
          </Button>
          
        </div>
      </div>
    </div>
  );

  if (isSheet) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[260px] bg-[#171717] border-[#303030]">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="w-[260px]">
      <SidebarContent />
    </div>
  );
}
