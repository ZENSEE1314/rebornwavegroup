import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, DollarSign, Calendar, Gift, Copy, Plus, Star, 
  Crown, Trophy, Award, Medal, Zap, Home, User, LogOut,
  QrCode, Globe, Phone, Camera, Trash2, Edit3, ShoppingBag, Package, Database, Check, X, AlertTriangle, Eye, UserCheck, Target, Clock,
  Heart, Droplets, Bed, Sparkles, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight
} from "lucide-react";
import logoImage from "@assets/2-removebg-preview.png";
import toyImage from "@assets/Plush_Dinosaur_with_Colorful_Spikes-removebg-preview.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GenealogyTree from "@/components/genealogy-tree";
import { getCategorySymbol, getSymbolById } from "@/lib/rewardSymbols";
import CreditTopUpModal from "@/components/CreditTopUpModal";

// Helper function to format sleep timer as MM:SS
function formatSleepTime(timeRemaining: number): string {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Simple Pet Name Edit Modal Component
function PetNameEditModal({ 
  isOpen, 
  onClose, 
  petName, 
  petId, 
  userTokens, 
  language,
  onSuccess 
}: {
  isOpen: boolean;
  onClose: () => void;
  petName: string;
  petId: number;
  userTokens: number;
  language: string;
  onSuccess: () => void;
}) {
  const [newName, setNewName] = useState(petName);
  const { toast } = useToast();

  const editNameMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("PATCH", `/api/pets/${petId}/name`, { name });
    },
    onSuccess: () => {
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Nama pet berhasil diubah!" : "Pet name updated successfully!",
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: error.message || (language === "id" ? "Gagal mengubah nama" : "Failed to update name"),
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (!newName.trim()) {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: language === "id" ? "Nama tidak boleh kosong" : "Name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (userTokens < 5) {
      toast({
        title: language === "id" ? "Token Tidak Cukup" : "Insufficient Tokens",
        description: language === "id" ? "Butuh 5 token untuk mengubah nama" : "Need 5 tokens to change name",
        variant: "destructive",
      });
      return;
    }

    editNameMutation.mutate(newName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {language === "id" ? "Edit Nama Pet" : "Edit Pet Name"}
          </h3>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {language === "id" ? "Nama Baru" : "New Name"}
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={language === "id" ? "Masukkan nama baru..." : "Enter new name..."}
              maxLength={50}
            />
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700">
              {language === "id" 
                ? "Biaya: 5 token. Token saat ini: " + userTokens
                : "Cost: 5 tokens. Current tokens: " + userTokens
              }
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {language === "id" ? "Batal" : "Cancel"}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={editNameMutation.isPending}
              className="flex-1"
            >
              {editNameMutation.isPending 
                ? (language === "id" ? "Menyimpan..." : "Saving...")
                : (language === "id" ? "Simpan" : "Save")
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompleteApp() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Clean state management
  const [activeTab, setActiveTab] = useState("home");
  const [language, setLanguage] = useState("en");
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [selectedPetForEdit, setSelectedPetForEdit] = useState<any>(null);

  // Fetch user's pets
  const { data: pets = [], isLoading: petsLoading, refetch: refetchPets } = useQuery({
    queryKey: ["/api/pets"],
    enabled: !!(user as any)?.id,
    retry: 1,
    refetchInterval: 3000,
  });

  // Fetch user stats
  const { data: userStats = {} } = useQuery({
    queryKey: ["/api/user-stats"],
    enabled: !!(user as any)?.id,
  });

  // Pet name editing mutation
  const editNameMutation = useMutation({
    mutationFn: async ({ petId, name }: { petId: number; name: string }) => {
      return await apiRequest("PATCH", `/api/pets/${petId}/name`, { name });
    },
    onSuccess: () => {
      toast({
        title: language === "id" ? "Berhasil!" : "Success!",
        description: language === "id" ? "Nama pet berhasil diubah!" : "Pet name updated successfully!",
      });
      refetchPets();
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
      setShowNameEditModal(false);
      setSelectedPetForEdit(null);
    },
    onError: (error: any) => {
      toast({
        title: language === "id" ? "Error" : "Error",
        description: error.message || (language === "id" ? "Gagal mengubah nama" : "Failed to update name"),
        variant: "destructive",
      });
    }
  });

  const safePets = Array.isArray(pets) ? pets : [];
  const currentPet = safePets[currentPetIndex];

  const openNameEdit = (pet: any) => {
    if (((userStats as any)?.tokens || 0) < 5) {
      toast({
        title: language === "id" ? "Token Tidak Cukup" : "Insufficient Tokens",
        description: language === "id" ? "Butuh 5 token untuk mengubah nama" : "Need 5 tokens to edit name",
        variant: "destructive"
      });
      return;
    }
    setSelectedPetForEdit(pet);
    setShowNameEditModal(true);
  };

  const closeNameEdit = () => {
    setShowNameEditModal(false);
    setSelectedPetForEdit(null);
  };

  const handleNameEditSuccess = () => {
    refetchPets();
    queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
  };

  if (authLoading || petsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src={logoImage} alt="Logo" className="w-12 h-12" />
                <div>
                  <CardTitle className="text-2xl">
                    {language === "id" ? "Pet Care Dashboard" : "Pet Care Dashboard"}
                  </CardTitle>
                  <p className="text-gray-600">
                    {language === "id" ? `Selamat datang, ${(user as any)?.firstName || (user as any)?.email}` : `Welcome, ${(user as any)?.firstName || (user as any)?.email}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLanguage(language === "en" ? "id" : "en")}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  {language === "en" ? "ID" : "EN"}
                </Button>
                <Badge variant="secondary">
                  {(userStats as any)?.tokens || 0} {language === "id" ? "Token" : "Tokens"}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Pet Display */}
        {safePets.length > 0 && currentPet && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{currentPet.name}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openNameEdit(currentPet)}
                    className="text-xs"
                  >
                    ✏️ {language === "id" ? "Edit (5 token)" : "Edit (5 tokens)"}
                  </Button>
                </div>
                <Badge variant="secondary">
                  {language === "id" ? "Level" : "Level"} {currentPet.level || 1}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">❤️</div>
                  <div className="text-sm font-medium">
                    {language === "id" ? "Kebahagiaan" : "Happiness"}
                  </div>
                  <Progress value={currentPet.happiness || 0} className="mt-2" />
                  <div className="text-xs text-gray-500 mt-1">
                    {currentPet.happiness || 0}%
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">🍖</div>
                  <div className="text-sm font-medium">
                    {language === "id" ? "Lapar" : "Hunger"}
                  </div>
                  <Progress value={currentPet.hunger || 0} className="mt-2" />
                  <div className="text-xs text-gray-500 mt-1">
                    {currentPet.hunger || 0}%
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">🧼</div>
                  <div className="text-sm font-medium">
                    {language === "id" ? "Kebersihan" : "Cleanliness"}
                  </div>
                  <Progress value={currentPet.cleanliness || 0} className="mt-2" />
                  <div className="text-xs text-gray-500 mt-1">
                    {currentPet.cleanliness || 0}%
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="text-sm font-medium">
                    {language === "id" ? "Energi" : "Energy"}
                  </div>
                  <Progress value={currentPet.energy || 0} className="mt-2" />
                  <div className="text-xs text-gray-500 mt-1">
                    {currentPet.energy || 0}%
                  </div>
                </div>
              </div>

              {/* Pet Navigation */}
              {safePets.length > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPetIndex(Math.max(0, currentPetIndex - 1))}
                    disabled={currentPetIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentPetIndex + 1} / {safePets.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPetIndex(Math.min(safePets.length - 1, currentPetIndex + 1))}
                    disabled={currentPetIndex === safePets.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Pets Message */}
        {safePets.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🐾</div>
              <h3 className="text-xl font-semibold mb-2">
                {language === "id" ? "Belum Ada Pet" : "No Pets Yet"}
              </h3>
              <p className="text-gray-600">
                {language === "id" 
                  ? "Aktifkan mainan untuk mendapatkan pet pertama Anda!"
                  : "Activate toys to get your first pet!"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pet Name Edit Modal */}
      {selectedPetForEdit && (
        <PetNameEditModal
          isOpen={showNameEditModal}
          onClose={closeNameEdit}
          petName={selectedPetForEdit.name}
          petId={selectedPetForEdit.id}
          userTokens={(userStats as any)?.tokens || 0}
          language={language}
          onSuccess={handleNameEditSuccess}
        />
      )}
    </div>
  );
}