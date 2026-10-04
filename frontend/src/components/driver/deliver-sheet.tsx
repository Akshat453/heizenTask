"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { driverApi, type DeliveryDrop, type DriverDrop } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { driverKeys } from "./queries";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type Props = { drop: DriverDrop; onClose: () => void; onDelivered: (result: DeliveryDrop) => void };

/** Note and photo are both optional. The browser checks type/size for fast feedback; the server re-validates. */
export function DeliverSheet({ drop, onClose, onDelivered }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Release the preview object URL when it changes or the sheet closes.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const deliver = useMutation({
    mutationFn: () => driverApi.deliver(drop.id, { note, photo }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: driverKeys.today });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDelivered(result);
    },
    onError: (error) => {
      if (isApiError(error, 409)) {
        toast.error(CONFLICT_MESSAGE, { description: error.message });
        void queryClient.invalidateQueries({ queryKey: driverKeys.today });
        onClose();
      }
    },
  });

  const choose = (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setPhotoError("Use a JPEG, PNG or WebP photo.");
    if (file.size > MAX_BYTES) return setPhotoError("That photo is larger than 5 MB. Take a smaller one.");
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };
  const remove = () => {
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const failed = deliver.isError && !isApiError(deliver.error, 409);
  return (
    <Sheet open onOpenChange={(open) => !open && !deliver.isPending && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-[480px] gap-0 overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader>
          <SheetTitle>Mark delivered</SheetTitle>
          <SheetDescription>{drop.company.name} · {drop.addressLabelSnapshot}. Note and photo are optional.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deliver-note">Note (optional)</Label>
            <Textarea id="deliver-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Left with reception, signed by Priya" className="min-h-20 text-base" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Photo (optional)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              aria-label="Choose a delivery photo"
              onChange={(e) => choose(e.target.files?.[0])}
            />
            {preview ? (
              <div className="relative h-40 w-full overflow-hidden rounded-lg border">
                <Image src={preview} alt="Delivery photo preview" fill unoptimized className="object-cover" />
                <Button variant="secondary" size="icon-lg" className="absolute top-2 right-2 size-11" aria-label="Remove photo" onClick={remove}>
                  <X />
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="h-12 text-base" onClick={() => fileRef.current?.click()}>
                <Camera data-icon="inline-start" /> Take or choose a photo
              </Button>
            )}
            {photoError && <p className="text-sm text-danger">{photoError}</p>}
          </div>
          {failed && (
            <FormErrorAlert
              messages={[
                isApiError(deliver.error, 503) && photo
                  ? "Photo upload isn't available right now. You can deliver with a note only."
                  : describeError(deliver.error, "Could not mark delivered. Your note and photo are kept; try again."),
              ]}
            />
          )}
          <Button className="h-14 w-full text-base" disabled={deliver.isPending} onClick={() => deliver.mutate()}>
            {deliver.isPending ? (photo ? "Uploading photo…" : "Marking delivered…") : failed ? "Retry" : "Mark delivered"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
