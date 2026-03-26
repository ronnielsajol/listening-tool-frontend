import { NextRequest } from "next/server";
import { client } from "../apify";

export async function POST(request: NextRequest) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (!body || typeof body !== "object" || !("url" in body)) {
		return Response.json({ error: "url is required" }, { status: 400 });
	}

	const { url, resultsLimit } = body as { url: unknown; resultsLimit?: unknown };

	const limit = typeof resultsLimit === "number" && resultsLimit >= 100 ? Math.min(Math.floor(resultsLimit), 500) : 100;

	if (typeof url !== "string" || url.trim() === "") {
		return Response.json({ error: "url must be a non-empty string" }, { status: 400 });
	}

	// Validate that the URL is a legitimate Facebook URL
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return Response.json({ error: "Invalid URL" }, { status: 400 });
	}

	if (parsed.protocol !== "https:" || !/(^|\.)facebook\.com$/.test(parsed.hostname)) {
		return Response.json({ error: "URL must be a https://www.facebook.com/... link" }, { status: 400 });
	}

	try {
		const input = {
			startUrls: [{ url: url.trim() }],
			resultsLimit: limit,
			includeNestedComments: false,
			viewOption: "RANKED_UNFILTERED",
		};

		const run = await client.actor("us5srxAYnsrkgUv2v").call(input);
		const { items } = await client.dataset(run.defaultDatasetId).listItems();

		const filtered = items.filter((item) => {
			const likes = parseInt(String((item as Record<string, unknown>).likesCount ?? "0"), 10);
			return likes > 1;
		});

		return Response.json({ items: filtered });
	} catch (err) {
		console.error("Apify actor error:", err);
		return Response.json({ error: "Failed to fetch comments from Apify" }, { status: 500 });
	}
}
