"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, BookOpen, RefreshCw } from "lucide-react"
import { SalePriceBlock, SaleTimer } from "@/components/courses/course-sales"

interface SaleData {
  _id: string
  amount: number
  saleTime: string
  expiryTime?: string
  notes?: string
}

interface EnrollmentSectionProps {
  courseId: string
  courseName: string
  price: number
  isEnrolled: boolean
  hasVideos: boolean
  firstVideoId?: string
  sale?: SaleData | null // Pass sale as prop for course-specific sale
}

export function EnrollmentSection({
  courseId,
  courseName,
  price,
  isEnrolled,
  hasVideos,
  firstVideoId,
  sale,
}: EnrollmentSectionProps) {
  const { data: session } = useSession()
  const [isEnrolling, setIsEnrolling] = useState(false)
  const router = useRouter()

  const handleFreeEnrollment = async () => {
    if (!session?.user) {
      toast.warning("Authentication required : Please sign in to enroll in this course.")
      router.push("/role")
      return
    }

    if (session?.user.role !== "student") {
      toast.error("Access denied : Only students can enroll in courses. Please sign in with a student account.")
      return
    }

    setIsEnrolling(true)

    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to enroll in course")
      }

      toast.success("Enrollment Successful! 🎉 You have successfully enrolled in this course. Start learning now!")

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

  const handlePaidEnrollment = () => {
    router.push(
      `/payment-checkout?courseId=${encodeURIComponent(courseId)}&courseName=${encodeURIComponent(
        courseName
      )}&price=${sale ? sale.amount : price}`
    )
  }

  const handleRefundRequest = () => {
    router.push(
      `/request-refund?courseId=${encodeURIComponent(courseId)}&courseName=${encodeURIComponent(courseName)}&price=${sale ? sale.amount : price}&studentId=${session?.user?.id}`
    )
  }

  if (isEnrolled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span className="font-medium">You&apos;re enrolled in this course</span>
        </div>
        {hasVideos && firstVideoId ? (
          <Link href={`/courses/${courseId}/learn/${firstVideoId}`}>
            <Button className="w-full" size="lg">
              <BookOpen className="mr-2 h-4 w-4" /> Continue Learning
            </Button>
          </Link>
        ) : (
          <Button className="w-full" size="lg" disabled>
            <BookOpen className="mr-2 h-4 w-4" /> No videos available yet
          </Button>
        )}
        
        {/* Refund button - only show for enrolled students */}
        {session?.user?.role === "student" && (
          <Button 
            onClick={handleRefundRequest} 
            variant="outline" 
            className="w-full" 
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Request Refund
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Show sale price and timer only if sale is active for this course */}
      {sale ? (
        <>
          <SalePriceBlock sale={sale} price={price} />
          <SaleTimer expiryTime={sale.expiryTime} />
        </>
      ) : (
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">{price === 0 ? "Free" : `₹${price}`}</div>
          {price === 0 && <p className="text-sm text-muted-foreground">No payment required</p>}
        </div>
      )}

      {session?.user ? (
        (sale ? sale.amount : price) === 0 ? (
          <Button onClick={handleFreeEnrollment} disabled={isEnrolling} className="w-full" size="lg">
            {isEnrolling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enrolling...
              </>
            ) : (
              "Enroll Now - Free"
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={handlePaidEnrollment}
              disabled={isEnrolling}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting...
                </>
              ) : (
                <>Buy Now - ₹{sale ? sale.amount : price}</>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">Secure payment via Razorpay</p>
          </div>
        )
      ) : (
        <Link href="/role">
          <Button className="w-full" size="lg">
            Sign in to Enroll
          </Button>
        </Link>
      )}

      <p className="text-sm text-center text-muted-foreground">30-day money-back guarantee</p>
    </div>
  )
}