"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, ChefHat, Eye, EyeOff, Leaf, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeError, isApiError } from "@/lib/api-client";
import { loginSchema, type LoginInput } from "@/lib/auth";
import { safeNextPath } from "@/lib/query-client";

const nextPath = () => safeNextPath(new URLSearchParams(window.location.search).get("next"));

const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true";
/** Reviewer accounts from the assignment brief. They only fill the form. */
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@test.com" },
  { label: "Kitchen", email: "kitchen@test.com" },
  { label: "Dispatch", email: "dispatch@test.com" },
  { label: "Driver", email: "driver@test.com" },
] as const;
const DEMO_PASSWORD = "Test@1234";

const FACTS = [
  { icon: CalendarClock, text: "Orders lock at the kitchen cut-off, and prices freeze with them." },
  { icon: ChefHat, text: "Every dish is cooked as prep units, tracked against its kitchen-ready time." },
  { icon: Truck, text: "Drops are grouped by company, address and delivery time." },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (status === "authenticated") router.replace(nextPath());
  }, [router, status]);

  async function onSubmit(input: LoginInput) {
    setFormError(null);
    try {
      await login(input);
      router.replace(nextPath());
    } catch (error) {
      setFormError(
        isApiError(error, 401) || isApiError(error, 400) ? "Email or password is incorrect." : describeError(error, "Could not sign in. Please try again."),
      );
    }
  }

  function fillDemo(email: string) {
    setFormError(null);
    setValue("email", email, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
  }

  return (
    <main className="grid min-h-screen bg-background md:grid-cols-[minmax(0,1fr)_minmax(26rem,0.8fr)]">
      <section className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex lg:p-14">
        <div className="flex items-center gap-2.5 text-lg font-semibold text-sidebar-accent-foreground">
          <span className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="size-5" />
          </span>
          Fernleaf Kitchen
        </div>
        <div className="max-w-md">
          <p className="text-3xl leading-tight font-semibold text-sidebar-accent-foreground">
            Kitchen operations for corporate meal programs
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {FACTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-accent text-sidebar-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/60">Staff access only. Every action is checked on the server.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 font-semibold md:hidden">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </span>
            Fernleaf Kitchen
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use your staff account.</p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="h-10"
                  {...register("email")}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs text-danger">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className="h-10 pr-10"
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-danger">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <FormErrorAlert messages={formError ? [formError] : []} />

              <Button type="submit" size="lg" className="h-10 w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>

          {SHOW_DEMO_ACCOUNTS && (
            <div className="mt-6">
              <p className="label-caps text-muted-foreground">Reviewer accounts</p>
              <p className="mt-1 text-xs text-muted-foreground">Fills the form; press Sign in to continue.</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button key={account.email} type="button" variant="outline" size="sm" onClick={() => fillDemo(account.email)}>
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
