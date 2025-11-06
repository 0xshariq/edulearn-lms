"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, User, Calendar, DollarSign, FileText, Tag, ExternalLink } from "lucide-react";

interface IRefundRequest {
  _id: string;
  courseId: {
    _id: string;
    name: string;
    price: number;
  };
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  reason?: string;
  notes?: string;
  refundReasonCategory: "duplicate" | "not_as_described" | "other";
  requestStatus: "pending" | "accepted" | "rejected";
  processedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  attachments?: string[];
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface RefundRequestsSectionProps {
  initialRequests: IRefundRequest[];
}

export default function RefundRequestsSection({ initialRequests }: RefundRequestsSectionProps) {
  const [requests, setRequests] = useState<IRefundRequest[]>(initialRequests);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleStatusUpdate = async (requestId: string, status: "accepted" | "rejected") => {
    setLoadingStates(prev => ({ ...prev, [requestId]: true }));

    try {
      const response = await fetch("/api/request-refund", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update the local state
        setRequests(prev =>
          prev.map(req =>
            req._id === requestId
              ? { ...req, requestStatus: status, updatedAt: new Date() }
              : req
          )
        );
        
        toast.success(`Refund request ${status} successfully.`);
      } else {
        throw new Error(result.error || "Failed to update refund request");
      }
    } catch (error) {
      console.error("Error updating refund request:", error);
      toast.error("Failed to update refund request");
    } finally {
      setLoadingStates(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "duplicate":
        return "Duplicate Payment";
      case "not_as_described":
        return "Not as Described";
      case "other":
        return "Other";
      default:
        return category;
    }
  };

  const pendingRequests = requests.filter(req => req.requestStatus === "pending");
  const processedRequests = requests.filter(req => req.requestStatus !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-orange-600">
            Pending Requests ({pendingRequests.length})
          </h3>
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <Card key={request._id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{request.courseId.name}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {request.studentId.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ₹{request.amount}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(request.requestStatus)}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        {getCategoryLabel(request.refundReasonCategory)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.reason && (
                    <div>
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Reason
                      </h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                        {request.reason}
                      </p>
                    </div>
                  )}

                  {request.notes && (
                    <div>
                      <h4 className="font-medium mb-1">Additional Notes</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                        {request.notes}
                      </p>
                    </div>
                  )}

                  {request.attachments && request.attachments.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">Attachments</h4>
                      <div className="space-y-1">
                        {request.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Attachment {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => handleStatusUpdate(request._id, "accepted")}
                      disabled={loadingStates[request._id]}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      {loadingStates[request._id] ? (
                        "Processing..."
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept Refund
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(request._id, "rejected")}
                      disabled={loadingStates[request._id]}
                      variant="destructive"
                      className="flex-1"
                      size="sm"
                    >
                      {loadingStates[request._id] ? (
                        "Processing..."
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Processed Requests ({processedRequests.length})
          </h3>
          <div className="grid gap-3">
            {processedRequests.slice(0, 5).map((request) => (
              <Card key={request._id} className="border-l-4 border-l-gray-300">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{request.courseId.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {request.studentId.name} • ₹{request.amount} • {new Date(request.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(request.requestStatus)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {processedRequests.length > 5 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              ... and {processedRequests.length - 5} more processed requests
            </p>
          )}
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Refund Requests</h3>
            <p className="text-muted-foreground">
              You haven&apos;t received any refund requests yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}