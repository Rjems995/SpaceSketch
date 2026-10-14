"use client";
import { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import { supabase } from "@/lib/supabase";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
export default function ResetPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string }>();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={handleSubmit(async ({ password }) => {
          if (!supabase) {
            setMessage("Supabase is not configured.");
            return;
          }
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password });
          setMessage(
            error
              ? error.message
              : "Password updated. You can return to the studio.",
          );
          setBusy(false);
        })}
      >
        <Link href="/"><BrandLogo large /></Link>
        <h2>Set a new password</h2>
        <label>
          New password
          <input
            type="password"
            required
            minLength={8}
            {...register("password", {
              required: "Enter a new password.",
              minLength: { value: 8, message: "Use at least 8 characters." },
            })}
          />
        </label>
        {errors.password && <p role="alert">{errors.password.message}</p>}
        <Button className="primary" disabled={busy}>
          Update password
        </Button>
        <p role="status">{message}</p>
        <Link href="/">Return to SpaceSketch</Link>
      </form>
    </div>
  );
}
