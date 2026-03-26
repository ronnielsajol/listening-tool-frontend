"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
const N8N_WEBHOOK = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ?? "";

interface Message {
	role: "user" | "assistant";
	content: string;
}

interface Comment {
	text?: string;
	profileName?: string;
	likesCount?: string | number;
	[key: string]: unknown;
}

export default function ChatPanel({
	comments,
	runId,
	postLink,
	postDate,
	postTitle,
}: {
	comments: Comment[];
	runId: string;
	postLink: string;
	postDate: string;
	postTitle: string;
}) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [sendStatus, setSendStatus] = useState<"idle" | "ok" | "error">("idle");
	const [topic, setTopic] = useState("");
	const [error, setError] = useState<string | null>(null);
	const bottomRef = useRef<HTMLDivElement>(null);

	// Load saved conversation on mount
	useEffect(() => {
		fetch(`${BACKEND}/api/conversations?run_id=${encodeURIComponent(runId)}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data) {
					setConversationId(data.id);
					setMessages(data.messages ?? []);
				}
			})
			.catch(() => null);
	}, [runId]);

	async function saveConversation(updatedMessages: Message[]) {
		try {
			if (conversationId) {
				await fetch(`${BACKEND}/api/conversations/${conversationId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ messages: updatedMessages }),
				});
			} else {
				const res = await fetch(`${BACKEND}/api/conversations`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ apify_run_id: runId, messages: updatedMessages }),
				});
				if (res.ok) {
					const data = await res.json();
					setConversationId(data.id);
				}
			}
		} catch {
			// silently ignore persistence errors
		}
	}

	const INSIGHT_PROMPT = "Generate the insight report for these comments.";

	async function sendMessage(content: string, history: Message[]) {
		const userMessage: Message = { role: "user", content };
		const nextMessages = [...history, userMessage];
		setMessages(nextMessages);
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: nextMessages, comments }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error ?? "Failed to get a response");
			} else {
				const aiMessage: Message = { role: "assistant", content: data.text };
				const finalMessages = [...nextMessages, aiMessage];
				setMessages(finalMessages);
				await saveConversation(finalMessages);
				setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	function handleGenerateInsight() {
		if (loading) return;
		sendMessage(INSIGHT_PROMPT, messages);
	}

	async function handleSendToN8n() {
		const lastAiMessage = [...messages].reverse().find((m) => m.role === "assistant");
		if (!lastAiMessage || !N8N_WEBHOOK || !topic.trim()) return;
		setSending(true);
		setSendStatus("idle");
		try {
			const res = await fetch(N8N_WEBHOOK, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					summary: lastAiMessage.content,
					topic: topic.trim(),
					postTitle,
					postLink,
					postDate,
					date: new Date().toISOString(),
				}),
			});
			setSendStatus(res.ok ? "ok" : "error");
		} catch {
			setSendStatus("error");
		} finally {
			setSending(false);
		}
	}

	async function handleSend(e: React.FormEvent) {
		e.preventDefault();
		if (!input.trim() || loading) return;

		const content = input.trim();
		setInput("");
		setLoading(true);
		setError(null);

		const userMessage: Message = { role: "user", content };
		const nextMessages = [...messages, userMessage];
		setMessages(nextMessages);
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: nextMessages, comments }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error ?? "Failed to get a response");
			} else {
				const aiMessage: Message = { role: "assistant", content: data.text };
				const finalMessages = [...nextMessages, aiMessage];
				setMessages(finalMessages);
				await saveConversation(finalMessages);
				setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex justify-end gap-2'>
				{messages.some((m) => m.role === "assistant") && (
					<>
						<input
							type='text'
							value={topic}
							onChange={(e) => setTopic(e.target.value)}
							placeholder='Topic (required)'
							className='rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-violet-400 w-44'
						/>
						<button
							type='button'
							onClick={handleSendToN8n}
							disabled={sending || !N8N_WEBHOOK || !topic.trim()}
							className='rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed'>
							{sending ? "Sending…" : sendStatus === "ok" ? "✓ Sent" : sendStatus === "error" ? "Failed – Retry" : "📤 Send to n8n"}
						</button>
					</>
				)}
				<button
					type='button'
					onClick={handleGenerateInsight}
					disabled={loading}
					className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed'>
					{loading ? "Generating…" : "✨ Generate Insight"}
				</button>
			</div>
			<div className='flex flex-col gap-3 min-h-45 max-h-96 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900'>
				{messages.length === 0 ? (
					<p className='text-sm text-zinc-400 dark:text-zinc-500 italic'>
						Ask anything about the comments above &mdash; e.g. &ldquo;What are people most concerned about?&rdquo; or
						&ldquo;Summarise the sentiment.&rdquo;
					</p>
				) : (
					messages.map((m, i) => (
						<div key={i} className={`flex flex-col gap-0.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
							<span className='text-xs text-zinc-400'>{m.role === "user" ? "You" : "AI"}</span>
							<div
								className={`max-w-prose rounded-lg px-3 py-2 text-sm ${
									m.role === "user"
										? "bg-blue-600 text-white"
										: "bg-white border border-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
								}`}>
								{m.role === "user" ? (
									m.content
								) : (
									<div className='prose prose-sm dark:prose-invert max-w-none'>
										<ReactMarkdown>{m.content}</ReactMarkdown>
									</div>
								)}
							</div>
						</div>
					))
				)}
			</div>

			<form onSubmit={handleSend} className='flex gap-2'>
				<input
					type='text'
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder='Ask about these comments…'
					className='flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-400'
				/>
				<button
					type='submit'
					disabled={!input.trim() || loading}
					className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed'>
					{loading ? "…" : "Send"}
				</button>
			</form>
			{error && <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>}
			<div ref={bottomRef} />
		</div>
	);
}
