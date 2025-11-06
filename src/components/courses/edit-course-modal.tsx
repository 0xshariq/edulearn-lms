"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { Label } from "../ui/label";
import Link from "next/link";

interface EditCourseModalProps {
  course: {
    _id?: string;
    name: string;
    description: string;
    syllabus?: string;
    price: number;
    duration: string;
    imageUrl?: string;
    isPublished?: boolean;
  };
  courseId: string;
}

export function EditCourseModal({ course, courseId }: EditCourseModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: course.name || "",
    description: course.description || "",
    syllabus: course.syllabus || "",
    price: course.price || 0,
    duration: course.duration || "",
    imageUrl: course.imageUrl || "",
    isPublished: course.isPublished || false,
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? Number(value)
          : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update course");
      toast.success("Course updated successfully.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-1 h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[540px] p-0 rounded-2xl shadow-xl border-0 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100"
        style={{
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-bold">Edit Course</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </DialogHeader>
        {/* Custom scrollable area */}
        <div
          className="px-6 pb-6 pt-2"
          style={{
            overflowY: "auto",
            maxHeight: "70vh",
            scrollbarWidth: "thin",
            scrollbarColor: "#a1a1aa #f4f4f5",
          }}
        >
          <style>
            {`
              /* Custom scrollbar for light/dark mode */
              .dark .edit-modal-scroll::-webkit-scrollbar {
                width: 8px;
                background: #18181b;
              }
              .dark .edit-modal-scroll::-webkit-scrollbar-thumb {
                background: #52525b;
                border-radius: 8px;
              }
              .edit-modal-scroll::-webkit-scrollbar {
                width: 8px;
                background: #f4f4f5;
              }
              .edit-modal-scroll::-webkit-scrollbar-thumb {
                background: #a1a1aa;
                border-radius: 8px;
              }
            `}
          </style>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 edit-modal-scroll"
            style={{ maxHeight: "65vh", overflowY: "auto" }}
          >
            <div>
              <Label className="block text-sm font-medium mb-1" htmlFor="name">
                Course Name*
              </Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Course Name"
                required
              />
            </div>
            <div>
              <Label
                className="block text-sm font-medium mb-1"
                htmlFor="description"
              >
                Description*
              </Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Description"
                required
                className="min-h-24"
              />
            </div>
            <div>
              <Label
                className="block text-sm font-medium mb-1"
                htmlFor="syllabus"
              >
                Syllabus
              </Label>
              <Textarea
                id="syllabus"
                name="syllabus"
                value={form.syllabus}
                onChange={handleChange}
                placeholder="Syllabus"
                className="min-h-20"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1" htmlFor="price">
                Price (₹)*
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                value={form.price}
                onChange={handleChange}
                placeholder="Price"
                required
              />
            </div>
            <div>
              <Label
                className="block text-sm font-medium mb-1"
                htmlFor="duration"
              >
                Duration*
              </Label>
              <Input
                id="duration"
                name="duration"
                value={form.duration}
                onChange={handleChange}
                placeholder="Duration"
                required
              />
            </div>
            <div>
              <Label
                className="block text-sm font-medium mb-1"
                htmlFor="imageUrl"
              >
                Image URL
              </Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                value={form.imageUrl}
                onChange={handleChange}
                placeholder="Image URL"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="isPublished"
                name="isPublished"
                type="checkbox"
                checked={form.isPublished}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isPublished" className="text-sm">
                Publish immediately
              </Label>
            </div>
            <Link href={`/courses/${courseId}/coupon`}>
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <Tag className="h-4 w-4" /> Manage Coupon
              </Button>
            </Link>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
