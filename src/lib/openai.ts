import OpenAI from 'openai'
import type { AIInsight, MonthlyOverview, Entry } from '../types'

let openaiClient: OpenAI | null = null

export const initializeOpenAI = (apiKey: string) => {
  if (!apiKey) {
    openaiClient = null
    return false
  }
  
  try {
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    })
    return true
  } catch {
    openaiClient = null
    return false
  }
}

export const isOpenAIConfigured = () => {
  const envKey = import.meta.env.VITE_OPENAI_API_KEY
  return Boolean(envKey || openaiClient)
}

export const getOpenAIClient = () => {
  if (openaiClient) return openaiClient
  
  const envKey = import.meta.env.VITE_OPENAI_API_KEY
  if (envKey) {
    initializeOpenAI(envKey)
    return openaiClient
  }
  
  return null
}

export const generateFinancialInsights = async (
  overview: MonthlyOverview,
  entries: Entry[],
  historicalData?: MonthlyOverview[]
): Promise<AIInsight[]> => {
  const client = getOpenAIClient()
  
  if (!client) {
    return []
  }

  try {
    const prompt = `Analyze this personal finance data and provide 3-5 actionable insights:

Monthly Overview:
- Income: Planned ${overview.income.planned}, Actual ${overview.income.actual}
- Expenses: Planned ${overview.expenses.planned}, Actual ${overview.expenses.actual}
- Bills: Planned ${overview.bills.planned}, Actual ${overview.bills.actual}
- Savings: Planned ${overview.savings.planned}, Actual ${overview.savings.actual}
- Debt: Planned ${overview.debt.planned}, Actual ${overview.debt.actual}
- Remaining: Planned ${overview.remaining.planned}, Actual ${overview.remaining.actual}

Categories breakdown:
${entries.map(e => `- ${e.category}: ${e.name} - Planned: ${e.planned}, Actual: ${e.actual}`).join('\n')}

${historicalData ? `Historical trend (last ${historicalData.length} months available)` : 'No historical data available'}

Provide insights in JSON format:
[
  {
    "type": "tip" | "warning" | "achievement" | "recommendation",
    "title": "Brief title",
    "description": "Detailed actionable advice",
    "category": "income" | "expenses" | "bills" | "savings" | "debt" (optional),
    "impact": "low" | "medium" | "high"
  }
]`

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial advisor. Provide practical, actionable insights based on the user\'s spending data. Be encouraging but honest about areas for improvement.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const insights: AIInsight[] = JSON.parse(jsonMatch[0]).map((insight: Omit<AIInsight, 'id'>, index: number) => ({
      ...insight,
      id: `insight-${Date.now()}-${index}`,
    }))

    return insights
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return []
  }
}

