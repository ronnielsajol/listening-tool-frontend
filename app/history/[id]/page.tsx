import Link from "next/link";
import { notFound } from "next/navigation";
import { getRun, getKVRecord, getDatasetItems } from "../../api/apify";
import ChatPanel from "./ChatPanel";

interface Comment {
	id?: string;
	text?: string;
	profileName?: string;
	profileUrl?: string;
	date?: string;
	likesCount?: string | number;
	[key: string]: unknown;
}

interface RunDetails {
	id: string;
	status: string;
	startedAt: string;
	finishedAt?: string;
	defaultDatasetId: string;
	defaultKeyValueStoreId: string;
}

function parseLikes(likesCount: unknown): number {
	if (typeof likesCount === "number") return likesCount;
	if (typeof likesCount === "string") {
		const n = parseInt(likesCount, 10);
		return isNaN(n) ? 0 : n;
	}
	return 0;
}

async function getRunData(id: string) {
	let run: RunDetails;
	try {
		run = (await getRun(id)) as RunDetails;
	} catch {
		return null;
	}

	const [inputRecord, datasetItems] = await Promise.all([
		getKVRecord(run.defaultKeyValueStoreId, "INPUT").catch(() => null),
		getDatasetItems(run.defaultDatasetId).catch(() => [] as unknown[]),
	]);

	const input = inputRecord as { startUrls?: { url: string }[] } | null;
	const inputUrl = input?.startUrls?.[0]?.url ?? null;

	const comments = (datasetItems as Comment[]).filter((item) => parseLikes(item.likesCount) > 1);

	const firstItem = datasetItems[0] as Record<string, unknown> | undefined;
	const postTitle =
		(firstItem?.postTitle as string | undefined) ??
		(firstItem?.pageTitle as string | undefined) ??
		(firstItem?.name as string | undefined) ??
		null;

	return { run, inputUrl, postTitle, comments };
}

export default async function ScrapeDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const data = await getRunData(id);

	if (!data) notFound();

	const { run, inputUrl, postTitle, comments } = data;

	return (
		<div className='flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-black'>
			<main className='w-full max-w-3xl mx-auto flex flex-col gap-8 py-16 px-8'>
				{/* Header */}
				<div className='flex items-start justify-between gap-4'>
					<div className='flex flex-col gap-1 min-w-0'>
						<Link href='/history' className='text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'>
							← Back to history
						</Link>
						{inputUrl ? (
							<a
								href={inputUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline break-all'>
								{inputUrl}
							</a>
						) : (
							<span className='mt-1 text-lg font-semibold text-zinc-400 italic'>Unknown URL</span>
						)}
						<div className='flex gap-3 text-xs text-zinc-400'>
							<span>{new Date(run.startedAt).toLocaleString()}</span>
							{run.finishedAt && (
								<>
									<span>–</span>
									<span>{new Date(run.finishedAt).toLocaleString()}</span>
								</>
							)}
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
				</div>

				{/* AI Chat */}
				<section className='flex flex-col gap-3'>
					<h2 className='text-base font-semibold text-zinc-800 dark:text-zinc-100'>AI Insights</h2>
					<ChatPanel
						comments={comments}
						runId={id}
						postLink={inputUrl ?? ""}
						postDate={run.startedAt}
						postTitle={postTitle ?? inputUrl ?? ""}
					/>
				</section>

				{/* Comments */}
				<section className='flex flex-col gap-4'>
					<h2 className='text-base font-semibold text-zinc-800 dark:text-zinc-100'>
						Comments <span className='text-sm font-normal text-zinc-400'>({comments.length} with &gt;1 like)</span>
					</h2>

					{comments.length === 0 ? (
						<p className='text-sm text-zinc-500'>No comments with more than 1 like found.</p>
					) : (
						<ul className='flex flex-col gap-3'>
							{comments.map((c, i) => {
								const likes = parseLikes(c.likesCount);
								return (
									<li
										key={c.id ?? i}
										className='rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900'>
										<div className='flex items-center justify-between gap-2 mb-1'>
											<span className='text-sm font-medium text-zinc-800 dark:text-zinc-200'>{c.profileName ?? "Unknown user"}</span>
											{c.date && <span className='text-xs text-zinc-400'>{new Date(c.date).toLocaleString()}</span>}
										</div>
										<p className='text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap'>{c.text ?? "—"}</p>
										<p className='mt-1.5 text-xs text-zinc-400'>
											👍 {likes} like{likes !== 1 ? "s" : ""}
										</p>
									</li>
								);
							})}
						</ul>
					)}
				</section>
			</main>
		</div>
	);
}
