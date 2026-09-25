import type { Choice, Config, Turn } from './engine';
import { scenarios, stages } from './engine';

export const DEFAULT_AI_MODEL = 'gpt-4.1-mini';
export const AI_MODELS = [
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini · экономичный' },
  { id: 'gpt-6-luna', label: 'GPT-6 Luna · быстрый' },
  { id: 'gpt-6-sol', label: 'GPT-6 Sol · точнее' },
] as const;

const SESSION_STORAGE_KEY = 'arena-openai-session-v1';
const LOCAL_STORAGE_KEY = 'arena-openai-local-v1';

export type AiConfig = {
  apiKey: string;
  model: string;
  remember: boolean;
  verifiedAt: number;
};

function browserStorage(kind: 'session' | 'local') {
  if (typeof window === 'undefined') return null;
  return kind === 'session' ? window.sessionStorage : window.localStorage;
}

function parseConfig(raw: string | null): AiConfig | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AiConfig>;
    if (typeof value.apiKey !== 'string' || value.apiKey.length < 20) return null;
    if (typeof value.model !== 'string' || !value.model) return null;
    return {
      apiKey: value.apiKey,
      model: value.model,
      remember: Boolean(value.remember),
      verifiedAt: typeof value.verifiedAt === 'number' ? value.verifiedAt : 0,
    };
  } catch {
    return null;
  }
}

export function loadAiConfig(): AiConfig | null {
  const session = browserStorage('session');
  const local = browserStorage('local');
  try {
    return parseConfig(session?.getItem(SESSION_STORAGE_KEY) ?? null)
      ?? parseConfig(local?.getItem(LOCAL_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function saveAiConfig(config: Omit<AiConfig, 'verifiedAt'>): AiConfig {
  const stored: AiConfig = { ...config, apiKey: config.apiKey.trim(), verifiedAt: Date.now() };
  clearAiConfig();
  const storage = browserStorage(stored.remember ? 'local' : 'session');
  storage?.setItem(stored.remember ? LOCAL_STORAGE_KEY : SESSION_STORAGE_KEY, JSON.stringify(stored));
  window.dispatchEvent(new Event('arena-ai-config'));
  return stored;
}

export function clearAiConfig() {
  try {
    browserStorage('session')?.removeItem(SESSION_STORAGE_KEY);
    browserStorage('local')?.removeItem(LOCAL_STORAGE_KEY);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('arena-ai-config'));
  } catch {
    // Storage can be unavailable in privacy modes. The in-memory form still works.
  }
}

export function describeApiError(error: unknown) {
  if (error instanceof OpenAIRequestError) {
    if (error.status === 401) return 'Ключ не принят OpenAI. Проверьте, что он скопирован полностью.';
    if (error.status === 403) return 'У ключа нет доступа к выбранной модели.';
    if (error.status === 404) return 'Выбранная модель недоступна. Попробуйте другую.';
    if (error.status === 429) return 'OpenAI отклонил запрос: проверьте баланс и лимиты аккаунта.';
    return `OpenAI вернул ошибку ${error.status}. Попробуйте ещё раз.`;
  }
  if (error instanceof DOMException && error.name === 'AbortError') return 'Запрос отменён.';
  return 'Не удалось связаться с OpenAI. Проверьте интернет и повторите попытку.';
}

class OpenAIRequestError extends Error {
  constructor(public status: number) {
    super(`OpenAI request failed with status ${status}`);
  }
}

async function openAIRequest(url: string, apiKey: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new OpenAIRequestError(response.status);
  return response;
}

export async function testOpenAIConnection(apiKey: string, model: string) {
  const response = await openAIRequest(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, apiKey.trim());
  const data = await response.json() as { id?: string };
  if (!data.id) throw new OpenAIRequestError(502);
  return data.id;
}

export function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };
  if (typeof response.output_text === 'string') return response.output_text.trim();
  return (response.output ?? [])
    .flatMap(item => item.content ?? [])
    .filter(item => item.type === 'output_text' && typeof item.text === 'string')
    .map(item => String(item.text).trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function buildNegotiationPrompt(config: Config, turns: Turn[], choice: Choice, stage: number) {
  const persona = scenarios[config.domain];
  const history = turns.length
    ? turns.map((turn, index) => `${index + 1}. Игрок: ${turn.text}\nСобеседник: ${turn.reply}`).join('\n')
    : 'Предыдущих ходов нет.';
  return {
    instructions: [
      `Ты играешь роль «${persona.person}», ${config.role.toLowerCase()}, в учебной симуляции деловых переговоров.`,
      `Твоя цель: ${config.goal}. Тон: ${config.tone.toLowerCase()}. Сложность: ${config.difficulty.toLowerCase()}.`,
      'Отвечай только от лица собеседника на русском языке. Не упоминай ИИ, правила, очки или симуляцию.',
      'Ответ должен быть реалистичным и деловым: 2–4 предложения, максимум 650 символов. Добавляй конкретное возражение, условие или вопрос, чтобы диалог развивался.',
      'Реагируй на конкретную формулировку игрока. При давлении защищай границы; при сильном предложении открывай пространство для сделки.',
    ].join(' '),
    input: [
      `Контекст: ${persona.brief}`,
      `Текущий этап: ${stages[stage]}.`,
      `История:\n${history}`,
      `Новая реплика игрока: ${choice.text}`,
      'Дай следующую реплику собеседника.',
    ].join('\n\n'),
  };
}

export async function generateOpponentReply(args: {
  ai: AiConfig;
  config: Config;
  turns: Turn[];
  choice: Choice;
  stage: number;
  signal?: AbortSignal;
}) {
  const prompt = buildNegotiationPrompt(args.config, args.turns, args.choice, args.stage);
  const response = await openAIRequest('https://api.openai.com/v1/responses', args.ai.apiKey, {
    method: 'POST',
    signal: args.signal,
    body: JSON.stringify({
      model: args.ai.model,
      store: false,
      max_output_tokens: 280,
      instructions: prompt.instructions,
      input: prompt.input,
    }),
  });
  const text = extractResponseText(await response.json());
  if (!text) throw new OpenAIRequestError(502);
  return text.slice(0, 800);
}
