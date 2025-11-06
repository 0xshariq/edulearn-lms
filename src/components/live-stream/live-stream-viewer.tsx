"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  Send, Users, MessageCircle, Play, Settings, Wifi, WifiOff, Clock, Eye, 
  Volume2, VolumeX, Maximize, Minimize, Share2, Flag, Crown, Shield,
  AlertCircle, CheckCircle, XCircle, RefreshCw, Download, Camera
} from 'lucide-react'
import { format } from 'date-fns'
import AdaptiveVideoPlayer from '@/components/video/adaptive-video-player'
import { Slider } from '@/components/ui/slider'

interface StreamData {
  token: string
  streamId: string
  playerUrl: string
  chatUrl: string
  webRtcUrl?: string
  hlsUrl?: string
  rtmpUrl?: string
  quality?: string
  bitrate?: number
  resolution?: string
  role: 'teacher' | 'student' | 'admin'
  permissions: string[]
  expiresAt: Date
  liveClass: {
    title: string
    description?: string
    scheduledDate: string
    status: string
    isLive: boolean
  }
  analytics?: {
    viewerCount: number
    peakViewers: number
    averageWatchTime: number
    chatMessages: number
  }
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  role: 'teacher' | 'student' | 'admin'
  isModerated?: boolean
  isHighlighted?: boolean
}

interface StreamQuality {
  label: string
  value: string
  bitrate: number
  resolution: string
}

interface LiveStreamViewerProps {
  liveClassId: string
}

