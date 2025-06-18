"use client"

import type React from "react"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Mic, ArrowUp } from "lucide-react"

export default function ChatInput({
  input,
  setInput,
  isLoading,
  onInputChange,
  onSubmit,
}: {
  input: string
  setInput: (val: string) => void
  isLoading: boolean
  onInputChange: (e: any) => void
  onSubmit: (e: any) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    const { url } = await res.json()
    setInput((prev) => `${prev}\n${url}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <div className="bg-[#212121] p-4">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={onSubmit} className="relative">
          <div className="relative flex items-end gap-2 bg-[#303030] rounded-3xl ">
            <div className="flex items-center pl-4">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUpload}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>

            <Textarea
              value={input}
              onChange={onInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message ChatGPT"
              className="flex-1 bg-transparent border-0 text-white placeholder-gray-400 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[24px] max-h-32 py-3"
              rows={1}
            />

            <div className="flex items-center gap-2 pr-2 pb-2">
            <Button
  type="button"
  size="sm"
  variant="ghost"
  className="text-gray-400 hover:text-white hover:bg-gray-700 p-1"
>
  <Mic className="w-5 h-5" />
</Button>

              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !input.trim()}
                className="bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 p-2 rounded-full"
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </form>

        <div className="text-center mt-2">
          <p className="text-xs text-gray-400">
            ChatGPT can make mistakes. Check important info.{" "}
            <button className="underline hover:text-gray-300">See Cookie Preferences</button>
          </p>
        </div>
      </div>
    </div>
  )
}
