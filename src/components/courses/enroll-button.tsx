"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface EnrollButtonProps {
  courseId: string
  courseName: string
  price: number
}

export default function EnrollButton({ courseId, courseName, price }: EnrollButtonProps) {
  const [isEnrolling, setIsEnrolling] = useState(false)
  const router = useRouter()

  const handleFreeEnroll = async () => {
    setIsEnrolling(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to enroll in course")
      }

      toast.success("You have successfully enrolled in this course.")

      router.refresh()
    } catch (error) {
      console.error("Error enrolling in course:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to enroll in course. Please try again."
      )
    } finally {
      setIsEnrolling(false)
    }
  }

  const handlePaidEnroll = () => {
    // Redirect to payment checkout page with course details as query params
    router.push(
      `/payment-checkout?courseId=${encodeURIComponent(courseId)}&courseName=${encodeURIComponent(
        courseName
      )}&price=${price}`
    )
  }

  return (
    <Button
      onClick={price === 0 ? handleFreeEnroll : handlePaidEnroll}
      disabled={isEnrolling}
      className="w-full"
    >
      {isEnrolling ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {price === 0 ? "Enrolling..." : "Redirecting..."}
        </>
      ) : (
        price === 0 ? "Enroll Now - Free" : `Buy Now - ₹${price}`
      )}
    </Button>
  )
}