import { eventBridge, GameEvents } from './eventBridge';

interface GeminiResponse {
	text: string;
	type: string;
	cached: boolean;
}

/**
 * Client-side utility for calling the Gemini API proxy.
 * All calls are async and non-blocking — gameplay never waits for LLM.
 */
export async function fetchGemini(
	type: 'flavor_text' | 'dialogue' | 'quest' | 'item_description',
	prompt: string,
	context?: string
): Promise<string> {
	try {
		const res = await fetch('/api/gemini', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type, prompt, context }),
		});

		if (!res.ok) {
			console.warn(`Gemini API error: ${res.status}`);
			return getFallbackText(type);
		}

		const data: GeminiResponse = await res.json();
		return data.text || getFallbackText(type);
	} catch (e) {
		console.warn('Gemini API unreachable, using fallback');
		return getFallbackText(type);
	}
}

/** Fire-and-forget: fetch flavor text and emit via eventBridge */
export function fetchFlavorTextAsync(floorLevel: number): void {
	fetchGemini(
		'flavor_text',
		`ダンジョンの地下${floorLevel}階に降りた冒険者の状況を描写してください。`,
		`プレイヤーは地下${floorLevel}階にいます。深くなるほど危険で暗い。`
	).then((text) => {
		eventBridge.emit(GameEvents.FLAVOR_TEXT_RECEIVED, text);
	});
}

/** Fire-and-forget: fetch NPC dialogue and emit */
export function fetchNPCDialogueAsync(npcName: string, npcRole: string): void {
	fetchGemini(
		'dialogue',
		`「${npcName}」（${npcRole}）として冒険者に話しかけてください。短く1-2文で。`,
		`NPCは拠点の${npcRole}です。`
	).then((text) => {
		eventBridge.emit('npc-dialogue', { name: npcName, text });
	});
}

function getFallbackText(type: string): string {
	switch (type) {
		case 'flavor_text':
			return '冷たい空気が肌を刺す。松明の炎が壁に不気味な影を落としている。';
		case 'dialogue':
			return '……今は話せることはない。';
		case 'quest':
			return '{"title":"闇の探索","description":"ダンジョンの奥深くに何かが潜んでいる","objective":"地下3階まで到達せよ","reward_hint":"古い鍵が手に入るかもしれない"}';
		case 'item_description':
			return '使い古された剣。刃こぼれが目立つが、まだ戦える。';
		default:
			return '';
	}
}
