import { NextRequest } from "next/server";
import { getDatasetItems } from "../../apify";

export async function GET(request: NextRequest) {
	const datasetId = request.nextUrl.searchParams.get("datasetId");

	if (!datasetId || datasetId.trim() === "") {
		return Response.json({ error: "datasetId is required" }, { status: 400 });
	}

	try {
		const items = await getDatasetItems(datasetId);

		const filtered = items.filter((item) => {
			const likes = parseInt(String((item as Record<string, unknown>).likesCount ?? "0"), 10);
			return likes > 1;
		});

		return Response.json({ items: filtered });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("Apify dataset error:", message);
		return Response.json({ error: `Failed to fetch dataset: ${message}` }, { status: 500 });
	}
}
