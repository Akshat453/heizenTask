"use client";

import { Eye, EyeOff, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SETS = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*-_=+?"];

/** 16 random characters with at least one of each class the server's password policy requires. */
export function generatePassword(length = 16): string {
  const random = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const all = SETS.join("");
  const chars = SETS.map((set) => set[random(set.length)]);
  while (chars.length < length) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function PasswordInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" className="num pr-10" value={value} onChange={(e) => onChange(e.target.value)} />
        <Button type="button" size="icon-sm" variant="ghost" className="absolute top-1/2 right-1 -translate-y-1/2" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      <Button type="button" variant="outline" onClick={() => { onChange(generatePassword()); setVisible(true); }}>
        <Wand2 data-icon="inline-start" /> Generate
      </Button>
    </div>
  );
}
