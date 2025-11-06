"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Play, Square, Users, Copy } from 'lucide-react'
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
  startedAt?: string
  endedAt?: string
}

interface Course {
  _id: string
  title: string
}

export default function TeacherLiveClassDashboard() {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [streamCredentials, setStreamCredentials] = useState<Record<string, unknown> | null>(null)

  const [newLiveClass, setNewLiveClass] = useState({
    course: '',
    title: '',
    description: '',
    scheduledDate: '',
    duration: 60
  })

  useEffect(() => {
    fetchLiveClasses()
    fetchCourses()
  }, [])

  const fetchLiveClasses = async () => {
    try {
      const response = await fetch('/api/teacher/live-classes')
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

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/teacher/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const handleCreateLiveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/teacher/live-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLiveClass)
      })

      if (response.ok) {
        const data = await response.json()
        setLiveClasses([data.liveClass, ...liveClasses])
        setIsCreateDialogOpen(false)
        setNewLiveClass({
          course: '',
          title: '',
          description: '',
          scheduledDate: '',
          duration: 60
        })
        toast.success("Live class scheduled successfully")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create live class")
      }
    } catch (error) {
      console.error('Error creating live class:', error)
      toast.error("Failed to create live class")
    }
  }


  const startLiveClass = async (liveClassId: string) => {
    try {
      const response = await fetch(`/api/live-classes/${liveClassId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'live' })
      })

      if (response.ok) {
        const data = await response.json()
        setLiveClasses(liveClasses.map(lc => 
          lc._id === liveClassId ? data.liveClass : lc
        ))
        
        // Get stream credentials
        const streamResponse = await fetch(`/api/live-classes/${liveClassId}/stream`, {
          method: 'POST'
        })
        
        if (streamResponse.ok) {
          const streamData = await streamResponse.json()
          setStreamCredentials(streamData)
        }

        toast.success("Live class started successfully")
      }
    } catch (error) {
      console.error('Error starting live class:', error)
      toast.error("Failed to start live class")
    }
  }

  const endLiveClass = async (liveClassId: string) => {
    try {
      const response = await fetch(`/api/live-classes/${liveClassId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' })
      })

      if (response.ok) {
        const data = await response.json()
        setLiveClasses(liveClasses.map(lc => 
          lc._id === liveClassId ? data.liveClass : lc
        ))
        setStreamCredentials(null)
        toast.success("Live class ended successfully")
      }
    } catch (error) {
      console.error('Error ending live class:', error)
      toast.error("Failed to end live class")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.info("Stream information copied to clipboard")
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "destructive" | "outline"> = {
      scheduled: 'secondary',
      live: 'destructive',
      ended: 'outline',
      cancelled: 'outline'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>
  }

  if (loading) {
    return <div className="p-6">Loading live classes...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Live Classes</h1>
          <p className="text-muted-foreground">Manage your live streaming sessions</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Live Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Live Class</DialogTitle>
              <DialogDescription>
                Create a new live streaming session for your students
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateLiveClass} className="space-y-4">
              <div>
                <Label htmlFor="course">Course</Label>
                <Select 
                  value={newLiveClass.course} 
                  onValueChange={(value) => setNewLiveClass({...newLiveClass, course: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newLiveClass.title}
                  onChange={(e) => setNewLiveClass({...newLiveClass, title: e.target.value})}
                  placeholder="Live class title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newLiveClass.description}
                  onChange={(e) => setNewLiveClass({...newLiveClass, description: e.target.value})}
                  placeholder="Describe what will be covered"
                />
              </div>

              <div>
                <Label htmlFor="scheduledDate">Scheduled Date & Time</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={newLiveClass.scheduledDate}
                  onChange={(e) => setNewLiveClass({...newLiveClass, scheduledDate: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="300"
                  value={newLiveClass.duration}
                  onChange={(e) => setNewLiveClass({...newLiveClass, duration: parseInt(e.target.value)})}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Schedule</Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stream Credentials Panel */}
      {streamCredentials && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">🔴 Live Stream Active</CardTitle>
            <CardDescription>
              Your stream is live! Use these credentials in OBS or your streaming software.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Server URL</Label>
              <div className="flex gap-2">
                <Input value={streamCredentials.serverUrl as string} readOnly />
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => copyToClipboard(streamCredentials.serverUrl as string)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Stream Key</Label>
              <div className="flex gap-2">
                <Input value={streamCredentials.streamKey as string} readOnly type="password" />
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => copyToClipboard(streamCredentials.streamKey as string)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Classes List */}
      <div className="grid gap-4">
        {liveClasses.map(liveClass => (
          <Card key={liveClass._id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {liveClass.title}
                    {getStatusBadge(liveClass.status)}
                  </CardTitle>
                  <CardDescription>
                    {liveClass.course.title} • {format(new Date(liveClass.scheduledDate), 'PPP p')}
                  </CardDescription>
                </div>
                
                <div className="flex gap-2">
                  {liveClass.status === 'scheduled' && (
                    <Button onClick={() => startLiveClass(liveClass._id)}>
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  )}
                  
                  {liveClass.status === 'live' && (
                    <Button 
                      variant="destructive" 
                      onClick={() => endLiveClass(liveClass._id)}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      End
                    </Button>
                  )}
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
                  {liveClass.attendees.length} attendees
                </span>
                <span>{liveClass.duration} minutes</span>
                {liveClass.startedAt && (
                  <span>Started: {format(new Date(liveClass.startedAt), 'p')}</span>
                )}
                {liveClass.endedAt && (
                  <span>Ended: {format(new Date(liveClass.endedAt), 'p')}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {liveClasses.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No live classes scheduled yet.</p>
              <p className="text-sm text-muted-foreground">Create your first live class to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
