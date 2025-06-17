"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Sidebar() {
  return (
    <div className="w-[260px] bg-muted border-r h-full hidden md:flex flex-col">
      <div className="p-4 border-b">
        <Button className="w-full">+ New Chat</Button>
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        {/* List of previous chats */}
        <div className="text-sm text-muted-foreground">No conversations yet</div>
      </ScrollArea>
    </div>
  );
}
