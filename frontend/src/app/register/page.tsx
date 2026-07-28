import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign up — Good Vibes Casino" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
