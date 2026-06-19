/**
 * ProfileForm — interactive client component for profile viewing + editing.
 *
 * Client component that:
 * - Fetches current profile from NestJS GET /api/users/me (with Bearer token from session)
 * - Displays CEFR badge, XP, member-since date
 * - Displays LevelBadge, XpProgressBar, and AchievementGrid (GAME-02/03/04, 07-06)
 * - Avatar: boring-avatars initials default → Google image → uploaded avatarUrl
 * - Editable name with dirty-gated "Save changes" button
 * - Avatar upload flow: file input → POST upload-url → PUT file → PATCH /users/me
 * - Success toast on save; error message on upload failure
 *
 * Session is passed from the Server Component since useSession isn't available
 * without a SessionProvider wrapper.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Avatar from "boring-avatars";
import { Loader2, Lock, Pencil } from "lucide-react";
import { CefrBadge } from "@/components/cefr-badge";
import { LevelBadge } from "@/components/gamification/level-badge";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { AchievementGrid } from "@/components/gamification/achievement-grid";
import type { Session } from "next-auth";
import type { UserProfileDto } from "@repo/shared";

interface ProfileFormProps {
  session: Session;
  apiUrl: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatXp(xp: number): string {
  return `${xp.toLocaleString("en-US")} XP`;
}

// ─── Achievement shape from API ───────────────────────────────────────────────

interface AchievementWithEarnedAt {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  xpReward: number;
  earnedAt: string | null; // ISO date string or null
}

// ─── ProfileForm ──────────────────────────────────────────────────────────────

export function ProfileForm({ session, apiUrl: _apiUrl }: ProfileFormProps) {
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gamification state
  const [achievements, setAchievements] = useState<AchievementWithEarnedAt[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  // Fetch profile from NestJS via a relay approach
  // We use a Next.js API route to forward the request with the session token
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/me");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = (await res.json()) as UserProfileDto;
      setProfile(data);
      setName(data.name ?? "");
      setSavedName(data.name ?? "");
    } catch {
      // Fallback: use session data if API unavailable
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch achievements from /api/profile/achievements
  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const data = (await res.json()) as AchievementWithEarnedAt[];
      setAchievements(data);
    } catch {
      setAchievements([]); // empty grid shows "Complete lessons..." empty state
    } finally {
      setAchievementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
    void fetchAchievements();
  }, [fetchProfile, fetchAchievements]);

  const isDirty = name !== savedName;

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = (await res.json()) as UserProfileDto;
      setProfile(updated);
      setSavedName(updated.name ?? "");
      setName(updated.name ?? "");
      setToast("Profile updated");
      setTimeout(() => setToast(""), 4000);
    } catch {
      // WR-09: Show an error toast so the user knows the save failed.
      // Previously setToast('') cleared any existing toast without giving feedback.
      setToast("Failed to save profile. Please try again.");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    // Client-side pre-validation (mirrors D-08 server-side validation)
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      setUploadError("Upload failed. Max 2 MB, JPEG/PNG/WebP only.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("Upload failed. Max 2 MB, JPEG/PNG/WebP only.");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Get presigned URL from NestJS via relay
      const urlRes = await fetch("/api/profile/avatar-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!urlRes.ok) {
        setUploadError("Upload failed. Max 2 MB, JPEG/PNG/WebP only.");
        return;
      }
      const { uploadUrl, key } = (await urlRes.json()) as {
        uploadUrl: string;
        key: string;
      };

      // Step 2: PUT file directly to presigned URL (MinIO/R2)
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        setUploadError("Upload failed. Max 2 MB, JPEG/PNG/WebP only.");
        return;
      }

      // Step 3: PATCH /users/me with the storage key
      const patchRes = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarKey: key }),
      });
      if (!patchRes.ok) {
        setUploadError("Upload failed. Max 2 MB, JPEG/PNG/WebP only.");
        return;
      }
      const updated = (await patchRes.json()) as UserProfileDto;
      setProfile(updated);
      setToast("Profile updated");
      setTimeout(() => setToast(""), 4000);
    } catch {
      setUploadError("Upload failed. Max 2 MB, JPEG/PNG/WebP only.");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Avatar display precedence: avatarUrl (upload key) > image (Google) > boring-avatars
  // avatarUrl is a storage key — construct full URL via MinIO/R2 public bucket
  const minioPublicUrl =
    process.env["NEXT_PUBLIC_MINIO_PUBLIC_URL"] ?? "http://localhost:9000/english-learning";
  const avatarSrc = profile?.avatarUrl
    ? `${minioPublicUrl}/${profile.avatarUrl}`
    : profile?.image ?? null;

  const displayName = profile?.name ?? session.user.name ?? "User";
  const currentLevel = profile?.level ?? 1;
  const currentXpTotal = profile?.xpTotal ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* ── Avatar column (left, 1/3) ── */}
          <div className="flex flex-col items-center gap-3 md:w-1/3">
            {/* Avatar + LevelBadge overlay */}
            <div className="relative">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={`${displayName}'s avatar`}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
                  unoptimized
                />
              ) : (
                // boring-avatars v2: "beam" variant provides deterministic avatar from name (D-07)
                <Avatar
                  name={displayName}
                  variant="beam"
                  size={96}
                  colors={["#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444"]}
                />
              )}

              {/* Change photo button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Change profile photo"
                className="absolute bottom-0 right-0 flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Level badge below avatar — UI-SPEC Screen 5 */}
            <LevelBadge level={currentLevel} size="md" />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileChange}
              aria-hidden="true"
            />

            {/* Upload error */}
            {uploadError && (
              <p className="text-center text-sm text-destructive">{uploadError}</p>
            )}

            {/* Change photo text button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Change photo"}
            </button>
          </div>

          {/* ── Details column (right, 2/3) ── */}
          <div className="flex flex-1 flex-col gap-5">
            {/* CEFR badge + XP row */}
            <div className="flex flex-wrap items-center gap-3">
              <CefrBadge level={profile?.cefrLevel ?? session.user.cefrLevel ?? "B1"} />
              <span className="text-sm text-muted-foreground">
                {profile ? formatXp(profile.xpTotal) : "0 XP"}
              </span>
            </div>

            {/* XP Progress bar — UI-SPEC Screen 5 (below CEFR badge) */}
            <XpProgressBar xpTotal={currentXpTotal} level={currentLevel} />

            {/* Member since */}
            <p className="text-[0.875rem] text-muted-foreground">
              Member since{" "}
              {profile ? formatDate(profile.createdAt) : "—"}
            </p>

            {/* Display name field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="profile-name"
                className="text-sm font-semibold text-foreground"
              >
                Display name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Your display name"
              />
            </div>

            {/* Email field (read-only) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="profile-email"
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
              >
                Email
                <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile?.email ?? session.user.email ?? ""}
                disabled
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm text-muted-foreground opacity-60 cursor-not-allowed"
                aria-label="Email cannot be changed"
              />
            </div>

            {/* Save button */}
            <div className="flex">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Achievements section — UI-SPEC Screen 5 ── */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mt-8">
        <h2 className="mb-5 text-xl font-semibold text-foreground">Achievements</h2>
        {achievementsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AchievementGrid achievements={achievements} />
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
