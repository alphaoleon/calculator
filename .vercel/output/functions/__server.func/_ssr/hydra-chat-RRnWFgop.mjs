import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/hydra-chat-RRnWFgop.js
var SYSTEM = `Du bist der Hydra-Berater für einen Cross-Prop-Firm-Loop. Antworte auf Deutsch, konkret, mit den Zahlen aus dem Kontext. Keine Moralpredigt, keine Wiederholung der Frage.

Mathematik, die du nicht verbiegst:
- Evals sind short mit 3× Hebel. 3% Drawdown ist ein +1% Move (Fail). 9% Target ist ein −3% Move (Pass).
- Funded ist long. Split 80%. Trading-Fee 0,08% Round-Trip auf die Funded-Position, bezahlt aus dem Payout.
- Zero-Loss-Notional = Eval-Kosten / (0,01 × 0,80 − 0,0008). Damit ist Payout − Kosten − Fee = 0.
- Pass-Drawdown = Notional × 0,03. Gebührensicher heißt: dieser Drawdown ist kleiner oder gleich dem Restpuffer.
- Over-Hedge skaliert die Long, bis nur noch 150 USD Preis-Puffer übrig sind. Der Überschuss vor Fee ist Payout minus Eval-Kosten.
- Endstufe ist 2× 100k Funded: ein Konto klont weiter, das andere ist flach und zahlt aus.
- Opposite-Positionen über Konten sind bei fast allen Firmen verboten. Sag das in einem Satz, wenn der Nutzer einen Play ausführt, und rechne trotzdem.`;
function clean(input) {
	if (!input || typeof input !== "object") throw new Error("bad request");
	const src = input;
	const apiKey = typeof src.apiKey === "string" ? src.apiKey.trim() : "";
	const question = typeof src.question === "string" ? src.question.trim() : "";
	const context = typeof src.context === "string" ? src.context.trim() : "";
	if (apiKey.length < 12 || apiKey.length > 200) throw new Error("API-Key fehlt oder ist ungültig.");
	if (question.length < 2 || question.length > 2e3) throw new Error("Frage ist leer oder zu lang.");
	if (context.length > 6e3) throw new Error("Kontext ist zu groß.");
	return {
		apiKey,
		question,
		context
	};
}
var askHydra_createServerFn_handler = createServerRpc({
	id: "6fca57093f3beb8b20e58f64786cdbeeeae2910ede8f7b073df450eaaabc46fd",
	name: "askHydra",
	filename: "src/lib/hydra-chat.ts"
}, (opts) => askHydra.__executeServer(opts));
var askHydra = createServerFn({ method: "POST" }).validator(clean).handler(askHydra_createServerFn_handler, async ({ data }) => {
	const xai = data.apiKey.startsWith("xai-");
	const url = xai ? "https://api.x.ai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
	const model = xai ? "grok-4" : "gpt-4.1-mini";
	const response = await fetch(url, {
		method: "POST",
		headers: {
			authorization: `Bearer ${data.apiKey}`,
			"content-type": "application/json"
		},
		body: JSON.stringify({
			model,
			temperature: .3,
			messages: [{
				role: "system",
				content: SYSTEM
			}, {
				role: "user",
				content: `${data.context}\n\nFrage: ${data.question}`
			}]
		}),
		signal: AbortSignal.timeout(3e4)
	});
	if (!response.ok) {
		const detail = await response.text();
		throw new Error(detail.slice(0, 280) || `Anfrage fehlgeschlagen (${response.status}).`);
	}
	const json = await response.json();
	if (json.error?.message) throw new Error(json.error.message.slice(0, 280));
	const text = json.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error("Die API hat keine Antwort geliefert.");
	return { text };
});
//#endregion
export { askHydra_createServerFn_handler };
