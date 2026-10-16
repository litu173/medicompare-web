"use client";

import { useActionState, useState } from "react";
import { Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadPhoto } from "@/app/actions/admin";

/** Pick or take a photo of the actual pack, preview it, then save. */
export function PhotoUpload({ medicineId, hasPhoto }: { medicineId: number; hasPhoto: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [state, action, pending] = useActionState(uploadPhoto, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="medicineId" value={medicineId} />
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-4 hover:border-brand-600 hover:bg-gray-50">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
          <img src={preview} alt="New photo preview" className="size-20 rounded-lg object-contain" />
        ) : (
          <Camera className="size-8 text-brand-700" />
        )}
        <span className="text-sm">
          <b>{hasPhoto ? "Replace photo" : "Add photo"}</b>
          <br />
          <span className="text-gray-700">
            Photograph this exact product&apos;s pack. JPG, PNG or WEBP, up to 4 MB.
          </span>
        </span>
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>
      {state?.error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="size-4" /> {state.error}
        </p>
      )}
      {state?.ok && !pending && (
        <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          <CheckCircle2 className="size-4" /> {state.ok}
        </p>
      )}
      <button
        disabled={pending || !preview}
        className="h-11 w-full rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-600"
      >
        {pending ? "Uploading…" : "Save photo"}
      </button>
    </form>
  );
}
