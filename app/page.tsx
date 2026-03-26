import FacebookCommentsForm from "./components/FacebookCommentsForm";

export default function Home() {
	return (
		<div className='flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
			<main className='flex flex-1 w-full max-w-3xl flex-col items-start gap-8 py-20 px-8'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50'>Facebook Comments Scraper</h1>
					<p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
						Paste a Facebook post URL to fetch its comments via Apify.
					</p>
				</div>
				<FacebookCommentsForm />
			</main>
		</div>
	);
}
