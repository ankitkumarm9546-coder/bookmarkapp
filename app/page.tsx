import { BookmarkManager } from "@/components/bookmark-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <h1 className="text-3xl font-bold">Smart Bookmark App</h1>
      <p className="mt-2 text-slate-700">
        Private, realtime bookmarks using Google OAuth + Supabase.
      </p>

      <BookmarkManager
        isAuthenticated={Boolean(session)}
        userId={session?.user.id ?? null}
      />
    </main>
  );
}
