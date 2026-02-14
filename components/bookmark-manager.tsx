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
  const [authLoading, setAuthLoading] = useState<"signup" | "login" | null>(null);

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

  const signInWithGoogle = async (mode: "signup" | "login") => {
    setError(null);
    setAuthLoading(mode);

    const callbackUrl = `${window.location.origin}/auth/callback`;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams:
          mode === "signup"
            ? {
                prompt: "consent",
                access_type: "offline"
              }
            : {
                prompt: "select_account"
              }
      }
    });

    setAuthLoading(null);

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
      <section className="relative rounded-3xl border border-slate-300/80 bg-slate-50/90 p-6 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.5)] backdrop-blur md:p-8 lg:h-full">
        <h2 className="font-display text-2xl font-semibold text-slate-900">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          Use Google OAuth to create a new account or log in to an existing one.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-300 bg-slate-100 p-1.5">
          <button
            type="button"
            disabled={authLoading !== null}
            onClick={() => void signInWithGoogle("signup")}
            className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLoading === "signup" ? "Redirecting..." : "Sign up"}
          </button>
          <button
            type="button"
            disabled={authLoading !== null}
            onClick={() => void signInWithGoogle("login")}
            className="rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLoading === "login" ? "Redirecting..." : "Log in"}
          </button>
        </div>

        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="relative rounded-3xl border border-slate-300/80 bg-slate-50/90 p-6 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.5)] backdrop-blur md:p-8 lg:h-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">Your bookmarks</h2>
          <p className="mt-1 text-sm text-slate-500">Private and synced in real time.</p>
        </div>
        <button
          type="button"
          disabled={signingOut}
          onClick={handleSignOut}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <form onSubmit={handleAdd} className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bookmark title"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
        />
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Adding..." : "Add bookmark"}
        </button>
      </form>

      {error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <ul className="space-y-3">
        {bookmarks.map((bookmark) => (
          <li
            key={bookmark.id}
            className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-cyan-200 hover:shadow-[0_16px_35px_-24px_rgba(6,182,212,0.6)]"
          >
            <div className="min-w-0 flex-1">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-semibold text-slate-900 underline-offset-4 group-hover:underline"
                title={bookmark.title}
              >
                {bookmark.title}
              </a>
              <p className="mt-1 truncate text-xs text-slate-500">{bookmark.url}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(bookmark.id)}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {bookmarks.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No bookmarks yet. Add your first link to start your library.
        </p>
      ) : null}
    </section>
  );
}