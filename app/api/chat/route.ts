import { type NextRequest, NextResponse } from "next/server"

const API_URL = "https://fsl.trylenoxinstruments.com/api/query/conversational"
const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNjYiLCJkaSI6MywiaWF0IjoxNzU2NDc5OTkyLCJleHAiOjE3NTY1NjYzOTIsImN0YSI6MzQ2fQ.qvMMI6d3IzgUWYciMHkYf1AphI0EGvJ2IdcHVkzOJdc"

export async function POST(request: NextRequest) {
  try {
    const { question, collection_name, session_id } = await request.json()

    const payload: any = {
      question,
      collection_name,
      ...(session_id && { session_id }),
    }

    console.log("[v0] Sending request to API:", payload)

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BEARER_TOKEN}`,
      },
      body: JSON.stringify(payload),
    })

    console.log("[v0] API response status:", response.status)
    console.log("[v0] API response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] API error response:", errorText)
      throw new Error(`API responded with status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error("No response body received from API")
    }

    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        async function pump(): Promise<void> {
          try {
            const { done, value } = await reader.read()

            if (done) {
              // Process any remaining buffer content
              if (buffer.trim()) {
                try {
                  const data = JSON.parse(buffer.trim())
                  controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + "\n"))
                } catch (e) {
                  console.log("[v0] Failed to parse final buffer:", buffer)
                }
              }
              controller.close()
              return
            }

            // Decode the chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            // Process complete JSON objects
            const lines = buffer.split("\n")
            buffer = lines.pop() || "" // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                try {
                  let jsonString = line.trim()
                  if (jsonString.startsWith("data: ")) {
                    jsonString = jsonString.substring(6) // Remove "data: " prefix
                  }

                  if (jsonString) {
                    const data = JSON.parse(jsonString)
                    console.log("[v0] Parsed timeline data:", data)
                    controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + "\n"))
                  }
                } catch (e) {
                  console.log("[v0] Failed to parse line:", line)
                }
              }
            }

            return pump()
          } catch (error) {
            console.error("[v0] Error in pump function:", error)
            controller.error(error)
          }
        }

        return pump().catch((error) => {
          console.error("[v0] Error starting stream:", error)
          controller.error(error)
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
