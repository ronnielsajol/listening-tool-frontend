const APIFY_BASE = "https://api.apify.com/v2";

function headers() {
	return {
		Authorization: `Bearer ${process.env.APIFY_TOKEN}`,
		"Content-Type": "application/json",
	};
}

async function apifyFetch(url: string, init?: RequestInit) {
	const res = await fetch(url, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText);
		throw new Error(`Apify API ${res.status}: ${text}`);
	}
	return res;
}

export const ACTOR_ID = "us5srxAYnsrkgUv2v";

export interface ApifyRun {
	id: string;
	status: string;
	startedAt: string;
	finishedAt?: string;
	defaultDatasetId: string;
	defaultKeyValueStoreId: string;
}

export async function startActorRun(actorId: string, input: unknown): Promise<ApifyRun> {
	const res = await apifyFetch(`${APIFY_BASE}/acts/${actorId}/runs`, {
		method: "POST",
		body: JSON.stringify(input),
	});
	const json = await res.json();
	return json.data as ApifyRun;
}

export async function getRun(runId: string): Promise<ApifyRun> {
	const res = await apifyFetch(`${APIFY_BASE}/actor-runs/${runId}`);
	const json = await res.json();
	return json.data as ApifyRun;
}

export async function listActorRuns(actorId: string, limit = 20): Promise<ApifyRun[]> {
	const res = await apifyFetch(`${APIFY_BASE}/acts/${actorId}/runs?limit=${limit}&desc=1`);
	const json = await res.json();
	return json.data.items as ApifyRun[];
}

export async function getKVRecord(storeId: string, key: string): Promise<unknown> {
	const res = await fetch(`${APIFY_BASE}/key-value-stores/${storeId}/records/${key}`, { headers: headers() });
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`Apify KV ${res.status}`);
	return res.json();
}

export async function getDatasetItems(datasetId: string): Promise<unknown[]> {
	const res = await apifyFetch(`${APIFY_BASE}/datasets/${datasetId}/items`);
	return res.json() as Promise<unknown[]>;
}
