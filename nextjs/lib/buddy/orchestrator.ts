// nextjs/lib/buddy/orchestrator.ts
import Anthropic from '@anthropic-ai/sdk'
import type { Locale, ChatMessage, BuddyStreamEvent, SpotCandidate, ArticleResult } from './types'
import { BUDDY_TOOLS } from './tools'
import { buildSystemPrompt } from './prompt'
import type { SpotFilters, ArticleQuery } from './retrieval'

export interface LlmToolUse {
  id: string
  name: string
  input: Record<string, unknown>
}
export interface LlmTurn {
  text: () => AsyncIterable<string>
  final: () => Promise<{ stopReason: string; assistantContent: unknown; toolUses: LlmToolUse[] }>
  _toolUses?: LlmToolUse[]
}
export interface LlmClient {
  runTurn: (input: {
    system: Anthropic.TextBlockParam[]
    tools: Anthropic.Tool[]
    messages: Anthropic.MessageParam[]
  }) => LlmTurn
}

export interface OrchestratorDeps {
  llm: LlmClient
  searchSpots: (filters: SpotFilters, locale: Locale) => Promise<SpotCandidate[]>
  searchArticles: (input: ArticleQuery, locale: Locale) => Promise<ArticleResult[]>
}

const MAX_TOOL_ROUNDS = 4
const MAX_TOKENS = 2048
const MODEL = process.env.BUDDY_MODEL ?? 'claude-haiku-4-5'

export async function* runBuddyTurn(
  input: { messages: ChatMessage[]; locale: Locale },
  deps: OrchestratorDeps,
): AsyncGenerator<BuddyStreamEvent> {
  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: buildSystemPrompt(input.locale), cache_control: { type: 'ephemeral' } },
  ]
  const messages: Anthropic.MessageParam[] = input.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const turn = deps.llm.runTurn({ system, tools: BUDDY_TOOLS, messages })

    for await (const chunk of turn.text()) {
      yield { type: 'text', value: chunk }
    }

    const final = await turn.final()
    messages.push({ role: 'assistant', content: final.assistantContent as Anthropic.ContentBlockParam[] })

    if (final.stopReason !== 'tool_use' || final.toolUses.length === 0) break

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const tu of final.toolUses) {
      if (tu.name === 'search_spots') {
        const spots = await deps.searchSpots(
          {
            cuisine: tu.input.cuisine as string | undefined,
            bezirk: tu.input.bezirk as string | undefined,
            priceRange: tu.input.price_range as string | undefined,
            vibeQuery: String(tu.input.vibe_query ?? ''),
          },
          input.locale,
        )
        yield { type: 'spots', value: spots }
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(spots) })
      } else if (tu.name === 'search_articles') {
        const articles = await deps.searchArticles(
          { query: String(tu.input.query ?? '') },
          input.locale,
        )
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(articles) })
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'Unbekanntes Werkzeug.',
          is_error: true,
        })
      }
    }
    messages.push({ role: 'user', content: toolResults })
  }

  yield { type: 'done' }
}

// Real LlmClient backed by the Anthropic SDK (not exercised in unit tests).
export function createAnthropicLlmClient(client: Anthropic = new Anthropic()): LlmClient {
  return {
    runTurn({ system, tools, messages }) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools,
        messages,
      })
      return {
        async *text() {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              yield event.delta.text
            }
          }
        },
        async final() {
          const msg = await stream.finalMessage()
          const toolUses: LlmToolUse[] = msg.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
            .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }))
          return { stopReason: msg.stop_reason ?? 'end_turn', assistantContent: msg.content, toolUses }
        },
      }
    },
  }
}
