"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ShieldCheck } from "lucide-react";
import { adminValidationSchema } from "@/models/admin";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { z } from "zod";

// Extend schema with confirm password
const signUpSchema = adminValidationSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function AdminSignUp() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if admin already exists
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/auth/admin-exists");
        const data = await response.json();

        if (data.exists) {
          setAdminExists(true);
          toast.warning(
            "Admin Already Exists: Only one admin account is allowed in the system."
          );
          router.push("/admin/signin");
        }
      } catch (error) {
        console.error("Failed to check admin status:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdmin();
  }, [router, toast]);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");

  async function onSubmit(data: SignUpFormValues) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: "admin",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to register");
      }

      toast.success(
        "Admin account created successfully. Please check your email to verify your account."
      );

      router.push("/admin/signin");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isChecking) {
    return (
      <div className="container flex items-center justify-center py-12">
        <Card className="w-full max-w-md text-center p-6">
          <CardContent>
            <p>Checking admin status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="container flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldCheck className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl">Admin Already Exists</CardTitle>
            <CardDescription>
              Only one admin account is allowed in the system.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/admin/signin">
              <Button>Go to Admin Sign In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="w-12 h-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-2xl">Create Admin Account</CardTitle>
          <CardDescription>
            Set up the administrator account for the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Admin Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <PasswordStrengthMeter password={password} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? "Creating admin account..."
                  : "Create Admin Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
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