export default function LiveStreamViewer({ liveClassId }: LiveStreamViewerProps) {
  const { data: session } = useSession()
  const [streamData, setStreamData] = useState<StreamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chatConnected, setChatConnected] = useState(false)
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'excellent'>('good')
  const [liveLatency, setLiveLatency] = useState<number>(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [selectedQuality, setSelectedQuality] = useState<string>('auto')
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [moderatedUsers, setModeratedUsers] = useState<Set<string>>(new Set())
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [bufferHealth, setBufferHealth] = useState(100)
  const [networkBandwidth, setNetworkBandwidth] = useState(0)
  
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const tokenRefreshInterval = useRef<NodeJS.Timeout | null>(null)
  const viewerCountInterval = useRef<NodeJS.Timeout | null>(null)
  const qualityCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const connectionHealthInterval = useRef<NodeJS.Timeout | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const maxReconnectAttempts = 5

  // Enhanced quality options with bandwidth adaptation
  const qualityOptions: StreamQuality[] = useMemo(() => [
    { label: 'Auto', value: 'auto', bitrate: 0, resolution: 'Auto' },
    { label: '1080p', value: '1080p', bitrate: 2500, resolution: '1920x1080' },
    { label: '720p', value: '720p', bitrate: 1000, resolution: '1280x720' },
    { label: '480p', value: '480p', bitrate: 500, resolution: '854x480' },
    { label: '360p', value: '360p', bitrate: 250, resolution: '640x360' }
  ], [])

  const refreshToken = useCallback(async () => {
    if (!streamData?.token) return

    try {
      const response = await fetch('/api/live-classes/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: streamData.token })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update stream data with new token
        setStreamData(prev => prev ? {
          ...prev,
          token: data.token,
          playerUrl: prev.playerUrl.replace(streamData.token, data.token),
          chatUrl: prev.chatUrl.replace(streamData.token, data.token),
          expiresAt: new Date(data.expiresAt)
        } : null)

        // Update expiry time
        setTokenExpiry(Date.now() + (data.expiresIn * 1000))

        console.log('Token refreshed successfully')
        toast.success( "Session Extended : Your session has been refreshed successfully.")
      } else {
        console.error('Failed to refresh token')
        toast.warning("Session Warning : Your session will expire soon. Please refresh the page.")
        
        // If token refresh fails, try to fetch stream data again after 5 seconds
        setTimeout(() => {
          fetchStreamData()
        }, 5000)
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      toast.error("Connection Error : Lost connection to stream. Attempting to reconnect...")
      
      // If refresh fails, try to reconnect after 5 seconds
      setTimeout(() => {
        fetchStreamData()
      }, 5000)
    }
  }, [streamData?.token])

  const setupTokenRefresh = useCallback(() => {
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current)
    }

    // Refresh token 30 minutes before expiry
    const refreshTime = 30 * 60 * 1000 // 30 minutes in milliseconds
    const timeUntilRefresh = (tokenExpiry || 0) - Date.now() - refreshTime

    if (timeUntilRefresh > 0) {
      tokenRefreshInterval.current = setTimeout(async () => {
        await refreshToken()
        // Set up next refresh
        setupTokenRefresh()
      }, timeUntilRefresh)
    }
  }, [tokenExpiry, refreshToken])

  // Enhanced connection management
  const initializeWebSocket = useCallback(() => {
    if (!streamData?.chatUrl) return

    try {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.close()
      }

      const ws = new WebSocket(streamData.chatUrl)
      websocketRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setChatConnected(true)
        setIsReconnecting(false)
        setReconnectAttempts(0)
        setError(null)
        
        // Send initial connection message
        ws.send(JSON.stringify({
          type: 'join',
          streamId: liveClassId,
          userId: session?.user?.id,
          userRole: session?.user?.role
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          switch (message.type) {
            case 'chat':
              setChatMessages(prev => [...prev, {
                id: message.id || Date.now().toString(),
                user: message.user,
                message: message.message,
                timestamp: new Date(message.timestamp),
                role: message.role || 'student'
              }])
              break
            case 'viewer_count':
              setViewerCount(message.count)
              break
            case 'connection_quality':
              setConnectionQuality(message.quality)
              setLiveLatency(message.latency || 0)
              setBufferHealth(message.bufferHealth || 100)
              setNetworkBandwidth(message.bandwidth || 0)
              break
            case 'error':
              setError(message.message)
              break
            case 'recording_status':
              setIsRecording(message.recording)
              break
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setChatConnected(false)
        
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          setIsReconnecting(true)
          setReconnectAttempts(prev => prev + 1)
          
          // Exponential backoff for reconnection
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
          reconnectTimeout.current = setTimeout(() => {
            initializeWebSocket()
          }, delay)
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError('Unable to connect to chat. Please refresh the page.')
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Chat connection error')
      }

    } catch (err) {
      console.error('Failed to initialize WebSocket:', err)
      setError('Failed to connect to chat')
    }
  }, [streamData?.chatUrl, liveClassId, session?.user, reconnectAttempts])

  const monitorConnectionHealth = useCallback(() => {
    if (connectionHealthInterval.current) {
      clearInterval(connectionHealthInterval.current)
    }

    connectionHealthInterval.current = setInterval(async () => {
      if (!streamData?.token || !streamData?.streamId) return

      try {
        const response = await fetch(`/api/live-classes/${liveClassId}/health`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${streamData.token}`
          },
          body: JSON.stringify({
            streamId: streamData.streamId,
            quality: selectedQuality,
            bandwidth: networkBandwidth,
            bufferHealth: bufferHealth
          })
        })

        if (response.ok) {
          const healthData = await response.json()
          setConnectionQuality(healthData.quality || 'good')
          setLiveLatency(healthData.latency || 0)
          setViewerCount(healthData.viewerCount || 0)
        }
      } catch (err) {
        console.warn('Connection health check failed:', err)
      }
    }, 10000) // Check every 10 seconds
  }, [streamData, liveClassId, selectedQuality, networkBandwidth, bufferHealth])

  const fetchStreamData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/live-classes/${liveClassId}/stream`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setStreamData(data)
        
        // Calculate token expiry time
        if (data.token) {
          try {
            const tokenPayload = JSON.parse(atob(data.token.split('.')[1]))
            setTokenExpiry(tokenPayload.exp * 1000)
          } catch (e) {
            console.warn('Unable to parse token expiry:', e)
          }
        }

        console.log('Stream data fetched successfully')
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch stream data:', errorData)
        setError(errorData.message || 'Failed to load stream')
      }
    } catch (err) {
      console.error('Error fetching stream data:', err)
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [liveClassId])

  const handleReconnect = useCallback(async () => {
    setIsReconnecting(true)
    setReconnectAttempts(0)
    
    try {
      // Refresh stream data first
      await fetchStreamData()
      
      // Reinitialize WebSocket
      setTimeout(() => {
        initializeWebSocket()
      }, 1000)
      
    } catch (err) {
      console.error('Reconnection failed:', err)
      setError('Reconnection failed. Please refresh the page.')
    }
  }, [fetchStreamData, initializeWebSocket])

  const startViewerCountSimulation = () => {
    if (viewerCountInterval.current) {
      clearInterval(viewerCountInterval.current)
    }

    // Simulate viewer count changes
    viewerCountInterval.current = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 3) - 1 // -1, 0, or 1
        const newCount = Math.max(1, prev + change)
        
        // Update connection quality based on viewer count
        if (newCount > 50) {
          setConnectionQuality('poor')
        } else if (newCount > 20) {
          setConnectionQuality('good')
        } else {
          setConnectionQuality('excellent')
        }
        
        return newCount
      })
    }, 10000) // Update every 10 seconds
  }

  const startQualityMonitoring = () => {
    if (qualityCheckInterval.current) {
      clearInterval(qualityCheckInterval.current)
    }

    qualityCheckInterval.current = setInterval(() => {
      // Simulate quality monitoring
      const quality = Math.random()
      if (quality < 0.1) {
        setConnectionQuality('poor')
        toast.warning("Connection Warning : Your connection quality has decreased. Consider switching to a lower quality.")
      } else if (quality > 0.8) {
        setConnectionQuality('excellent')
      }
    }, 30000) // Check every 30 seconds
  }

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality)
    toast.success(`Quality Changed : Switched to ${quality} quality`)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    setVolume(isMuted ? 1 : 0)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    }
  }

  const toggleChat = () => {
    setShowChat(!showChat)
  }

  const startRecording = () => {
    if (!streamData?.permissions.includes('record')) {
      toast.error("Permission Denied : You don't have permission to record this stream.")
      return
    }

    setIsRecording(true)
    toast.success("Recording Started : Stream recording has been initiated.")
  }

  const moderateUser = (userId: string) => {
    if (!streamData?.permissions.includes('moderate')) {
      toast.error("Permission Denied : You don't have permission to moderate users.")
      return
    }

    setModeratedUsers(prev => new Set([...prev, userId]))
    toast.success("User Moderated : User has been temporarily muted.")
  }

  useEffect(() => {
    fetchStreamData()
    
    return () => {
      // Cleanup intervals on component unmount
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current)
      }
      if (viewerCountInterval.current) {
        clearInterval(viewerCountInterval.current)
      }
      if (qualityCheckInterval.current) {
        clearInterval(qualityCheckInterval.current)
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
    }
  }, [liveClassId, fetchStreamData])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    // Set up token refresh interval when we have a token
    if (streamData?.token && tokenExpiry) {
      setupTokenRefresh()
    }
    
    return () => {
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current)
      }
    }
  }, [streamData?.token, tokenExpiry, setupTokenRefresh])

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !streamData || !session?.user) return

    // Check if user is moderated
    if (moderatedUsers.has(session.user.id || '')) {
      toast.error("Message Blocked : You have been temporarily muted by a moderator.")
      return
    }

    const message: ChatMessage = {
      id: Date.now().toString(),
      user: session.user.name || session.user.email || 'Student',
      message: newMessage.trim(),
      timestamp: new Date(),
      role: streamData.role
    }

    setChatMessages(prev => [...prev, message])
    setNewMessage('')

    // In a real implementation, this would send to the chat service
    // For now, we'll simulate receiving messages
    setTimeout(() => {
      if (Math.random() > 0.7) {
        const teacherMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          user: 'Teacher',
          message: 'Thanks for your question! Let me address that...',
          timestamp: new Date(),
          role: 'teacher',
          isHighlighted: true
        }
        setChatMessages(prev => [...prev, teacherMessage])
      }
    }, 2000 + Math.random() * 3000)
  }

  const formatLatency = (ms: number) => {
    return `${Math.round(ms / 1000)}s`
  }

  const formatTimeRemaining = (expiryTime: number) => {
    const remaining = expiryTime - Date.now()
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Loading live stream...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we connect you</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardContent className="text-center py-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchStreamData} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!streamData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Stream Unavailable</h2>
            <p className="text-gray-400">
              Please check if you&apos;re enrolled in this course or if the stream is active.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">{streamData.liveClass.title}</h1>
            <p className="text-sm text-gray-400">
              {format(new Date(streamData.liveClass.scheduledDate), 'PPP p')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {streamData.liveClass.isLive ? (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse">🔴 LIVE</Badge>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span>{viewerCount} watching</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatLatency(liveLatency)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {connectionQuality === 'excellent' && <Wifi className="w-4 h-4 text-green-400" />}
                  {connectionQuality === 'good' && <Wifi className="w-4 h-4 text-yellow-400" />}
                  {connectionQuality === 'poor' && <WifiOff className="w-4 h-4 text-red-400" />}
                </div>
                {streamData.permissions.includes('record') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startRecording}
                    disabled={isRecording}
                    className="text-xs"
                  >
                    <Camera className="w-3 h-3 mr-1" />
                    {isRecording ? 'Recording...' : 'Record'}
                  </Button>
                )}
              </div>
            ) : (
              <Badge variant="outline">ENDED</Badge>
            )}
          </div>
        </div>
        
        {streamData.liveClass.description && (
          <p className="text-sm text-gray-400 mt-2">
            {streamData.liveClass.description}
          </p>
        )}

        {tokenExpiry && (
          <div className="mt-2 text-xs text-gray-500">
            Session expires: {formatTimeRemaining(tokenExpiry)}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`grid ${showChat ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'} h-[calc(100vh-120px)]`}>
        {/* Video Player */}
        <div className={`${showChat ? 'lg:col-span-3' : 'col-span-1'} bg-black flex items-center justify-center relative`}>
          {streamData.liveClass.isLive ? (
            <div className="w-full h-full">
              <AdaptiveVideoPlayer
                src={streamData.hlsUrl || streamData.playerUrl}
                title={streamData.liveClass.title}
                poster="/edulearn-logo.png"
                autoPlay={true}
                controls={true}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="text-white text-center">
              <div className="mb-4">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Stream Ended</h3>
                <p className="text-gray-400">This live class has ended.</p>
              </div>
            </div>
          )}

          {/* Floating Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleChat}
              className="bg-black/50 hover:bg-black/70"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleFullscreen}
              className="bg-black/50 hover:bg-black/70"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-white" />
                  <h3 className="font-semibold text-white">Live Chat</h3>
                  {chatConnected && (
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {streamData.permissions.includes('moderate') && (
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                      <Shield className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={toggleChat} className="text-gray-400 hover:text-white">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Quality Selector */}
              <div className="mt-3">
                <Select value={selectedQuality} onValueChange={handleQualityChange}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityOptions.map((quality) => (
                      <SelectItem key={quality.value} value={quality.value}>
                        {quality.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Volume Control */}
              <div className="mt-3 flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute} className="text-gray-400 hover:text-white">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div key={message.id} className="text-sm">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${
                            message.role === 'teacher' ? 'text-blue-400' : 
                            message.role === 'admin' ? 'text-purple-400' : 'text-gray-300'
                          }`}>
                            {message.user}
                          </span>
                          {message.role === 'teacher' && (
                            <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">
                              <Crown className="w-3 h-3 mr-1" />
                              Teacher
                            </Badge>
                          )}
                          {message.role === 'admin' && (
                            <Badge variant="outline" className="text-xs border-purple-400 text-purple-400">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {format(message.timestamp, 'HH:mm')}
                          </span>
                          {streamData.permissions.includes('moderate') && message.role !== 'teacher' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moderateUser(message.user)}
                              className="w-4 h-4 text-gray-500 hover:text-red-400"
                            >
                              <Flag className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <p className={`text-gray-300 ${message.isHighlighted ? 'bg-yellow-900/20 p-2 rounded' : ''}`}>
                          {message.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {!chatConnected && (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>Connecting to chat...</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            {streamData.liveClass.isLive && chatConnected && (
              <div className="p-4 border-t border-gray-700">
                <form onSubmit={sendChatMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    maxLength={200}
                    disabled={moderatedUsers.has(session?.user?.id || '')}
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || moderatedUsers.has(session?.user?.id || '')}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <p className="text-xs text-gray-500 mt-2">
                  Be respectful in your messages
                </p>
              </div>
            )}

            {!streamData.liveClass.isLive && (
              <div className="p-4 border-t border-gray-700 text-center">
                <p className="text-sm text-gray-500">
                  Chat is disabled when the stream is not live
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
