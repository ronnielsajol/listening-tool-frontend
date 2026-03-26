import { NextRequest } from "next/server";
import { client } from "../../apify";

export async function GET(request: NextRequest) {
	const runId = request.nextUrl.searchParams.get("runId");

	if (!runId || typeof runId !== "string" || runId.trim() === "") {
		return Response.json({ error: "runId is required" }, { status: 400 });
	}

	try {
		const run = await client.run(runId).get();

		if (!run) {
			return Response.json({ error: "Run not found" }, { status: 404 });
		}

		if (run.status === "RUNNING" || run.status === "READY") {
			return Response.json({ status: run.status });
		}

		if (run.status === "FAILED" || run.status === "ABORTED" || run.status === "TIMED-OUT") {
			return Response.json({ status: run.status, error: "Actor run did not succeed" }, { status: 500 });
		}

		// SUCCEEDED — fetch and filter the dataset
		const { items } = await client.dataset(run.defaultDatasetId).listItems();

		const filtered = items.filter((item) => {
			const likes = parseInt(String((item as Record<string, unknown>).likesCount ?? "0"), 10);
			return likes > 1;
		});

		return Response.json({ status: run.status, items: filtered });
	} catch (err) {
		console.error("Apify status check error:", err);
		return Response.json({ error: "Failed to check run status" }, { status: 500 });
	}
}
