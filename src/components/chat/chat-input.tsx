"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Mic, ArrowUp, X } from "lucide-react"

function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
      <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
    </div>
  )
}

interface SelectedFile {
  file: File
  preview: string
  cloudUrl?: string
  uploading?: boolean
}

export default function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
}: {
  input: string
  isLoading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (formData: FormData) => void
}) {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file)
      setSelectedFile({ file, preview, uploading: true })
      // Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (data.url) {
          setSelectedFile({ file, preview, cloudUrl: data.url, uploading: false })
        } else {
          setSelectedFile({ file, preview, uploading: false })
        }
      } catch {
        setSelectedFile({ file, preview, uploading: false })
      }
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveFile = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview)
      setSelectedFile(null)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Create FormData with both text and file
    const formData = new FormData()
    formData.append('message', input)
    if (selectedFile) {
      formData.append('image', selectedFile.file)
      // Use Cloudinary URL for chat display
      if (selectedFile.cloudUrl) {
        formData.append('imageData', selectedFile.cloudUrl)
      } else {
        formData.append('imageData', selectedFile.preview)
      }
      formData.append('imageName', selectedFile.file.name)
    }
    
    // Clear selected file
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview)
      setSelectedFile(null)
    }
    
    // Call the original onSubmit with FormData
    onSubmit(formData)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const formData = new FormData()
      formData.append('message', input)
      if (selectedFile) {
        formData.append('image', selectedFile.file)
        if (selectedFile.cloudUrl) {
          formData.append('imageData', selectedFile.cloudUrl)
        } else {
          formData.append('imageData', selectedFile.preview)
        }
        formData.append('imageName', selectedFile.file.name)
      }
      if (selectedFile) {
        URL.revokeObjectURL(selectedFile.preview)
        setSelectedFile(null)
      }
      onSubmit(formData)
    }
  }

  const isUploading = selectedFile?.uploading;

  return (
    <div className="bg-[#212121] p-4">
      <div className="max-w-3xl mx-auto">
        {/* Selected Image Preview */}
        {selectedFile && (
          <div className="mb-4 relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white">Selected Image</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                onClick={handleRemoveFile}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 relative">
              <img
                src={selectedFile.cloudUrl || selectedFile.preview}
                alt="Selected"
                className="max-w-full h-auto rounded-lg max-h-32 object-contain"
              />
              {isUploading && <Loader />}
              <p className="text-sm text-gray-400 mt-2">{selectedFile.file.name}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end gap-2 bg-[#303030] rounded-3xl ">
            <div className="flex items-center pl-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isLoading}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>

            <Textarea
              value={input}
              onChange={onInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message ChatGPT or select an image for analysis"
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
                disabled={isLoading || isUploading || (!input.trim() && !selectedFile) || isUploading}
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
