"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Loader2 } from "lucide-react"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  isComplete?: boolean
  isStreaming?: boolean
  displayedContent?: string
}

export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.isStreaming && msg.role === "assistant" && msg.content) {
            const currentDisplayed = msg.displayedContent || ""
            if (currentDisplayed.length < msg.content.length) {
              return {
                ...msg,
                displayedContent: msg.content.slice(0, currentDisplayed.length + 1),
              }
            }
          }
          return msg
        }),
      )
    }, 30) // Adjust speed here - lower = faster typing

    return () => clearInterval(interval)
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isComplete: false,
      isStreaming: false,
      displayedContent: "",
    }

    setMessages((prev) => [...prev, assistantMessage])

    try {
      console.log("[v0] Sending message:", userMessage.content)

      const payload: any = {
        question: userMessage.content,
        collection_name: "39",
      }

      if (sessionId) {
        payload.session_id = sessionId
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] API error response:", errorText)
        throw new Error(`API request failed with status ${response.status}: ${errorText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line.trim())
                console.log("[v0] Received timeline data:", data)

                if (data.session_id && !sessionId) {
                  console.log("[v0] Captured session_id:", data.session_id)
                  setSessionId(data.session_id)
                }

                if (data.token) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            content: msg.content + data.token,
                            isStreaming: true,
                            displayedContent: msg.displayedContent || "",
                          }
                        : msg,
                    ),
                  )
                } else if (data.final && data.final.answer) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            isComplete: true,
                            isStreaming: false,
                            displayedContent: data.final.answer,
                            content: data.final.answer,
                          }
                        : msg,
                    ),
                  )
                } else if (data.answer) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            content: data.answer,
                            isComplete: true,
                            isStreaming: false,
                            displayedContent: data.answer,
                          }
                        : msg,
                    ),
                  )
                } else if (data.status === "complete") {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            isComplete: true,
                            isStreaming: false,
                            displayedContent: msg.content,
                          }
                        : msg,
                    ),
                  )
                } else if (data.status === "processing") {
                  console.log("[v0] Processing status received")
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: true } : msg)),
                  )
                }
              } catch (e) {
                console.error("[v0] Failed to parse JSON line:", line, "Error:", e)
              }
            }
          }
        }

        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim())
            console.log("[v0] Final buffer data:", data)
          } catch (e) {
            console.error("[v0] Failed to parse final buffer:", buffer)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
                isComplete: true,
                isStreaming: false,
                displayedContent: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
              }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card p-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">AI Assistant</h1>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Streaming response...</span>
            </div>
          )}
          {sessionId && <div className="text-xs text-muted-foreground">Session: {sessionId.slice(0, 8)}...</div>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with the AI assistant</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {message.isStreaming ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                )}

                <Card
                  className={`max-w-[80%] p-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <p className={`text-sm whitespace-pre-wrap flex-1 ${message.isStreaming ? "streaming-text" : ""}`}>
                      {message.role === "assistant" ? message.displayedContent || message.content : message.content}
                      {message.isStreaming && message.content && (
                        <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse opacity-75">|</span>
                      )}
                    </p>
                  </div>
                  {message.content === "" && message.role === "assistant" && (message.isStreaming || isLoading) && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span className="text-xs ml-2 opacity-70">AI is thinking...</span>
                    </div>
                  )}
                </Card>

                {message.role === "user" && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t bg-card p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
