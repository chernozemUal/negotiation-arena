import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choices, defaults } from '../lib/engine';
import {
  buildNegotiationPrompt,
  describeApiError,
  extractResponseText,
  generateOpponentReply,
  testOpenAIConnection,
} from '../lib/openai';

test('extracts text from both Responses API shapes', () => {
  assert.equal(extractResponseText({ output_text: '  Готов обсудить.  ' }), 'Готов обсудить.');
  assert.equal(extractResponseText({
    output: [{ content: [{ type: 'output_text', text: 'Первая часть.' }, { type: 'refusal', text: 'ignore' }] }],
  }), 'Первая часть.');
  assert.equal(extractResponseText({ output: [] }), '');
});

test('negotiation prompt includes persona, stage, history, and the new reply', () => {
  const config = defaults.supplier;
  const first = { ...choices('supplier', 0)[0], reply: 'Продолжим разговор.' };
  const next = choices('supplier', 1)[0];
  const prompt = buildNegotiationPrompt(config, [first], next, 1);
  assert.match(prompt.instructions, /Александр Морозов/);
  assert.match(prompt.instructions, /не упоминай ИИ/i);
  assert.match(prompt.input, /Выяснить интересы/);
  assert.match(prompt.input, /Продолжим разговор/);
  assert.match(prompt.input, new RegExp(next.text.replace(/[?]/g, '\\?')));
});

test('connection check validates the selected model without generating text', async () => {
  const original = globalThis.fetch;
  let requested = '';
  globalThis.fetch = (async (url: string | URL | Request) => {
    requested = String(url);
    return new Response(JSON.stringify({ id: 'gpt-4.1-mini' }), { status: 200 });
  }) as typeof fetch;
  try {
    assert.equal(await testOpenAIConnection('unit-test-key-that-is-long-enough', 'gpt-4.1-mini'), 'gpt-4.1-mini');
    assert.equal(requested, 'https://api.openai.com/v1/models/gpt-4.1-mini');
  } finally {
    globalThis.fetch = original;
  }
});

test('generation uses Responses API without server-side storage', async () => {
  const original = globalThis.fetch;
  let requestBody: Record<string, unknown> = {};
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      output: [{ content: [{ type: 'output_text', text: 'Гарантированный объём меняет ситуацию.' }] }],
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const reply = await generateOpponentReply({
      ai: { apiKey: 'unit-test-key-that-is-long-enough', model: 'gpt-4.1-mini', remember: false, verifiedAt: 1 },
      config: defaults.supplier,
      turns: [],
      choice: choices('supplier', 0)[0],
      stage: 0,
    });
    assert.equal(reply, 'Гарантированный объём меняет ситуацию.');
    assert.equal(requestBody.model, 'gpt-4.1-mini');
    assert.equal(requestBody.store, false);
    assert.equal(requestBody.max_output_tokens, 180);
  } finally {
    globalThis.fetch = original;
  }
});

test('API errors have a useful Russian explanation', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('{}', { status: 401 })) as typeof fetch;
  try {
    let caught: unknown;
    try {
      await testOpenAIConnection('unit-test-key-that-is-long-enough', 'gpt-4.1-mini');
    } catch (error) {
      caught = error;
    }
    assert.match(describeApiError(caught), /Ключ не принят OpenAI/);
  } finally {
    globalThis.fetch = original;
  }
});
