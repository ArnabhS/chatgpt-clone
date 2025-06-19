"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Mic, ArrowUp, X, FileText, Image as ImageIcon, FileAudio } from "lucide-react"
import { Loader } from "../ui/Loader"


interface SelectedFile {
  file: File
  preview?: string // for images
  cloudUrl?: string // for images
  uploading?: boolean
  type: 'image' | 'pdf' | 'txt' | 'audio' | 'other'
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
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  // Helper to get file type
  const getFileType = (file: File): SelectedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type === 'text/plain') return 'txt'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'other'
  }

  // Helper to get icon
  const getFileIcon = (type: SelectedFile['type']) => {
    if (type === 'image') return <ImageIcon className="w-5 h-5 text-blue-400" />
    if (type === 'pdf') return <FileText className="w-5 h-5 text-red-400" />
    if (type === 'txt') return <FileText className="w-5 h-5 text-gray-400" />
    if (type === 'audio') return <FileAudio className="w-5 h-5 text-green-400" />
    return <FileText className="w-5 h-5 text-gray-400" />
  }

  // Handle file selection (images, pdf, txt, audio)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      const type = getFileType(file)
      let preview: string | undefined = undefined
      let uploading = false
      if (type === 'image') {
        preview = URL.createObjectURL(file)
        uploading = true
        setSelectedFiles(prev => [...prev, { file, preview, uploading, type }])
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
            setSelectedFiles(prev => prev.map(f => f.file === file ? { ...f, cloudUrl: data.url, uploading: false } : f))
          } else {
            setSelectedFiles(prev => prev.map(f => f.file === file ? { ...f, uploading: false } : f))
          }
        } catch {
          setSelectedFiles(prev => prev.map(f => f.file === file ? { ...f, uploading: false } : f))
        }
      } else {
        setSelectedFiles(prev => [...prev, { file, type }])
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (audioInputRef.current) audioInputRef.current.value = ""
  }

  // Remove file
  const handleRemoveFile = (file: File) => {
    setSelectedFiles(prev => prev.filter(f => f.file !== file))
    if (file.type.startsWith('image/')) URL.revokeObjectURL(URL.createObjectURL(file))
  }

  // Submit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('message', input)
    for (const f of selectedFiles) {
      formData.append('files', f.file)
      if (f.type === 'image') {
        formData.append('imageData', f.cloudUrl || f.preview || '')
        formData.append('imageName', f.file.name)
      }
    }
    setSelectedFiles([])
    onSubmit(formData)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

  const isUploading = selectedFiles.some(f => f.uploading)

  return (
    <div className="w-full px-2 pb-2">
      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedFiles.map((f, i) => (
            <div key={i} className="relative flex items-center bg-[#232323] rounded-lg px-3 py-2 gap-2 min-w-[120px] max-w-[220px]">
              {getFileIcon(f.type)}
              {f.type === 'image' && (
                <img src={f.cloudUrl || f.preview} alt={f.file.name} className="w-10 h-10 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs text-white">{f.file.name}</p>
              </div>
              {f.uploading && <Loader />}
              <Button type="button" size="icon" variant="ghost" className="text-gray-400 hover:text-red-400 ml-1" onClick={() => handleRemoveFile(f.file)} disabled={f.uploading}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-[#232323] rounded-2xl px-6 py-4 w-full border border-[#333] focus-within:border-[#444]">
          {/* Attachments/Tools */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-gray-400  mr-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,text/plain,audio/*"
            className="hidden"
            multiple
            onChange={handleFileSelect}
            disabled={isLoading || isUploading}
          />
          {/* Textarea */}
          <Textarea
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            className="flex-1 bg-transparent border-0 text-white placeholder-gray-400 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[24px] max-h-32 py-1 px-0"
            rows={1}
            style={{ boxShadow: 'none' }}
          />
          {/* Mic */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-gray-400  ml-2"
            onClick={() => audioInputRef.current?.click()}
            disabled={isLoading || isUploading}
          >
            <Mic className="w-5 h-5" />
          </Button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isLoading || isUploading}
          />
          {/* Send */}
          <Button
            type="submit"
            size="icon"
            className="ml-2 bg-[#393939] text-white hover:bg-[#444] disabled:bg-[#222] disabled:text-gray-500 rounded-full"
            disabled={isLoading || isUploading || (!input.trim() && selectedFiles.length === 0)}
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </div>
      </form>
      <div className="text-center mt-2">
        <p className="text-xs text-gray-400">
          ChatGPT can make mistakes. Check important info. <button className="underline hover:text-gray-300">See Cookie Preferences</button>
        </p>
      </div>
    </div>
  )
}
