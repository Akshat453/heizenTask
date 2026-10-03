"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { loginSchema, type LoginInput } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  async function onSubmit(input: LoginInput) {
    setFormError(null);
    try {
      await login(input);
      router.replace("/");
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    }
  }

  return (
    <main className="grid min-h-screen bg-stone-100 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.72fr)]">
      <section className="hidden bg-emerald-950 px-12 py-14 text-emerald-50 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] uppercase">
          <span className="grid size-9 place-items-center rounded-md bg-lime-300 text-emerald-950">
            H
          </span>
          FernLeaf Kitchen
        </div>
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-medium text-lime-300">
            Catering, coordinated.
          </p>
          <h1 className="text-5xl leading-[1.08] font-semibold tracking-tight">
            One place for every operational handoff.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-emerald-100/75">
            Secure staff access for kitchen, dispatch, drivers, and
            administrators.
          </p>
        </div>
        <p className="text-sm text-emerald-100/55">Heizen Engineering Demo</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-md bg-emerald-950 font-semibold text-lime-300">
              H
            </span>
            <span className="text-sm font-semibold tracking-[0.16em] uppercase">
              Fernleaf Kitchen
            </span>
          </div>

          <div className="mb-8">
            <div className="mb-5 grid size-11 place-items-center rounded-lg border bg-white text-emerald-900 shadow-sm">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sign in with your staff account to continue.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm outline-none transition focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15"
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                className="h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm outline-none transition focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15"
                {...register("password")}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
              >
                {formError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full bg-emerald-950 text-white hover:bg-emerald-900"
              disabled={isSubmitting || status === "loading"}
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
              {!isSubmitting && <ArrowRight data-icon="inline-end" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            Access is limited to authorised Heizen staff.
          </p>
        </div>
      </section>
    </main>
  );
}
