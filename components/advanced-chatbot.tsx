"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Paperclip,
  Mic,
  Square,
  Download,
  Trash2,
  RefreshCw,
  MessageSquare,
  Clock,
  User,
  Bot,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Message {
  id: string
  content: string
  displayedContent: string
  role: "user" | "assistant"
  timestamp: Date
  isStreaming: boolean
  isComplete: boolean
  reactions?: { type: "like" | "dislike"; count: number }[]
  attachments?: File[]
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastActivity: Date
  unreadCount: number
}

export default function AdvancedChatbot() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "default",
      title: "New Conversation",
      messages: [],
      lastActivity: new Date(),
      unreadCount: 0,
    },
  ])
  const [activeConversationId, setActiveConversationId] = useState("default")
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const messages = activeConversation?.messages || []

  const sendMessage = useCallback(
    async (messageText: string, files?: File[]) => {
      if (!messageText.trim() && !files?.length) return

      const userMessageId = Date.now().toString()
      const assistantMessageId = (Date.now() + 1).toString()

      const userMessage: Message = {
        id: userMessageId,
        content: messageText,
        displayedContent: messageText,
        role: "user",
        timestamp: new Date(),
        isStreaming: false,
        isComplete: true,
        attachments: files,
      }

      const assistantMessage: Message = {
        id: assistantMessageId,
        content: "",
        displayedContent: "",
        role: "assistant",
        timestamp: new Date(),
        isStreaming: true,
        isComplete: false,
      }

      // Update conversation with new messages
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: [...conv.messages, userMessage, assistantMessage],
                lastActivity: new Date(),
              }
            : conv,
        ),
      )

      setIsLoading(true)
      setInput("")

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: messageText,
            collection_name: "39",
            ...(sessionId && { session_id: sessionId }),
          }),
        })

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        let buffer = ""
        let currentContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += new TextDecoder().decode(value)
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const data = JSON.parse(line)
              console.log("[v0] Processing streaming data:", data)

              if (data.token) {
                currentContent += data.token
                console.log("[v0] Current content length:", currentContent.length)
                setConversations((prev) =>
                  prev.map((conv) =>
                    conv.id === activeConversationId
                      ? {
                          ...conv,
                          messages: conv.messages.map((msg) =>
                            msg.id === assistantMessageId
                              ? {
                                  ...msg,
                                  content: currentContent,
                                  displayedContent: currentContent,
                                  isStreaming: true,
                                  isComplete: false,
                                }
                              : msg,
                          ),
                        }
                      : conv,
                  ),
                )
              } else if (data.answer) {
                console.log("[v0] Received direct answer:", data.answer.substring(0, 100) + "...")
                // Handle direct answer
                setConversations((prev) =>
                  prev.map((conv) =>
                    conv.id === activeConversationId
                      ? {
                          ...conv,
                          messages: conv.messages.map((msg) =>
                            msg.id === assistantMessageId
                              ? {
                                  ...msg,
                                  content: data.answer,
                                  displayedContent: data.answer,
                                  isComplete: true,
                                  isStreaming: false,
                                }
                              : msg,
                          ),
                        }
                      : conv,
                  ),
                )
              } else if (data.final) {
                console.log("[v0] Received final response:", data.final)
                if (data.final.session_id) {
                  console.log("[v0] Captured session_id from final:", data.final.session_id)
                  setSessionId(data.final.session_id)
                }
                // Don't overwrite streamed content with final answer
              } else if (data.session_id) {
                console.log("[v0] Captured session_id:", data.session_id)
                setSessionId(data.session_id)
              } else if (data.status === "complete") {
                console.log("[v0] Stream completed, final content length:", currentContent.length)
                setConversations((prev) =>
                  prev.map((conv) =>
                    conv.id === activeConversationId
                      ? {
                          ...conv,
                          messages: conv.messages.map((msg) =>
                            msg.id === assistantMessageId ? { ...msg, isComplete: true, isStreaming: false } : msg,
                          ),
                        }
                      : conv,
                  ),
                )
              }
            } catch (e) {
              console.error("[v0] Error parsing JSON:", e, "Line:", line)
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error sending message:", error)
        // Update message with error state
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: "Sorry, I encountered an error. Please try again.",
                          displayedContent: "Sorry, I encountered an error. Please try again.",
                          isComplete: true,
                          isStreaming: false,
                        }
                      : msg,
                  ),
                }
              : conv,
          ),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [activeConversationId, sessionId],
  )

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  const reactToMessage = useCallback(
    (messageId: string, reaction: "like" | "dislike") => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId
                    ? {
                        ...msg,
                        reactions: [{ type: reaction, count: 1 }],
                      }
                    : msg,
                ),
              }
            : conv,
        ),
      )
    },
    [activeConversationId],
  )

  const deleteMessage = useCallback(
    (messageId: string) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: conv.messages.filter((msg) => msg.id !== messageId),
              }
            : conv,
        ),
      )
    },
    [activeConversationId],
  )

  const handleFileUpload = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files)
      if (input.trim() || fileArray.length > 0) {
        sendMessage(input, fileArray)
      }
    },
    [input, sendMessage],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileUpload(files)
      }
    },
    [handleFileUpload],
  )

  const createNewConversation = useCallback(() => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New Conversation",
      messages: [],
      lastActivity: new Date(),
      unreadCount: 0,
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setSessionId(null)
  }, [])

  const exportConversation = useCallback(() => {
    if (!activeConversation) return

    const exportData = {
      title: activeConversation.title,
      messages: activeConversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
      exportedAt: new Date(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conversation-${activeConversation.title.replace(/\s+/g, "-")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeConversation])

  const clearConversation = useCallback(() => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === activeConversationId ? { ...conv, messages: [] } : conv)),
    )
    setSessionId(null)
  }, [activeConversationId])

  const renderMarkdown = (content: string) => {
    if (!content || content.trim() === "") {
      return ""
    }

    console.log("[v0] Rendering markdown for content length:", content.length)

    let html = content
      // Escape HTML entities first
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/^#### (.*$)/gim, '<h4 class="text-lg mt-4 mb-2 text-card-foreground">$1</h4>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl mt-6 mb-3 text-card-foreground">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl mt-8 mb-4 text-card-foreground">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl mt-8 mb-4 text-card-foreground">$1</h1>')
      // Bold text - only match actual **text** patterns
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Bullet points (must be at start of line)
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      // Convert double line breaks to paragraph breaks
      .replace(/\n\n/g, '</p><p class="mb-4 text-card-foreground">')
      // Convert single line breaks to <br>
      .replace(/\n/g, "<br />")

    // Wrap consecutive bullet points in ul tags
    html = html.replace(/((<li class="ml-4 mb-1">.*?<\/li>\s*)+)/g, '<ul class="list-disc ml-6 mb-4 space-y-1">$1</ul>')

    // Wrap content in appropriate container
    if (
      !html.includes("<h1") &&
      !html.includes("<h2") &&
      !html.includes("<h3") &&
      !html.includes("<h4") &&
      !html.includes("<ul")
    ) {
      html = `<p class="mb-4 text-card-foreground">${html}</p>`
    } else {
      html = `<div class="text-card-foreground">${html}</div>`
    }

    return html
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        <div
          className={`${sidebarOpen ? "w-80" : "w-0"} transition-all duration-300 overflow-hidden border-r border-border bg-sidebar`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sidebar-foreground">Conversations</h2>
              <Button size="sm" onClick={createNewConversation} className="h-8 w-8 p-0">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              {conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={`p-3 mb-2 cursor-pointer transition-colors ${
                    conv.id === activeConversationId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                  }`}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-sidebar-foreground truncate">{conv.title}</p>
                      <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {conv.lastActivity.toLocaleTimeString()}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </ScrollArea>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-8 w-8 p-0">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="font-semibold text-card-foreground">{activeConversation?.title || "Chat"}</h1>
                  <p className="text-sm text-muted-foreground">{isLoading ? "AI is thinking..." : "Ready to help"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={exportConversation}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export conversation</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={clearConversation}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear conversation</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-bubble group flex gap-3 message-enter ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div className={`flex-1 max-w-[80%] ${message.role === "user" ? "text-right" : "text-left"}`}>
                    {/* Message Content */}
                    <Card
                      className={`p-4 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-card text-card-foreground"
                      }`}
                    >
                      <div className="prose prose-sm max-w-none">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(message.displayedContent),
                          }}
                          className="markdown-content"
                        />
                        {message.isStreaming && (
                          <span className="streaming-cursor ml-1 text-primary animate-pulse">|</span>
                        )}
                      </div>

                      {/* File attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((file, index) => (
                            <Badge key={index} variant="secondary" className="mr-1">
                              <Paperclip className="h-3 w-3 mr-1" />
                              {file.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Message Actions */}
                    <div
                      className={`message-actions flex items-center gap-1 mt-2 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span className="text-xs text-muted-foreground">{message.timestamp.toLocaleTimeString()}</span>

                      {message.role === "assistant" && (
                        <>
                          <Separator orientation="vertical" className="h-4 mx-2" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 action-button"
                                onClick={() => copyMessage(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy message</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 action-button"
                                onClick={() => reactToMessage(message.id, "like")}
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Like message</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 action-button"
                                onClick={() => reactToMessage(message.id, "dislike")}
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Dislike message</TooltipContent>
                          </Tooltip>
                        </>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 action-button">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => deleteMessage(message.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {message.reactions.map((reaction, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {reaction.type === "like" ? "👍" : "👎"} {reaction.count}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div
            className={`border-t border-border bg-card p-4 file-drop-zone ${dragOver ? "drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={dragOver ? "Drop files here..." : "Type your message..."}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(input)
                      }
                    }}
                    disabled={isLoading}
                    className="min-h-[44px] resize-none"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach files</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsRecording(!isRecording)}
                        disabled={isLoading}
                        className={isRecording ? "text-destructive" : ""}
                      >
                        {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRecording ? "Stop recording" : "Voice input"}</TooltipContent>
                  </Tooltip>

                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    size="sm"
                    className="typing-indicator"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {dragOver && (
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  Drop files to attach them to your message
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
