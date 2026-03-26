import { listActorRuns, getKVRecord, ACTOR_ID, ApifyRun } from "../../apify";

export async function GET() {
	try {
		const runs = await listActorRuns(ACTOR_ID, 20);

		// Fetch the scraped URL from each run's INPUT record in parallel
		const runsWithInput = await Promise.all(
			runs.map(async (run) => {
				try {
					const input = (await getKVRecord((run as ApifyRun).defaultKeyValueStoreId, "INPUT")) as {
						startUrls?: { url: string }[];
					} | null;
					const inputUrl = input?.startUrls?.[0]?.url ?? null;
					return { ...run, inputUrl };
				} catch {
					return { ...run, inputUrl: null };
				}
			})
		);

		return Response.json({ runs: runsWithInput });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("Apify history error:", message);
		return Response.json({ error: `Failed to fetch run history: ${message}` }, { status: 500 });
	}
}
