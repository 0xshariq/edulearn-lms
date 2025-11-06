"use client";

import type React from "react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "../ui/label";
import { Slider } from "@/components/ui/slider";
import { reviewValidationSchema } from "@/models/review";

interface ReviewData {
  _id: string;
  rating: number;
  comment: string;
  student: {
    _id: string;
    name: string;
  };
  course: string;
  createdAt: Date | string;
}

interface CourseReviewsProps {
  courseId: string;
  courseName: string;
  initialReviews: ReviewData[];
  isEnrolled: boolean;
}

export function CourseReviews({
  courseId,
  initialReviews,
  isEnrolled,
}: CourseReviewsProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Always fetch latest reviews after submit
  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch reviews"
      );
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      toast.warning(
        "Authentication required : You must be signed in to leave a review."
      );
      return;
    }

    if (!isEnrolled) {
      toast.warning(
        "Enrollment required : You must be enrolled in this course to leave a review."
      );
      return;
    }

    // Optional: client-side validation using Zod schema
    const validation = reviewValidationSchema.safeParse({
      rating,
      comment,
      course: courseId,
      student: session?.user?.id || "",
    });
    if (!validation.success) {
      toast.error(
        validation.error.errors[0]?.message || "Invalid review data."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment,
          courseId,
        }),
      });

      if (!response.ok) {
        let errorData: { message?: string } = {};
        try {
          errorData = await response.json();
        } catch {}
        throw new Error(errorData.message || "Failed to submit review");
      }

      // Always fetch latest reviews after submit
      await fetchReviews();
      setComment("");
      setRating(5);

      toast.success("Review submitted successfully!");
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit your review. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use a slider for rating instead of stars
  const RatingSlider = ({
    value,
    onChange,
    readonly = false,
  }: {
    value: number;
    onChange?: (rating: number) => void;
    readonly?: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <Slider
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={(val) => !readonly && onChange && onChange(val[0])}
        disabled={readonly}
        className="w-32"
      />
      <span className="text-sm font-medium">{value}/5</span>
    </div>
  );

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Student Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <RatingSlider value={Math.round(averageRating)} readonly />
            <span className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} ({reviews.length} review
              {reviews.length !== 1 ? "s" : ""})
            </span>
          </div>
        )}
      </div>

      {isEnrolled && session?.user && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-2">
                  Your Rating
                </Label>
                <RatingSlider value={rating} onChange={setRating} />
              </div>

              <div>
                <Label
                  htmlFor="comment"
                  className="block text-sm font-medium mb-2"
                >
                  Your Review
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience with this course..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review._id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={`/placeholder.svg?height=40&width=40&text=${review.student.name.charAt(
                        0
                      )}`}
                    />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{review.student.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      <RatingSlider value={review.rating} readonly />
                    </div>
                    <p className="text-sm leading-relaxed">{review.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h4 className="text-lg font-medium mb-2">No reviews yet</h4>
            <p className="text-muted-foreground">
              Be the first to review this course!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
