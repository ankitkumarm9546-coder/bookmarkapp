import { BookmarkManager } from "@/components/bookmark-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isAuthenticated = Boolean(session);

  return (
    <main className="relative mx-auto flex min-h-[100svh] max-w-5xl items-center px-5 py-8 md:px-8 md:py-12">
      <div className="absolute -left-28 top-0 h-64 w-64 rounded-full bg-slate-300/35 blur-3xl" aria-hidden />
      <div className="absolute -right-28 top-24 h-72 w-72 rounded-full bg-slate-400/20 blur-3xl" aria-hidden />

      <div className={isAuthenticated ? "" : "grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch"}>
        <section className="relative overflow-hidden rounded-3xl border border-slate-300/80 bg-slate-50/85 p-7 shadow-[0_35px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur md:p-10">
          <span className="inline-flex rounded-full border border-slate-300 bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
            Smart Bookmark App
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Save links faster. Find them anywhere.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 md:text-base">
            Sign up or log in with Google to manage private bookmarks with instant sync across tabs.
          </p>
        </section>

        <BookmarkManager isAuthenticated={isAuthenticated} userId={session?.user.id ?? null} />
      </div>
    </main>
  );
}
