import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { NextRequest, NextResponse } from 'next/server'

interface RequestBody {
  userMessage: string
}

interface DetectionResult {
  subject: string
  concept: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { userMessage } = body

    if (!userMessage) {
      return NextResponse.json(
        { error: 'userMessage is required' },
        { status: 400 }
      )
    }

    // Call Anthropic API to extract subject and concept
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: `You are an expert at extracting educational subjects and concepts from user messages.

Your task:
1. Analyze the user's message to identify if they are asking about studying a specific concept or subject
2. Extract the subject (e.g., "mathematics", "biology", "history") and concept (e.g., "quadratic equations", "photosynthesis", "French Revolution")
3. Return ONLY a valid JSON object with exactly these two fields: subject and concept
4. If the message is not about studying a concept, return {"subject": "", "concept": ""}
5. Keep subject and concept brief and standardized (lowercase, no special characters)

Return only the JSON object, nothing else.`,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    // Parse the JSON response
    let result: DetectionResult
    try {
      result = JSON.parse(text.trim())
    } catch {
      // If parsing fails, return empty values
      result = { subject: '', concept: '' }
    }

    // Ensure the result has the expected structure
    if (!result.subject) result.subject = ''
    if (!result.concept) result.concept = ''

    return NextResponse.json(result)
  } catch (error) {
    console.error('Detect concept API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
