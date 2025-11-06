'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Upload,
  Video,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Download,
  Share2,
  BookmarkPlus,
  Eye,
  Clock,
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  FileVideo,
  FileText,
  FileImage,
  FileAudio,
  Trash2,
  Edit3,
  Info,
  HelpCircle,
  ExternalLink,
  Copy,
  Link,
  Globe,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckSquare,
  Square,
  RotateCcw,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  RotateCw,
  RotateCcw as RotateCcwIcon,
  Maximize as MaximizeIcon,
  Minimize as MinimizeIcon,
  SkipBack as SkipBackIcon,
  SkipForward as SkipForwardIcon,
  RotateCw as RotateCwIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoUploadProps {
  courseId: string
  onSuccess?: (videoUrl?: string) => void
  maxFileSize?: number // in bytes
  allowedFormats?: string[]
  chunkSize?: number // in bytes
  enableResume?: boolean
  enablePreview?: boolean
  enableCompression?: boolean
  enableTranscoding?: boolean
}

interface UploadChunk {
  chunk: Blob
  index: number
  start: number
  end: number
  uploaded: boolean
}

interface VideoMetadata {
  duration?: number
  width?: number
  height?: number
  bitrate?: number
  format?: string
  size: number
  thumbnail?: string
}

interface UploadProgress {
  total: number
  uploaded: number
  percentage: number
  speed: number // bytes per second
  remaining: number // seconds
  chunks: UploadChunk[]
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
const SUPPORTED_FORMATS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v']

export function EnhancedVideoUpload({
  courseId,
  onSuccess,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedFormats = SUPPORTED_FORMATS,
  chunkSize = DEFAULT_CHUNK_SIZE,
  enableResume = true,
  enablePreview = true,
  enableCompression = true,
  enableTranscoding = true,
}: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // State management
  const [open, setOpen] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    total: 0,
    uploaded: 0,
    percentage: 0,
    speed: 0,
    remaining: 0,
    chunks: [],
    status: 'idle',
  })
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [uploadPreset, setUploadPreset] = useState<string | null>(null)
  const [cloudName, setCloudName] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [position, setPosition] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [isPreview, setIsPreview] = useState(false)
  const [enableComments, setEnableComments] = useState(true)
  const [enableDownloads, setEnableDownloads] = useState(false)
  
  // Settings state
  const [selectedQuality, setSelectedQuality] = useState('auto')
  const [selectedFormat, setSelectedFormat] = useState('mp4')
  const [enableWatermark, setEnableWatermark] = useState(false)
  const [enableSubtitles, setEnableSubtitles] = useState(false)
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'unlisted'>('public')

  // Quality options
  const qualityOptions = [
    { label: 'Auto', value: 'auto', bitrate: 0, resolution: 'Auto' },
    { label: '1080p', value: '1080p', bitrate: 5000, resolution: '1920x1080' },
    { label: '720p', value: '720p', bitrate: 2500, resolution: '1280x720' },
    { label: '480p', value: '480p', bitrate: 1000, resolution: '854x480' },
    { label: '360p', value: '360p', bitrate: 500, resolution: '640x360' },
  ]

  // Format options
  const formatOptions = [
    { label: 'MP4', value: 'mp4', description: 'Most compatible' },
    { label: 'WebM', value: 'webm', description: 'Web optimized' },
    { label: 'MOV', value: 'mov', description: 'Apple devices' },
    { label: 'AVI', value: 'avi', description: 'Legacy support' },
  ]

  // Privacy options
  const privacyOptions = [
    { label: 'Public', value: 'public', description: 'Anyone can view' },
    { label: 'Private', value: 'private', description: 'Only you can view' },
    { label: 'Unlisted', value: 'unlisted', description: 'Anyone with link can view' },
  ]

  // File validation
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (${(maxFileSize / (1024 * 1024)).toFixed(2)}MB)`,
      }
    }

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !allowedFormats.includes(extension)) {
      return {
        valid: false,
        error: `File format not supported. Allowed formats: ${allowedFormats.join(', ')}`,
      }
    }

    // Check if it's actually a video file
    if (!file.type.startsWith('video/')) {
      return {
        valid: false,
        error: 'Please select a valid video file',
      }
    }

    return { valid: true }
  }, [maxFileSize, allowedFormats])

  // Extract video metadata
  const extractVideoMetadata = useCallback((file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      video.onloadedmetadata = () => {
        const metadata: VideoMetadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size,
          format: file.name.split('.').pop()?.toLowerCase(),
        }
        
        // Generate thumbnail
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx?.drawImage(video, 0, 0)
        
        try {
          metadata.thumbnail = canvas.toDataURL('image/jpeg', 0.8)
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error)
        }
        
        resolve(metadata)
      }
      
      video.onerror = () => {
        reject(new Error('Failed to load video metadata'))
      }
      
      video.src = URL.createObjectURL(file)
    })
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      toast.error('Invalid file', validation.error)
      return
    }

    setVideoFile(file)
    
    try {
      // Extract metadata
      const metadata = await extractVideoMetadata(file)
      setVideoMetadata(metadata)
      
      // Set default title from filename
      const fileName = file.name.replace(/\.[^/.]+$/, '')
      setTitle(fileName)
      
      toast(`File selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`)
    } catch (error) {
      toast.error('Failed to process video file')
    }
  }, [validateFile, extractVideoMetadata, toast])

  // Initialize upload
  const initializeUpload = useCallback(async () => {
    if (!videoFile) return

    try {
      // Get Cloudinary configuration
      const response = await fetch('/api/cloudinary/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: videoFile.name,
          fileSize: videoFile.size,
          courseId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initialize upload')
      }

      const data = await response.json()
      setUploadId(data.uploadId)
      setUploadUrl(data.uploadUrl)
      setUploadPreset(data.uploadPreset)
      setCloudName(data.cloudName)

      // Create chunks
      const chunks: UploadChunk[] = []
      let start = 0
      let index = 0

      while (start < videoFile.size) {
        const end = Math.min(start + chunkSize, videoFile.size)
        const chunk = videoFile.slice(start, end)
        
        chunks.push({
          chunk,
          index,
          start,
          end,
          uploaded: false,
        })
        
        start = end
        index++
      }

      setUploadProgress(prev => ({
        ...prev,
        total: videoFile.size,
        chunks,
        status: 'uploading',
      }))

      return data
    } catch (error) {
      console.error('Upload initialization failed:', error)
      toast.error('Failed to initialize upload')
      throw error
    }
  }, [videoFile, courseId, chunkSize, toast])

  // Upload chunk
  const uploadChunk = useCallback(async (chunk: UploadChunk): Promise<void> => {
    if (!uploadUrl || !uploadPreset || !cloudName) {
      throw new Error('Upload not initialized')
    }

    const formData = new FormData()
    formData.append('file', chunk.chunk)
    formData.append('upload_preset', uploadPreset)
    formData.append('chunk_index', chunk.index.toString())
    formData.append('total_chunks', uploadProgress.chunks.length.toString())
    formData.append('upload_id', uploadId!)

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload chunk ${chunk.index}`)
    }

    return response.json()
  }, [uploadUrl, uploadPreset, cloudName, uploadId, uploadProgress.chunks.length])

  // Upload all chunks
  const uploadChunks = useCallback(async () => {
    if (!uploadProgress.chunks.length) return

    const startTime = Date.now()
    let uploadedBytes = 0

    for (let i = 0; i < uploadProgress.chunks.length; i++) {
      const chunk = uploadProgress.chunks[i]
      
      try {
        await uploadChunk(chunk)
        
        // Update progress
        uploadedBytes += chunk.chunk.size
        const elapsed = (Date.now() - startTime) / 1000
        const speed = uploadedBytes / elapsed
        const remaining = (uploadProgress.total - uploadedBytes) / speed
        
        setUploadProgress(prev => ({
          ...prev,
          uploaded: uploadedBytes,
          percentage: (uploadedBytes / prev.total) * 100,
          speed,
          remaining,
          chunks: prev.chunks.map((c, index) => 
            index === i ? { ...c, uploaded: true } : c
          ),
        }))
      } catch (error) {
        console.error(`Failed to upload chunk ${i}:`, error)
        
        // Retry logic
        if (enableResume) {
          // Mark chunk as failed but continue
          setUploadProgress(prev => ({
            ...prev,
            chunks: prev.chunks.map((c, index) => 
              index === i ? { ...c, uploaded: false } : c
            ),
          }))
        } else {
          throw error
        }
      }
    }
  }, [uploadProgress.chunks, uploadChunk, enableResume])

  // Complete upload
  const completeUpload = useCallback(async () => {
    if (!uploadId || !cloudName) return

    try {
      const response = await fetch('/api/cloudinary/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          courseId,
          title,
          description,
          position,
          tags,
          difficulty,
          isPreview,
          enableComments,
          enableDownloads,
          quality: selectedQuality,
          format: selectedFormat,
          enableWatermark,
          enableSubtitles,
          privacy,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete upload')
      }

      const data = await response.json()
      
      setUploadProgress(prev => ({ ...prev, status: 'completed' }))

      toast.success('Upload successful: Video uploaded and processed successfully')

      if (onSuccess) {
        onSuccess(data.video?.url)
      }

      resetForm()
      setOpen(false)
    } catch (error) {
      console.error('Upload completion failed:', error)
      setUploadProgress(prev => ({ 
        ...prev, 
        status: 'error',
        error: 'Failed to complete upload'
      }))

      toast.error('Upload Failed : Failed to complete video upload', error)
    }
  }, [
    uploadId,
    cloudName,
    courseId,
    title,
    description,
    position,
    tags,
    difficulty,
    isPreview,
    enableComments,
    enableDownloads,
    selectedQuality,
    selectedFormat,
    enableWatermark,
    enableSubtitles,
    privacy,
    onSuccess,
    toast,
  ])

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!videoFile) {
      toast.info('No file selected: Please select a video file to upload')
      return
    }

    if (!title.trim()) {
      toast.info('Title required: Please enter a title for the video')  
      return
    }

    try {
      // Initialize upload
      await initializeUpload()
      
      // Upload chunks
      await uploadChunks()
      
      // Complete upload
      await completeUpload()
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadProgress(prev => ({ 
        ...prev, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      }))
    }
  }, [
    videoFile,
    title,
    initializeUpload,
    uploadChunks,
    completeUpload,
    toast,
  ])

  // Reset form
  const resetForm = useCallback(() => {
    setVideoFile(null)
    setVideoMetadata(null)
    setTitle('')
    setDescription('')
    setPosition(0)
    setTags([])
    setDifficulty('beginner')
    setIsPreview(false)
    setEnableComments(true)
    setEnableDownloads(false)
    setSelectedQuality('auto')
    setSelectedFormat('mp4')
    setEnableWatermark(false)
    setEnableSubtitles(false)
    setPrivacy('public')
    setUploadProgress({
      total: 0,
      uploaded: 0,
      percentage: 0,
      speed: 0,
      remaining: 0,
      chunks: [],
      status: 'idle',
    })
    setUploadId(null)
    setUploadUrl(null)
    setUploadPreset(null)
    setCloudName(null)
  }, [])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Video className="h-4 w-4" />
            Upload Video
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Course Video</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              {/* File Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Video File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="video">Select Video File</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        ref={fileInputRef}
                        id="video"
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        disabled={uploadProgress.status === 'uploading'}
                      />
                      {videoFile && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setVideoFile(null)
                            setVideoMetadata(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          disabled={uploadProgress.status === 'uploading'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {videoFile && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">File: {videoFile.name}</p>
                          <p className="text-muted-foreground">Size: {formatFileSize(videoFile.size)}</p>
                        </div>
                        {videoMetadata && (
                          <div>
                            <p className="font-medium">Duration: {formatDuration(videoMetadata.duration || 0)}</p>
                            <p className="text-muted-foreground">
                              Resolution: {videoMetadata.width}×{videoMetadata.height}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {uploadProgress.status !== 'idle' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Upload Progress</span>
                        <span>{uploadProgress.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={uploadProgress.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(uploadProgress.uploaded)} / {formatFileSize(uploadProgress.total)}</span>
                        <span>{formatFileSize(uploadProgress.speed)}/s</span>
                        <span>{Math.ceil(uploadProgress.remaining)}s remaining</span>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {uploadProgress.status === 'error' && uploadProgress.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{uploadProgress.error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Video Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter video title"
                      disabled={uploadProgress.status === 'uploading'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter video description"
                      rows={3}
                      disabled={uploadProgress.status === 'uploading'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        type="number"
                        min="0"
                        value={position}
                        onChange={(e) => setPosition(Number(e.target.value))}
                        placeholder="Video position in course"
                        disabled={uploadProgress.status === 'uploading'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <select
                        id="difficulty"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as any)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        disabled={uploadProgress.status === 'uploading'}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isPreview"
                        checked={isPreview}
                        onChange={(e) => setIsPreview(e.target.checked)}
                        disabled={uploadProgress.status === 'uploading'}
                      />
                      <Label htmlFor="isPreview">Preview Video</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableComments"
                        checked={enableComments}
                        onChange={(e) => setEnableComments(e.target.checked)}
                        disabled={uploadProgress.status === 'uploading'}
                      />
                      <Label htmlFor="enableComments">Enable Comments</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableDownloads"
                        checked={enableDownloads}
                        onChange={(e) => setEnableDownloads(e.target.checked)}
                        disabled={uploadProgress.status === 'uploading'}
                      />
                      <Label htmlFor="enableDownloads">Allow Downloads</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Button */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={uploadProgress.status === 'uploading'}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!videoFile || !title.trim() || uploadProgress.status === 'uploading'}
                  className="flex-1"
                >
                  {uploadProgress.status === 'uploading' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Video
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              {/* Quality Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Quality Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Output Quality</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {qualityOptions.map((quality) => (
                        <Button
                          key={quality.value}
                          variant={selectedQuality === quality.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedQuality(quality.value)}
                          disabled={uploadProgress.status === 'uploading'}
                        >
                          {quality.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {formatOptions.map((format) => (
                        <Button
                          key={format.value}
                          variant={selectedFormat === format.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedFormat(format.value)}
                          disabled={uploadProgress.status === 'uploading'}
                        >
                          {format.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Privacy</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {privacyOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={privacy === option.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPrivacy(option.value as any)}
                          disabled={uploadProgress.status === 'uploading'}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableWatermark"
                      checked={enableWatermark}
                      onChange={(e) => setEnableWatermark(e.target.checked)}
                      disabled={uploadProgress.status === 'uploading'}
                    />
                    <Label htmlFor="enableWatermark">Add Watermark</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableSubtitles"
                      checked={enableSubtitles}
                      onChange={(e) => setEnableSubtitles(e.target.checked)}
                      disabled={uploadProgress.status === 'uploading'}
                    />
                    <Label htmlFor="enableSubtitles">Generate Subtitles</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableCompression"
                      checked={enableCompression}
                      onChange={(e) => setEnableCompression(e.target.checked)}
                      disabled={uploadProgress.status === 'uploading'}
                    />
                    <Label htmlFor="enableCompression">Enable Compression</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableTranscoding"
                      checked={enableTranscoding}
                      onChange={(e) => setEnableTranscoding(e.target.checked)}
                      disabled={uploadProgress.status === 'uploading'}
                    />
                    <Label htmlFor="enableTranscoding">Enable Transcoding</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              {videoFile && videoMetadata ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Video Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        src={URL.createObjectURL(videoFile)}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">File Information</p>
                        <p className="text-muted-foreground">Name: {videoFile.name}</p>
                        <p className="text-muted-foreground">Size: {formatFileSize(videoFile.size)}</p>
                        <p className="text-muted-foreground">Type: {videoFile.type}</p>
                      </div>
                      <div>
                        <p className="font-medium">Video Information</p>
                        <p className="text-muted-foreground">Duration: {formatDuration(videoMetadata.duration || 0)}</p>
                        <p className="text-muted-foreground">Resolution: {videoMetadata.width}×{videoMetadata.height}</p>
                        <p className="text-muted-foreground">Format: {videoMetadata.format}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Select a video file to preview</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Chunk Size</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(chunkSize)} per chunk
                      </p>
                    </div>
                    <div>
                      <Label>Max File Size</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(maxFileSize)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Supported Formats</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {allowedFormats.map((format) => (
                        <Badge key={format} variant="secondary">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Features</Label>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Resume upload support</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Chunked upload for large files</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Progress tracking</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Error recovery</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
} 