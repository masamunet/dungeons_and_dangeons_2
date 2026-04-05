import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiRequest {
	prompt: string;
	context?: string;
	type: 'flavor_text' | 'dialogue' | 'quest' | 'item_description';
	maxTokens?: number;
}

// Simple in-memory cache
const cache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) {
		throw error(500, 'GEMINI_API_KEY not configured');
	}

	const body: GeminiRequest = await request.json();

	// Check cache
	const cacheKey = `${body.type}:${body.prompt}:${body.context ?? ''}`;
	const cached = cache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return json({ text: cached.text, type: body.type, cached: true });
	}

	const systemPrompt = buildSystemPrompt(body.type, body.context);

	const geminiPayload = {
		contents: [
			{
				role: 'user',
				parts: [{ text: `${systemPrompt}\n\n${body.prompt}` }],
			},
		],
		generationConfig: {
			maxOutputTokens: body.maxTokens ?? 256,
			temperature: 0.8,
			topP: 0.95,
		},
	};

	const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(geminiPayload),
	});

	if (!response.ok) {
		const errText = await response.text();
		console.error('Gemini API error:', errText);
		throw error(response.status, 'Gemini API request failed');
	}

	const data = await response.json();
	const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

	// Store in cache
	cache.set(cacheKey, { text, timestamp: Date.now() });

	return json({ text, type: body.type, cached: false });
};

function buildSystemPrompt(type: string, context?: string): string {
	const base =
		'あなたはダークファンタジーRPGのナレーターです。「火吹山の魔法使い」のようなゲームブック風の、陰鬱で雰囲気のある簡潔な文体で書いてください。日本語で回答してください。';

	switch (type) {
		case 'flavor_text':
			return `${base}\nダンジョンエリアの短い雰囲気描写(1-2文)を生成してください。${context ?? ''}`;
		case 'dialogue':
			return `${base}\nNPCの台詞を生成してください。キャラクターになりきってください。${context ?? ''}`;
		case 'quest':
			return `${base}\n冒険のクエストを生成してください。以下のJSON形式で返してください: { "title": "...", "description": "...", "objective": "...", "reward_hint": "..." }。${context ?? ''}`;
		case 'item_description':
			return `${base}\nアイテムのフレーバーテキスト(1文)を生成してください。${context ?? ''}`;
		default:
			return base;
	}
}
