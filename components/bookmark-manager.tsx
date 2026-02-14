"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  created_at: string;
};

type BookmarkManagerProps = {
  isAuthenticated: boolean;
  userId: string | null;
};

export function BookmarkManager({ isAuthenticated, userId }: BookmarkManagerProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const loadBookmarks = useCallback(async () => {
    if (!userId) return;

    const { data, error: fetchError } = await supabase
      .from("bookmarks")
      .select("id,title,url,created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setBookmarks(data ?? []);
  }, [supabase, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    void loadBookmarks();

    const channel = supabase
      .channel(`bookmarks-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks"
        },
        () => {
          void loadBookmarks();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("Realtime connection failed. Using tab sync fallback.");
        }
      });

    let tabChannel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      tabChannel = new BroadcastChannel(`bookmarks-sync-${userId}`);
      tabChannel.onmessage = () => {
        void loadBookmarks();
      };
    }

    return () => {
      void channel.unsubscribe();
      tabChannel?.close();
    };
  }, [isAuthenticated, loadBookmarks, supabase, userId]);

  const notifyTabs = () => {
    if (!userId || typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const tabChannel = new BroadcastChannel(`bookmarks-sync-${userId}`);
    tabChannel.postMessage({ type: "bookmarks-changed" });
    tabChannel.close();
  };

  const signInWithGoogle = async () => {
    setError(null);

    const callbackUrl = `${window.location.origin}/auth/callback`;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl
      }
    });

    if (signInError) {
      setError(signInError.message);
    }
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !url.trim()) {
      setError("Title and URL are required.");
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase.from("bookmarks").insert({
      title: title.trim(),
      url: url.trim()
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle("");
    setUrl("");
    void loadBookmarks();
    notifyTabs();
  };

  const handleDelete = async (id: string) => {
    setError(null);

    const { error: deleteError } = await supabase.from("bookmarks").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setBookmarks((current) => current.filter((bookmark) => bookmark.id !== id));
    notifyTabs();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut();

    setSigningOut(false);

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    router.refresh();
  };

  if (!isAuthenticated) {
    return (
      <section className="mt-8 rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
        <p className="mb-4 text-slate-700">Sign in with Google to manage your private bookmarks.</p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Continue with Google
        </button>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Bookmarks</h2>
        <button
          type="button"
          disabled={signingOut}
          onClick={handleSignOut}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <form onSubmit={handleAdd} className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bookmark title"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <ul className="space-y-2">
        {bookmarks.map((bookmark) => (
          <li
            key={bookmark.id}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3"
          >
            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-slate-900 underline"
              title={bookmark.title}
            >
              {bookmark.title}
            </a>
            <button
              type="button"
              onClick={() => handleDelete(bookmark.id)}
              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {bookmarks.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No bookmarks yet. Add your first link.</p>
      ) : null}
    </section>
  );
}