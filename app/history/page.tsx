import Link from "next/link";
import { client } from "../api/apify";

interface RunRaw {
	id: string;
	status: string;
	startedAt: string;
	defaultKeyValueStoreId: string;
	defaultDatasetId: string;
}

async function getRuns() {
	const { items } = await client.actor("us5srxAYnsrkgUv2v").runs().list({ limit: 30, desc: true });

	const runs = await Promise.all(
		(items as unknown as RunRaw[]).map(async (run) => {
			try {
				const record = await client.keyValueStore(run.defaultKeyValueStoreId).getRecord("INPUT");
				const input = record?.value as { startUrls?: { url: string }[] } | null;
				return { ...run, inputUrl: input?.startUrls?.[0]?.url ?? null };
			} catch {
				return { ...run, inputUrl: null };
			}
		})
	);

	return runs;
}

export default async function HistoryPage() {
	const runs = await getRuns();

	return (
		<div className='flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-black'>
			<main className='w-full max-w-3xl mx-auto flex flex-col gap-6 py-16 px-8'>
				<div className='flex items-center justify-between'>
					<div>
						<h1 className='text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50'>Scrape History</h1>
						<p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>Past Facebook comment scrapes</p>
					</div>
					<Link
						href='/'
						className='rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'>
						← New Scrape
					</Link>
				</div>

				{runs.length === 0 ? (
					<p className='text-sm text-zinc-500'>No past scrapes found.</p>
				) : (
					<ul className='flex flex-col gap-3'>
						{runs.map((run) => (
							<li key={run.id}>
								<Link
									href={`/history/${run.id}`}
									className='flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-zinc-800'>
									<div className='flex flex-col gap-1 min-w-0'>
										{run.inputUrl ? (
											<span className='text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate'>{run.inputUrl}</span>
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
									<span className='shrink-0 text-xs text-blue-600 dark:text-blue-400 pt-0.5'>View →</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</main>
		</div>
	);
}
