import { NextRequest } from "next/server";
import { client } from "../../apify";

export async function GET(request: NextRequest) {
	const datasetId = request.nextUrl.searchParams.get("datasetId");

	if (!datasetId || datasetId.trim() === "") {
		return Response.json({ error: "datasetId is required" }, { status: 400 });
	}

	try {
		const { items } = await client.dataset(datasetId).listItems();

		const filtered = items.filter((item) => {
			const likes = parseInt(String((item as Record<string, unknown>).likesCount ?? "0"), 10);
			return likes > 1;
		});

		return Response.json({ items: filtered });
	} catch (err) {
		console.error("Apify dataset error:", err);
		return Response.json({ error: "Failed to fetch dataset" }, { status: 500 });
	}
}
