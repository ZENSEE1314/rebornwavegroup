import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboardClean() {
  const { toast } = useToast();
  
  // Template toy creation form state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateToyForm, setTemplateToyForm] = useState({
    name: "",
    seasonId: "",
    rarity: "common",
    color: "blue",
    gender: "male",
    imageUrl: "",
    quantity: 1
  });

  // Fetch template toys (toys without owners)
  const { data: templateToysResponse, isLoading: templateToysLoading } = useQuery({
    queryKey: ["/api/admin/template-toys"],
  });
  const templateToys = templateToysResponse?.data || [];

  // Fetch seasons for dropdown
  const { data: seasons = [] } = useQuery({
    queryKey: ["/api/seasons"],
  });

  // Create template toy mutation
  const createTemplateToyMutation = useMutation({
    mutationFn: async (toyData: any) => {
      return apiRequest("POST", "/api/admin/toys/create-template", toyData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/template-toys"] });
      setShowTemplateDialog(false);
      setTemplateToyForm({
        name: "",
        seasonId: "",
        rarity: "common",
        color: "blue",
        gender: "male",
        imageUrl: "",
        quantity: 1
      });
      toast({
        title: "Success",
        description: data.message || "Template toys created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template toys",
        variant: "destructive"
      });
    }
  });

  const handleCreateTemplate = () => {
    if (!templateToyForm.name || !templateToyForm.seasonId) {
      toast({
        title: "Missing Information",
        description: "Please fill in toy name and select a season",
        variant: "destructive"
      });
      return;
    }
    createTemplateToyMutation.mutate(templateToyForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Template Toy Management</h1>
          <p className="text-purple-200">Create and manage template toys for seasonal collections</p>
        </div>

        {/* Create Template Toy Button */}
        <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-md border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Plus className="h-5 w-5 mr-2 text-green-400" />
              Bulk Template Toy Creation
            </CardTitle>
            <p className="text-gray-300 text-sm">Create multiple template toys for seasonal collections discovery</p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowTemplateDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Template Toys
            </Button>
          </CardContent>
        </Card>

        {/* Template Toys List */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Created Template Toys ({templateToys.length})
            </CardTitle>
            <p className="text-purple-200 text-sm">Template toys available for seasonal collections</p>
          </CardHeader>
          <CardContent>
            {templateToysLoading ? (
              <div className="text-center py-8 text-gray-400">Loading template toys...</div>
            ) : templateToys.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No template toys created yet</p>
                <p className="text-sm">Create template toys for seasonal collections</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-purple-200">Name</TableHead>
                    <TableHead className="text-purple-200">Season</TableHead>
                    <TableHead className="text-purple-200">Rarity</TableHead>
                    <TableHead className="text-purple-200">Color</TableHead>
                    <TableHead className="text-purple-200">Gender</TableHead>
                    <TableHead className="text-purple-200">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateToys.map((toy: any) => (
                    <TableRow key={toy.id}>
                      <TableCell className="text-white font-medium">{toy.name}</TableCell>
                      <TableCell className="text-purple-200">{toy.season?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          toy.rarity === 'legendary' ? 'default' :
                          toy.rarity === 'epic' ? 'secondary' : 'outline'
                        }>
                          {toy.rarity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: toy.color }}></div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={toy.gender === 'male' ? 'text-blue-400 border-blue-400' : 'text-pink-400 border-pink-400'}>
                          {toy.gender === 'male' ? '♂ Male' : '♀ Female'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          Template
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Template Creation Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Create Template Toys</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Toy Name</Label>
                <Input
                  value={templateToyForm.name}
                  onChange={(e) => setTemplateToyForm({...templateToyForm, name: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter toy name"
                />
              </div>

              <div>
                <Label className="text-gray-300">Season</Label>
                <Select 
                  value={templateToyForm.seasonId} 
                  onValueChange={(value) => setTemplateToyForm({...templateToyForm, seasonId: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {seasons.map((season: any) => (
                      <SelectItem key={season.id} value={season.id.toString()}>
                        {season.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Rarity</Label>
                  <Select 
                    value={templateToyForm.rarity} 
                    onValueChange={(value) => setTemplateToyForm({...templateToyForm, rarity: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="common">Common</SelectItem>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="legendary">Legendary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Gender</Label>
                  <Select 
                    value={templateToyForm.gender} 
                    onValueChange={(value) => setTemplateToyForm({...templateToyForm, gender: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="male">♂ Male</SelectItem>
                      <SelectItem value="female">♀ Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Color</Label>
                  <Select 
                    value={templateToyForm.color} 
                    onValueChange={(value) => setTemplateToyForm({...templateToyForm, color: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                      <SelectItem value="pink">Pink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={templateToyForm.quantity}
                    onChange={(e) => setTemplateToyForm({...templateToyForm, quantity: parseInt(e.target.value) || 1})}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Image URL (Optional)</Label>
                <Input
                  value={templateToyForm.imageUrl}
                  onChange={(e) => setTemplateToyForm({...templateToyForm, imageUrl: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="https://example.com/toy-image.jpg"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => setShowTemplateDialog(false)}
                  variant="outline" 
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={createTemplateToyMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createTemplateToyMutation.isPending ? "Creating..." : "Create Templates"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}