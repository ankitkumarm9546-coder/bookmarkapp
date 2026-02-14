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
  userEmail: string | null;
};

export function BookmarkManager({ isAuthenticated, userId, userEmail }: BookmarkManagerProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "az">("latest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "login">("login");
  const [authLoading, setAuthLoading] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const profileInitial = (userEmail?.trim()?.charAt(0) ?? "U").toUpperCase();

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
    setAuthLoading(true);

    const callbackUrl = `${window.location.origin}/auth/callback`;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams:
          authMode === "signup"
            ? {
                prompt: "consent",
                access_type: "offline"
              }
            : {
                prompt: "select_account"
              }
      }
    });

    setAuthLoading(false);

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

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setError("URL must start with http:// or https://");
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase.from("bookmarks").insert({
      title: title.trim(),
      url: parsedUrl.toString()
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    setDeleteLoading(true);

    const { error: deleteError } = await supabase.from("bookmarks").delete().eq("id", deleteTarget.id);
    setDeleteLoading(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setBookmarks((current) => current.filter((bookmark) => bookmark.id !== deleteTarget.id));
    setDeleteTarget(null);
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

  const sortedBookmarks = [...bookmarks].sort((a, b) => {
    if (sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
    if (sortBy === "az") return a.title.localeCompare(b.title);
    return b.created_at.localeCompare(a.created_at);
  });

  const filteredBookmarks = sortedBookmarks.filter((bookmark) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return bookmark.title.toLowerCase().includes(query) || bookmark.url.toLowerCase().includes(query);
  });

  if (!isAuthenticated) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-9">
        <h2 className="font-display text-3xl font-semibold text-slate-900">{authMode === "signup" ? "Welcome to Smart Bookmark" : "Welcome back"}</h2>
        <p className="mt-2 text-slate-600">{authMode === "signup" ? "Create your account and start saving links instantly." : "Save your important links. Access them anywhere. Instantly."}</p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              authMode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("login")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              authMode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            Log in
          </button>
        </div>

        <button
          type="button"
          disabled={authLoading}
          onClick={() => void signInWithGoogle()}
          className="mt-5 w-full rounded-xl border border-sky-200 bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {authLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <p className="mt-4 text-xs text-slate-500">No password required. Secure sign-in with Google OAuth only.</p>

        {error ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <h3 className="font-display text-2xl font-semibold text-slate-900">Smart Bookmark</h3>
          <p className="text-sm text-slate-600">Your private bookmark manager</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="group relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-sm font-semibold text-sky-800">
              {profileInitial}
            </div>
            <span className="pointer-events-none absolute right-0 top-12 hidden w-max rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm group-hover:block">
              {userEmail ?? "No email"}
            </span>
          </div>
          <button
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-display text-2xl font-semibold text-slate-900">Add a new bookmark</h3>
            <p className="mt-2 text-sm text-slate-600">Paste a URL and give it a title.</p>
          </div>

          <form onSubmit={handleAdd} className="mt-5 space-y-3">
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Supabase Docs"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Bookmark"}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-500"></p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-semibold text-slate-900">Your bookmarks</h3>
              <p className="mt-1 text-sm text-slate-600">Synced instantly.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bookmarks..."
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-sky-500"
              />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "latest" | "oldest" | "az")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none"
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="az">A-Z</option>
              </select>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <ul className="mt-5 space-y-3">
            {filteredBookmarks.map((bookmark) => (
              <li
                key={bookmark.id}
                className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-semibold text-slate-900 hover:text-sky-700"
                    title={bookmark.title}
                  >
                    {bookmark.title}
                  </a>
                  <p className="mt-1 truncate text-xs text-slate-500">{bookmark.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(bookmark)}
                    className="relative z-20 inline-flex h-11 w-24 shrink-0 cursor-pointer items-center justify-center rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {filteredBookmarks.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No bookmarks yet. Start by adding your first link. Your bookmarks are private and sync in realtime.
            </p>
          ) : null}
        </article>
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 px-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Delete</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">"{deleteTarget.title}"</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => void handleDelete()}
                className="cursor-pointer rounded-md border border-red-300 bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
