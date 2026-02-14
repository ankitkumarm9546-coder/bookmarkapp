import { BookmarkManager } from "@/components/bookmark-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isAuthenticated = Boolean(session);

  return (
    <main className="relative mx-auto w-full max-w-7xl px-6 py-8 md:px-10 md:py-10">
      <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" aria-hidden />
      <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden />

      {!isAuthenticated ? (
        <div className="relative grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
            <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Smart Bookmark App
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
              Save your important links. Access them anywhere. Instantly.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-600 md:text-lg">
              Your private bookmark manager with realtime sync across tabs.
            </p>

            <ul className="mt-8 space-y-3 text-slate-700">
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Private bookmarks, visible only to you</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Realtime updates</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Save URL + title in seconds</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Secure Google OAuth login only</li>
            </ul>
          </section>

          <BookmarkManager isAuthenticated={false} userId={null} userEmail={null} />
        </div>
      ) : (
        <BookmarkManager
          isAuthenticated
          userId={session?.user.id ?? null}
          userEmail={session?.user.email ?? null}
        />
      )}
    </main>
  );
}