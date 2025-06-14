import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import { Switch } from '../components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog'
import { useToast } from '../hooks/use-toast'
import { apiRequest, queryClient } from '../lib/queryClient'
import { Users, Package, DollarSign, Star, Calendar, BarChart3, Settings, Upload, QrCode, Palette, Image } from 'lucide-react'

interface User {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  credits: string
  loyaltyPoints: number
  tokens: number
  isActive: boolean
  createdAt: string | null
}

interface Season {
  id: number
  name: string
  displayName: string
  description: string | null
  backgroundColor: string
  isActive: boolean
  displayOrder: number
}

interface CollectionSeries {
  id: number
  seasonId: number
  name: string
  displayName: string
  description: string | null
  backgroundColor: string
  displayOrder: number
}

interface Toy {
  id: number
  name: string
  series: string
  seasonId: number | null
  seriesId: number | null
  rarity: string
  color: string | null
  qrCode: string
  imageUrl: string | null
  originalPrice: string | null
  isActivated: boolean
}

interface BulkToyFormData {
  seasonId: number
  seriesId: number
  baseName: string
  count: number
  rarity: string
  colors: string[]
  price: string
  generateQR: boolean
  generateImages: boolean
}

export default function WorkingAdminDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null)

  // Season management state
  const [newSeason, setNewSeason] = useState({
    name: '',
    displayName: '',
    description: '',
    backgroundColor: '#3B82F6'
  })

  // Series management state
  const [newSeries, setNewSeries] = useState({
    seasonId: 0,
    name: '',
    displayName: '',
    description: '',
    backgroundColor: '#F3F4F6'
  })

  // Bulk toy creation state
  const [bulkToyForm, setBulkToyForm] = useState<BulkToyFormData>({
    seasonId: 0,
    seriesId: 0,
    baseName: '',
    count: 10,
    rarity: 'common',
    colors: ['red', 'blue', 'green'],
    price: '29.99',
    generateQR: true,
    generateImages: true
  })

  // Data queries
  const usersQuery = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users?page=1&limit=10')
  })

  const seasonsQuery = useQuery({
    queryKey: ['/api/seasons'],
    queryFn: () => apiRequest('/api/seasons')
  })

  const seriesQuery = useQuery({
    queryKey: ['/api/collection-series'],
    queryFn: () => apiRequest('/api/collection-series')
  })

  const toysQuery = useQuery({
    queryKey: ['/api/admin/toys'],
    queryFn: () => apiRequest('/api/admin/toys')
  })

  // Mutations
  const createSeasonMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/seasons', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seasons'] })
      toast({ title: 'Season created successfully' })
      setNewSeason({ name: '', displayName: '', description: '', backgroundColor: '#3B82F6' })
    },
    onError: () => toast({ title: 'Failed to create season', variant: 'destructive' })
  })

  const createSeriesMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/collection-series', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collection-series'] })
      toast({ title: 'Series created successfully' })
      setNewSeries({ seasonId: 0, name: '', displayName: '', description: '', backgroundColor: '#F3F4F6' })
    },
    onError: () => toast({ title: 'Failed to create series', variant: 'destructive' })
  })

  const createBulkToysMutation = useMutation({
    mutationFn: (data: BulkToyFormData) => apiRequest('/api/admin/toys/bulk', 'POST', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/toys'] })
      toast({ 
        title: 'Bulk toys created successfully', 
        description: `Created ${data.count} toys with QR codes and images` 
      })
      setBulkToyForm({
        seasonId: 0,
        seriesId: 0,
        baseName: '',
        count: 10,
        rarity: 'common',
        colors: ['red', 'blue', 'green'],
        price: '29.99',
        generateQR: true,
        generateImages: true
      })
    },
    onError: () => toast({ title: 'Failed to create bulk toys', variant: 'destructive' })
  })

  const handleCreateSeason = () => {
    if (!newSeason.name || !newSeason.displayName) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' })
      return
    }
    createSeasonMutation.mutate(newSeason)
  }

  const handleCreateSeries = () => {
    if (!newSeries.seasonId || !newSeries.name || !newSeries.displayName) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' })
      return
    }
    createSeriesMutation.mutate(newSeries)
  }

  const handleCreateBulkToys = () => {
    if (!bulkToyForm.seasonId || !bulkToyForm.seriesId || !bulkToyForm.baseName) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' })
      return
    }
    createBulkToysMutation.mutate(bulkToyForm)
  }

  const users = usersQuery.data?.users || []
  const seasons = seasonsQuery.data || []
  const series = seriesQuery.data || []
  const toys = toysQuery.data || []

  const filteredSeries = selectedSeason 
    ? series.filter((s: CollectionSeries) => s.seasonId === selectedSeason)
    : series

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage seasons, series, toys, and system settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="seasons">Seasons</TabsTrigger>
            <TabsTrigger value="series">Series</TabsTrigger>
            <TabsTrigger value="toys">Toys</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Seasons</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {seasons.filter((s: Season) => s.isActive).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Series</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{series.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Toys</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{toys.length}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="seasons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Create New Season
                </CardTitle>
                <CardDescription>
                  Add a new seasonal collection with custom colors and themes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="season-name">Season Name *</Label>
                    <Input
                      id="season-name"
                      placeholder="e.g., Spring 2024"
                      value={newSeason.name}
                      onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="season-display-name">Display Name *</Label>
                    <Input
                      id="season-display-name"
                      placeholder="e.g., Spring Collection"
                      value={newSeason.displayName}
                      onChange={(e) => setNewSeason({ ...newSeason, displayName: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="season-description">Description</Label>
                  <Textarea
                    id="season-description"
                    placeholder="Describe the seasonal collection..."
                    value={newSeason.description}
                    onChange={(e) => setNewSeason({ ...newSeason, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="season-color">Theme Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="season-color"
                      type="color"
                      value={newSeason.backgroundColor}
                      onChange={(e) => setNewSeason({ ...newSeason, backgroundColor: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={newSeason.backgroundColor}
                      onChange={(e) => setNewSeason({ ...newSeason, backgroundColor: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateSeason}
                  disabled={createSeasonMutation.isPending}
                  className="w-full"
                >
                  {createSeasonMutation.isPending ? 'Creating...' : 'Create Season'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Seasons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {seasons.map((season: Season) => (
                    <Card key={season.id} className="border-2" style={{ borderColor: season.backgroundColor }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{season.displayName}</CardTitle>
                          <Badge variant={season.isActive ? "default" : "secondary"}>
                            {season.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {season.description || 'No description'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: season.backgroundColor }}
                          />
                          <span className="text-xs text-gray-500">{season.backgroundColor}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="series" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Create New Series
                </CardTitle>
                <CardDescription>
                  Add a new series within a seasonal collection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="series-season">Season *</Label>
                  <Select
                    value={newSeries.seasonId.toString()}
                    onValueChange={(value) => setNewSeries({ ...newSeries, seasonId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a season" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((season: Season) => (
                        <SelectItem key={season.id} value={season.id.toString()}>
                          {season.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="series-name">Series Name *</Label>
                    <Input
                      id="series-name"
                      placeholder="e.g., Rare Finds"
                      value={newSeries.name}
                      onChange={(e) => setNewSeries({ ...newSeries, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="series-display-name">Display Name *</Label>
                    <Input
                      id="series-display-name"
                      placeholder="e.g., Rare Finds Collection"
                      value={newSeries.displayName}
                      onChange={(e) => setNewSeries({ ...newSeries, displayName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="series-description">Description</Label>
                  <Textarea
                    id="series-description"
                    placeholder="Describe the series..."
                    value={newSeries.description}
                    onChange={(e) => setNewSeries({ ...newSeries, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="series-color">Series Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="series-color"
                      type="color"
                      value={newSeries.backgroundColor}
                      onChange={(e) => setNewSeries({ ...newSeries, backgroundColor: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={newSeries.backgroundColor}
                      onChange={(e) => setNewSeries({ ...newSeries, backgroundColor: e.target.value })}
                      placeholder="#F3F4F6"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateSeries}
                  disabled={createSeriesMutation.isPending}
                  className="w-full"
                >
                  {createSeriesMutation.isPending ? 'Creating...' : 'Create Series'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Series</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {series.map((seriesItem: CollectionSeries) => {
                    const season = seasons.find((s: Season) => s.id === seriesItem.seasonId)
                    return (
                      <Card key={seriesItem.id} className="border-2" style={{ borderColor: seriesItem.backgroundColor }}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{seriesItem.displayName}</CardTitle>
                          <Badge variant="outline">{season?.displayName || 'Unknown Season'}</Badge>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {seriesItem.description || 'No description'}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: seriesItem.backgroundColor }}
                            />
                            <span className="text-xs text-gray-500">{seriesItem.backgroundColor}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="toys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Toy Creation
                </CardTitle>
                <CardDescription>
                  Create multiple toys with automatic QR codes and images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="toy-season">Season *</Label>
                    <Select
                      value={bulkToyForm.seasonId.toString()}
                      onValueChange={(value) => {
                        const seasonId = parseInt(value)
                        setBulkToyForm({ ...bulkToyForm, seasonId, seriesId: 0 })
                        setSelectedSeason(seasonId)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a season" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((season: Season) => (
                          <SelectItem key={season.id} value={season.id.toString()}>
                            {season.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="toy-series">Series *</Label>
                    <Select
                      value={bulkToyForm.seriesId.toString()}
                      onValueChange={(value) => setBulkToyForm({ ...bulkToyForm, seriesId: parseInt(value) })}
                      disabled={!selectedSeason}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a series" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSeries.map((seriesItem: CollectionSeries) => (
                          <SelectItem key={seriesItem.id} value={seriesItem.id.toString()}>
                            {seriesItem.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="toy-base-name">Base Name *</Label>
                    <Input
                      id="toy-base-name"
                      placeholder="e.g., Doluruu Spring"
                      value={bulkToyForm.baseName}
                      onChange={(e) => setBulkToyForm({ ...bulkToyForm, baseName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toy-count">Count</Label>
                    <Input
                      id="toy-count"
                      type="number"
                      min="1"
                      max="100"
                      value={bulkToyForm.count}
                      onChange={(e) => setBulkToyForm({ ...bulkToyForm, count: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="toy-rarity">Rarity</Label>
                    <Select
                      value={bulkToyForm.rarity}
                      onValueChange={(value) => setBulkToyForm({ ...bulkToyForm, rarity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="ultra_rare">Ultra Rare</SelectItem>
                        <SelectItem value="secret">Secret</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toy-price">Price (RP)</Label>
                    <Input
                      id="toy-price"
                      type="number"
                      step="0.01"
                      value={bulkToyForm.price}
                      onChange={(e) => setBulkToyForm({ ...bulkToyForm, price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Colors (select multiple)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black'].map((color) => (
                      <label key={color} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={bulkToyForm.colors.includes(color)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkToyForm({ ...bulkToyForm, colors: [...bulkToyForm.colors, color] })
                            } else {
                              setBulkToyForm({ ...bulkToyForm, colors: bulkToyForm.colors.filter(c => c !== color) })
                            }
                          }}
                        />
                        <span className="capitalize">{color}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <QrCode className="h-4 w-4" />
                      <Label htmlFor="generate-qr">Auto-generate QR Codes</Label>
                    </div>
                    <p className="text-sm text-gray-600">Automatically create unique QR codes for each toy</p>
                  </div>
                  <Switch
                    id="generate-qr"
                    checked={bulkToyForm.generateQR}
                    onCheckedChange={(checked) => setBulkToyForm({ ...bulkToyForm, generateQR: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Image className="h-4 w-4" />
                      <Label htmlFor="generate-images">Auto-generate Images</Label>
                    </div>
                    <p className="text-sm text-gray-600">Create placeholder images for each toy</p>
                  </div>
                  <Switch
                    id="generate-images"
                    checked={bulkToyForm.generateImages}
                    onCheckedChange={(checked) => setBulkToyForm({ ...bulkToyForm, generateImages: checked })}
                  />
                </div>

                <Button 
                  onClick={handleCreateBulkToys}
                  disabled={createBulkToysMutation.isPending}
                  className="w-full"
                >
                  {createBulkToysMutation.isPending ? 'Creating Toys...' : `Create ${bulkToyForm.count} Toys`}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Toys</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {toys.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No toys created yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {toys.slice(0, 12).map((toy: Toy) => (
                        <Card key={toy.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{toy.name}</CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {toy.rarity}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>Series: {toy.series}</span>
                              {toy.color && (
                                <div className="flex items-center gap-1">
                                  <div 
                                    className="w-3 h-3 rounded-full border"
                                    style={{ backgroundColor: toy.color }}
                                  />
                                  <span>{toy.color}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>QR: {toy.qrCode.slice(0, 8)}...</span>
                              <Badge variant={toy.isActivated ? "default" : "secondary"}>
                                {toy.isActivated ? 'Activated' : 'Inactive'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage system users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No users found</p>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user: User) => (
                        <Card key={user.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">
                                  {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}` 
                                    : user.email}
                                </h4>
                                <p className="text-sm text-gray-600">{user.email}</p>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="text-sm">
                                  <span className="text-gray-600">Credits: </span>
                                  <span className="font-medium">RP {user.credits}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-600">Points: </span>
                                  <span className="font-medium">{user.loyaltyPoints}</span>
                                </div>
                                <Badge variant={user.isActive ? "default" : "secondary"}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}