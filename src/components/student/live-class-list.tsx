"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Play, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface LiveClass {
  _id: string
  course: { _id: string; title: string }
  title: string
  description?: string
  scheduledDate: string
  duration: number
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  isLive: boolean
  attendees: string[]
  teacher: { name: string; email: string }
}

export default function StudentLiveClassList() {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLiveClasses()
  }, [])

  const fetchLiveClasses = async () => {
    try {
      const response = await fetch('/api/student/live-classes')
      if (response.ok) {
        const data = await response.json()
        setLiveClasses(data.liveClasses || [])
      } else {
        console.error('Failed to fetch live classes')
        toast.error("Failed to fetch live classes")
      }
    } catch (error) {
      console.error('Error fetching live classes:', error)
      toast.error("Failed to fetch live classes")
    } finally {
      setLoading(false)
    }
  }

  const joinLiveClass = (liveClassId: string) => {
    // Navigate to the live stream viewer
    window.open(`/live-stream/${liveClassId}`, '_blank')
  }

  const getStatusBadge = (status: string, isLive: boolean) => {
    if (isLive) {
      return <Badge variant="destructive" className="animate-pulse">🔴 LIVE</Badge>
    }
    
    const variants: Record<string, "secondary" | "destructive" | "outline"> = {
      scheduled: 'secondary',
      live: 'destructive',
      ended: 'outline',
      cancelled: 'outline'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>
  }

  const isUpcoming = (scheduledDate: string) => {
    return new Date(scheduledDate) > new Date()
  }

  if (loading) {
    return <div className="p-6">Loading live classes...</div>
  }

  const liveLiveClasses = liveClasses.filter(lc => lc.isLive || lc.status === 'live')
  const upcomingLiveClasses = liveClasses.filter(lc => 
    lc.status === 'scheduled' && isUpcoming(lc.scheduledDate)
  )
  const pastLiveClasses = liveClasses.filter(lc => 
    lc.status === 'ended' || (!isUpcoming(lc.scheduledDate) && lc.status === 'scheduled')
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Live Classes</h1>
        <p className="text-muted-foreground">Join live streaming sessions from your enrolled courses</p>
      </div>

      {/* Live Now Section */}
      {liveLiveClasses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-red-600">🔴 Live Now</h2>
          <div className="grid gap-4">
            {liveLiveClasses.map(liveClass => (
              <Card key={liveClass._id} className="border-red-200 bg-red-50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {liveClass.title}
                        {getStatusBadge(liveClass.status, liveClass.isLive)}
                      </CardTitle>
                      <CardDescription>
                        {liveClass.course.title} • {liveClass.teacher.name}
                      </CardDescription>
                    </div>
                    
                    <Button 
                      onClick={() => joinLiveClass(liveClass._id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Join Live
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {liveClass.description && (
                    <p className="text-sm text-muted-foreground mb-4">{liveClass.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {liveClass.attendees.length} attendees
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {liveClass.duration} minutes
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      {upcomingLiveClasses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">📅 Upcoming</h2>
          <div className="grid gap-4">
            {upcomingLiveClasses.map(liveClass => (
              <Card key={liveClass._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {liveClass.title}
                        {getStatusBadge(liveClass.status, liveClass.isLive)}
                      </CardTitle>
                      <CardDescription>
                        {liveClass.course.title} • {liveClass.teacher.name}
                      </CardDescription>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(liveClass.scheduledDate), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(liveClass.scheduledDate), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {liveClass.description && (
                    <p className="text-sm text-muted-foreground mb-4">{liveClass.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {liveClass.duration} minutes
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Section */}
      {pastLiveClasses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">📚 Past Classes</h2>
          <div className="grid gap-4">
            {pastLiveClasses.map(liveClass => (
              <Card key={liveClass._id} className="opacity-75">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {liveClass.title}
                        {getStatusBadge(liveClass.status, liveClass.isLive)}
                      </CardTitle>
                      <CardDescription>
                        {liveClass.course.title} • {liveClass.teacher.name}
                      </CardDescription>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(liveClass.scheduledDate), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(liveClass.scheduledDate), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {liveClass.description && (
                    <p className="text-sm text-muted-foreground mb-4">{liveClass.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {liveClass.attendees.length} attended
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {liveClass.duration} minutes
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {liveClasses.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No live classes available.</p>
            <p className="text-sm text-muted-foreground">
              Live classes will appear here when your teachers schedule them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
