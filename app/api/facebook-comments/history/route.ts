import { client } from "../../apify";

export async function GET() {
	try {
		const { items: runs } = await client.actor("us5srxAYnsrkgUv2v").runs().list({ limit: 20, desc: true });

		// Fetch the scraped URL from each run's INPUT record in parallel
		const runsWithInput = await Promise.all(
			runs.map(async (run) => {
				try {
					const record = await client
						.keyValueStore((run as unknown as Record<string, string>).defaultKeyValueStoreId)
						.getRecord("INPUT");
					const input = record?.value as { startUrls?: { url: string }[] } | null;
					const inputUrl = input?.startUrls?.[0]?.url ?? null;
					return { ...run, inputUrl };
				} catch {
					return { ...run, inputUrl: null };
				}
			})
		);

		return Response.json({ runs: runsWithInput });
	} catch (err) {
		console.error("Apify history error:", err);
		return Response.json({ error: "Failed to fetch run history" }, { status: 500 });
	}
}
