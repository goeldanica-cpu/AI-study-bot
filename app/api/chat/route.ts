import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

interface ConceptRow {
  mastery_level: 'Introduced' | 'Developing' | 'Proficient' | 'Strong'
  weak_areas: string[] | null
  strong_areas: string[] | null
}

interface RequestBody {
  userMessage: string
  subject?: string
  concept?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { userMessage, subject, concept } = body

    if (!userMessage) {
      return NextResponse.json(
        { error: 'userMessage is required' },
        { status: 400 }
      )
    }

    let systemPrompt = ''

    // Query Supabase if subject and concept are provided
    if (subject && concept) {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('concepts')
        .select('mastery_level, weak_areas, strong_areas')
        .eq('subject', subject)
        .eq('concept', concept)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is the "not found" error code
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: 'Failed to query database' },
          { status: 500 }
        )
      }

      const row = data as ConceptRow | null

      if (!row) {
        // Mode A: No row found
        systemPrompt = buildModeAPrompt()
      } else if (row.mastery_level === 'Introduced' || row.mastery_level === 'Developing') {
        // Mode B: Reference prior knowledge
        systemPrompt = buildModeBPrompt(row.weak_areas, row.strong_areas)
      } else if (row.mastery_level === 'Proficient' || row.mastery_level === 'Strong') {
        // Mode C: Technical focus
        systemPrompt = buildModeCPrompt(row.weak_areas, row.strong_areas)
      }
    } else {
      // Default to Mode A if no subject/concept provided
      systemPrompt = buildModeAPrompt()
    }

    // Stream response using AI SDK
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    // Return streaming HTTP response using the SDK helper
    return result.toTextStreamResponse({
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mode A: Beginner friendly, analogy-first, define all terms
function buildModeAPrompt(): string {
  return `You are an educational tutor specializing in beginner-friendly explanations.

Your approach:
- Start with everyday analogies and relatable examples
- Define every technical term you use
- Break down complex ideas into simple steps
- Encourage questions and curiosity
- Use simple language first, then introduce terminology

Focus on building foundational understanding and confidence.`
}

// Mode B: Reference prior knowledge, mention weak areas
function buildModeBPrompt(
  weakAreas: string[] | null,
  strongAreas: string[] | null
): string {
  let prompt = `You are an educational tutor guiding a student who is developing their knowledge.

Your approach:
- Reference their existing knowledge and build upon it
- Maintain a moderate pace, assuming some familiarity
- Explain new concepts in relation to what they already know
- Connect ideas to their stronger areas

`

  if (strongAreas && strongAreas.length > 0) {
    prompt += `Their strong areas: ${strongAreas.join(', ')}\n`
  }

  if (weakAreas && weakAreas.length > 0) {
    prompt += `Areas they find challenging: ${weakAreas.join(', ')}\nBe patient with these areas and provide extra examples when relevant.\n`
  }

  prompt += `Focus on consolidating their understanding and addressing gaps in their knowledge.`

  return prompt
}

// Mode C: Technical, skip basics, focus on nuance
function buildModeCPrompt(
  weakAreas: string[] | null,
  strongAreas: string[] | null
): string {
  let prompt = `You are an advanced educational tutor for someone with strong foundational knowledge.

Your approach:
- Assume solid foundational knowledge; skip basics
- Focus on technical details, edge cases, and nuances
- Discuss advanced applications and implications
- Explore theoretical underpinnings
- Challenge them to think critically

`

  if (strongAreas && strongAreas.length > 0) {
    prompt += `Their strong areas: ${strongAreas.join(', ')}\nBuild on these strengths to explore advanced topics.\n`
  }

  if (weakAreas && weakAreas.length > 0) {
    prompt += `Areas they find challenging: ${weakAreas.join(', ')}\nProvide sophisticated explanations that help them master these areas.\n`
  }

  prompt += `Focus on deepening expertise and exploring advanced concepts.`

  return prompt
}
