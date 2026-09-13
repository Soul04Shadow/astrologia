"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Profile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import ProfileForm from "@/components/ProfileForm";
import { EditProfileSkeleton } from "@/components/Skeletons";

export default function EditProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { locale } = useI18n();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .getProfile(id)
      .then((p) => {
        setProfile(p);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <EditProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || (locale === "hi" ? "जातक नहीं मिला।" : "Profile not found.")}
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded-lg bg-saffron-600 px-4 py-2 text-xs font-bold text-white hover:bg-saffron-700"
        >
          {locale === "hi" ? "वापस जाएँ" : "Go back"}
        </button>
      </div>
    );
  }

  return (
    <ProfileForm
      mode="edit"
      profileId={id}
      initialData={profile}
      onSuccess={(updated) => {
        router.push(`/profiles/${updated.id}`);
      }}
    />
  );
}
