"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sparkles, MessageSquare, FileText, Mic, Download, Settings } from "lucide-react"

export default function ChatDemo() {
  const [showFeatures, setShowFeatures] = useState(false)

  const features = [
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Multi-Conversation Management",
      description: "Create, switch between, and organize multiple chat conversations with ease.",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "File Upload & Attachments",
      description: "Drag and drop files or click to attach documents, images, and more to your messages.",
    },
    {
      icon: <Mic className="h-5 w-5" />,
      title: "Voice Input Support",
      description: "Record voice messages and get audio responses for hands-free interaction.",
    },
    {
      icon: <Download className="h-5 w-5" />,
      title: "Export Conversations",
      description: "Download your chat history as JSON files for backup or sharing.",
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "Message Actions",
      description: "Copy, react to, and manage individual messages with contextual actions.",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Real-time Streaming",
      description: "Watch responses appear word-by-word with smooth typewriter animations.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Advanced AI Chat System
          </Badge>

          <h1 className="text-4xl font-bold text-foreground mb-4">Next-Generation Chat Interface</h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience a sophisticated conversational AI with modern features, beautiful design, and seamless user
            experience.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-lg px-8 py-6" onClick={() => window.location.reload()}>
            <MessageSquare className="h-5 w-5 mr-2" />
            Start Chatting
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="text-lg px-8 py-6 bg-transparent"
            onClick={() => setShowFeatures(!showFeatures)}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            View Features
          </Button>
        </div>

        {showFeatures && (
          <div className="mt-12 animate-in slide-in-from-bottom-4 duration-500">
            <Separator className="mb-8" />

            <h2 className="text-2xl font-semibold mb-8">Advanced Features</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 text-left hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 p-6 bg-card rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Quick Start Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">1</Badge>
              <span>Type your message in the input field</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">2</Badge>
              <span>Use the sidebar to manage conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">3</Badge>
              <span>Try drag & drop for file uploads</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
