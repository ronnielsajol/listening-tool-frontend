import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Message {
	role: "user" | "assistant";
	content: string;
}

interface Comment {
	text?: string;
	profileName?: string;
	likesCount?: string | number;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Hardcoded context files loaded once at startup
const ROOT = process.cwd();
const csvContext = fs.existsSync(path.join(ROOT, "context.csv"))
	? fs.readFileSync(path.join(ROOT, "context.csv"), "utf-8")
	: "";
const mdContext = fs.existsSync(path.join(ROOT, "context.md"))
	? fs.readFileSync(path.join(ROOT, "context.md"), "utf-8")
	: "";

export async function POST(req: NextRequest) {
	const { messages, comments } = (await req.json()) as {
		messages: Message[];
		comments: Comment[];
	};

	if (!Array.isArray(messages) || messages.length === 0) {
		return NextResponse.json({ error: "No messages provided" }, { status: 400 });
	}

	const commentsText = (comments ?? [])
		.map((c, i) => `${i + 1}. ${c.profileName ?? "Anonymous"}: "${c.text ?? ""}" (${c.likesCount ?? 0} likes)`)
		.join("\n");

	// You can modify this prompt to change how the AI analyses the comments
	const systemInstruction = `You are a Facebook comment analysis assistant.

Your task is to analyze scraped Facebook comments and produce a strategic summary. Write in pure flowing paragraphs — no section labels, no headings, no numbered lists, no bullet points. Use natural prose that reads like a continuous analyst's report.

Cover all of the following in order within the paragraphs: what the comments are about overall; the main themes and what the public is most concerned or vocal about; the audience's general sentiment and emotional tone; any risks, misinformation, or urgent concerns that need immediate attention; and concrete recommended actions tied to specific government programs where applicable.

Keep the response concise, practical, and decision-oriented.

Here are the scraped comments (filtered to those with more than 1 like):

${commentsText || "(no comments available)"}${mdContext.trim() ? `\n\n--- Instructions & Reference ---\n${mdContext.trim()}` : ""}${csvContext.trim() ? `\n\n--- Reference Data (CSV) ---\n${csvContext.trim()}` : ""}`;

	const contents = messages.map((m) => ({
		role: m.role === "user" ? ("user" as const) : ("model" as const),
		parts: [{ text: m.content }],
	}));

	try {
		const response = await ai.models.generateContent({
			model: "gemini-3-flash-preview",
			contents,
			config: { systemInstruction },
		});

		return NextResponse.json({ text: response.text });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Gemini API error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
