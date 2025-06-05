import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SimplePetTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingPetId, setEditingPetId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['/api/user-stats'],
    enabled: !!user?.id,
  });

  // Fetch pets
  const { data: pets = [], refetch: refetchPets } = useQuery({
    queryKey: ['/api/pets'],
    enabled: !!user?.id,
  });

  // Fetch sleep progress for first pet
  const { data: sleepProgress } = useQuery({
    queryKey: ['/api/pets', pets[0]?.id, 'sleep-progress'],
    enabled: !!pets[0]?.id && pets[0]?.isSleeping,
    refetchInterval: 5000,
  });

  // Edit pet name mutation
  const editPetMutation = useMutation({
    mutationFn: async ({ petId, name }: { petId: number; name: string }) => {
      return await apiRequest('PUT', `/api/pets/${petId}/name`, { name });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pet name updated successfully!",
      });
      setEditingPetId(null);
      setNewName("");
      refetchPets();
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pet name",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (pet: any) => {
    const userTokens = userStats?.tokens || 0;
    if (userTokens < 5) {
      toast({
        title: "Insufficient Tokens",
        description: "Need 5 tokens to edit pet name",
        variant: "destructive"
      });
      return;
    }
    setEditingPetId(pet.id);
    setNewName(pet.name);
  };

  const handleSaveName = () => {
    if (!editingPetId || !newName.trim()) return;
    editPetMutation.mutate({ petId: editingPetId, name: newName.trim() });
  };

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) return <div>Please log in</div>;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pet Test Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>User Tokens:</strong> {userStats?.tokens || 0}
          </div>
          
          {pets.map((pet: any) => (
            <div key={pet.id} className="border p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{pet.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(pet)}
                  disabled={(userStats?.tokens || 0) < 5}
                >
                  Edit Name (5 tokens)
                </Button>
              </div>
              
              {pet.isSleeping && (
                <div className="text-sm text-blue-600">
                  Sleeping - Next energy in: {
                    sleepProgress?.nextEnergyIn 
                      ? formatTime(sleepProgress.nextEnergyIn)
                      : "Loading..."
                  }
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Energy: {pet.energy}% | Hunger: {pet.hunger}% | Clean: {pet.cleanliness}%
              </div>
            </div>
          ))}

          {editingPetId && (
            <div className="border-2 border-blue-500 p-4 rounded bg-blue-50">
              <h3 className="font-semibold mb-2">Edit Pet Name</h3>
              <p className="text-sm text-gray-600 mb-3">
                Cost: 5 tokens (Current: {userStats?.tokens || 0})
              </p>
              <div className="space-y-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new name"
                  maxLength={20}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveName}
                    disabled={editPetMutation.isPending || !newName.trim()}
                  >
                    {editPetMutation.isPending ? "Saving..." : "Save (5 tokens)"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingPetId(null);
                      setNewName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}