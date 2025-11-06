"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Define a simple schema for sign-in without relying on the model schema
const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type SignInFormValues = z.infer<typeof signInSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function AdminSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Get error message from URL if present
  const error = searchParams.get("error");

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const password = form.watch("password");

  async function onSubmit(data: SignInFormValues) {
    setIsLoading(true);
    setAuthError(null);

    try {
      const response = await signIn("credentials", {
        email: data.email,
        password: data.password,
        role: "admin",
        redirect: false,
      });

      if (response?.error) {
        setAuthError("Invalid email or password");
      } else {
        toast.success("You have been signed in as admin successfully");
        router.push("/admin/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function onForgotPasswordSubmit(data: ForgotPasswordFormValues) {
    setForgotPasswordLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          role: "admin",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        setForgotPasswordOpen(false);
        forgotPasswordForm.reset();
      } else {
        toast.error(result.error || "Failed to send reset email");
      }
    } catch (error) {
      toast.error(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
      );
    } finally {
      setForgotPasswordLoading(false);
    }
  }

  return (
    <div className="container flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="w-12 h-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-2xl">Admin Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(authError || error) && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {authError ||
                  (error === "CredentialsSignin"
                    ? "Invalid email or password"
                    : "An error occurred")}
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                    <PasswordStrengthMeter password={password} />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <Dialog
            open={forgotPasswordOpen}
            onOpenChange={setForgotPasswordOpen}
          >
            <DialogTrigger asChild>
              <Button variant="link" size="sm">
                Forgot password?
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Enter your email address and we&apos;ll send you a link to
                  reset your password.
                </DialogDescription>
              </DialogHeader>
              <Form {...forgotPasswordForm}>
                <form
                  onSubmit={forgotPasswordForm.handleSubmit(
                    onForgotPasswordSubmit
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="admin@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Link
            href="/role"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Back to role selection
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
