"use client";

import Link from "next/link";
import { useState } from "react";

type Tab = "scrape" | "history";

interface Comment {
	id?: string;
	text?: string;
	profileName?: string;
	profileUrl?: string;
	date?: string;
	likesCount?: string | number;
	[key: string]: unknown;
}

interface Run {
	id: string;
	status: string;
	startedAt: string;
	finishedAt?: string;
	defaultDatasetId: string;
	inputUrl: string | null;
}

function parseLikes(likesCount: unknown): number {
	if (typeof likesCount === "number") return likesCount;
	if (typeof likesCount === "string") {
		const n = parseInt(likesCount, 10);
		return isNaN(n) ? 0 : n;
	}
	return 0;
}

function CommentList({ comments }: { comments: Comment[] }) {
	if (comments.length === 0) {
		return <p className='text-sm text-zinc-500'>No comments with more than 1 like found.</p>;
	}
	return (
		<ul className='flex flex-col gap-3'>
			{comments.map((c, i) => {
				const likes = parseLikes(c.likesCount);
				return (
					<li
						key={c.id ?? i}
						className='rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900'>
						<div className='flex items-center justify-between gap-2 mb-1'>
							<span className='text-sm font-medium text-zinc-800 dark:text-zinc-200'>{c.profileName ?? "Unknown user"}</span>
							{c.date && <span className='text-xs text-zinc-400'>{new Date(c.date).toLocaleString()}</span>}
						</div>
						<p className='text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap'>{c.text ?? "—"}</p>
						<p className='mt-1 text-xs text-zinc-400'>
							👍 {likes} like{likes !== 1 ? "s" : ""}
						</p>
					</li>
				);
			})}
		</ul>
	);
}

export default function FacebookCommentsForm() {
	const [tab, setTab] = useState<Tab>("scrape");

	// Scrape tab
	const [url, setUrl] = useState("");
	const [resultsLimit, setResultsLimit] = useState(100);
	const [loading, setLoading] = useState(false);
	const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
	const [comments, setComments] = useState<Comment[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	// History tab
	const [history, setHistory] = useState<Run[] | null>(null);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyError, setHistoryError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setComments(null);
		setLoading(true);
		setLoadingStatus("Starting scrape…");

		try {
			// Step 1: start the actor run
			const startRes = await fetch("/api/facebook-comments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url, resultsLimit }),
			});

			const startData = await startRes.json();

			if (!startRes.ok) {
				setError(startData.error ?? "Something went wrong");
				return;
			}

			const { runId } = startData as { runId: string };

			// Step 2: poll until the run finishes
			let attempts = 0;
			const maxAttempts = 120; // 10 minutes max at 5s intervals
			while (attempts < maxAttempts) {
				await new Promise((r) => setTimeout(r, 5000));
				attempts++;
				setLoadingStatus(`Scraping… (${attempts * 5}s elapsed)`);

				const pollRes = await fetch(`/api/facebook-comments/status?runId=${encodeURIComponent(runId)}`);
				const pollData = await pollRes.json();

				if (!pollRes.ok) {
					setError(pollData.error ?? "Scrape failed");
					return;
				}

				if (pollData.status === "SUCCEEDED") {
					setComments(pollData.items as Comment[]);
					return;
				}

				if (pollData.status !== "RUNNING" && pollData.status !== "READY") {
					setError(`Scrape ended with status: ${pollData.status}`);
					return;
				}
			}

			setError("Scrape timed out. Try again or check history.");
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
			setLoadingStatus(null);
		}
	}

	async function loadHistory() {
		if (history !== null) return;
		setHistoryLoading(true);
		setHistoryError(null);
		try {
			const res = await fetch("/api/facebook-comments/history");
			const data = await res.json();
			if (!res.ok) {
				setHistoryError(data.error ?? "Failed to load history");
			} else {
				setHistory(data.runs as Run[]);
			}
		} catch {
			setHistoryError("Network error. Please try again.");
		} finally {
			setHistoryLoading(false);
		}
	}

	function switchTab(t: Tab) {
		setTab(t);
		if (t === "history") loadHistory();
	}

	return (
		<div className='w-full max-w-2xl flex flex-col gap-6'>
			{/* Tabs */}
			<div className='flex border-b border-zinc-200 dark:border-zinc-700'>
				{(["scrape", "history"] as Tab[]).map((t) => (
					<button
						key={t}
						onClick={() => switchTab(t)}
						className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
							tab === t
								? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
								: "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
						}`}>
						{t}
					</button>
				))}
			</div>

			{/* Scrape Tab */}
			{tab === "scrape" && (
				<>
					<form onSubmit={handleSubmit} className='flex flex-col gap-3'>
						<label htmlFor='fb-url' className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>
							Facebook Post URL
						</label>
						<div className='flex gap-2'>
							<input
								id='fb-url'
								type='url'
								required
								placeholder='https://www.facebook.com/.../posts/...'
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								className='flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-400'
							/>
							<input
								id='results-limit'
								type='number'
								min={100}
								max={500}
								required
								value={resultsLimit}
								onChange={(e) => setResultsLimit(Math.max(100, parseInt(e.target.value) || 100))}
								className='w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-400'
								title='Number of comments'
							/>
							<button
								type='submit'
								disabled={loading}
								className='rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
								{loading ? (loadingStatus ?? "Loading…") : "Scrape"}
							</button>
						</div>
						<p className='text-xs text-zinc-400 dark:text-zinc-500'>
							Number of comments to fetch (100–500). Results are filtered to comments with more than 1 like.
						</p>
					</form>

					{error && (
						<p className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
							{error}
						</p>
					)}

					{comments !== null && (
						<div className='flex flex-col gap-3'>
							<p className='text-sm text-zinc-500 dark:text-zinc-400'>
								{comments.length} comment{comments.length !== 1 ? "s" : ""} found
							</p>
							<CommentList comments={comments} />
						</div>
					)}
				</>
			)}

			{/* History Tab */}
			{tab === "history" && (
				<div className='flex flex-col gap-4'>
					{historyLoading && <p className='text-sm text-zinc-500'>Loading history…</p>}
					{historyError && (
						<p className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
							{historyError}
						</p>
					)}
					{history !== null && history.length === 0 && <p className='text-sm text-zinc-500'>No past scrapes found.</p>}
					{history !== null && history.length > 0 && (
						<ul className='flex flex-col gap-3'>
							{history.map((run) => (
								<li
									key={run.id}
									className='rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900'>
									<div className='flex items-start justify-between gap-4'>
										<div className='flex flex-col gap-1 min-w-0'>
											{run.inputUrl ? (
												<a
													href={run.inputUrl}
													target='_blank'
													rel='noopener noreferrer'
													className='text-sm font-medium text-blue-600 dark:text-blue-400 truncate hover:underline'>
													{run.inputUrl}
												</a>
											) : (
												<span className='text-sm text-zinc-400 italic'>Unknown URL</span>
											)}
											<div className='flex gap-3 text-xs text-zinc-400'>
												<span>{new Date(run.startedAt).toLocaleString()}</span>
												<span
													className={`font-medium ${
														run.status === "SUCCEEDED"
															? "text-green-600 dark:text-green-400"
															: run.status === "FAILED"
																? "text-red-600 dark:text-red-400"
																: "text-yellow-600 dark:text-yellow-400"
													}`}>
													{run.status}
												</span>
											</div>
										</div>
										<Link
											href={`/history/${run.id}`}
											className='shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'>
											View →
										</Link>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}
