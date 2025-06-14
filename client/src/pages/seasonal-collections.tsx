import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Star, Calendar, Trophy, Lock, CheckCircle2 } from "lucide-react";

interface Season {
  id: number;
  name: string;
  displayName: string;
  description: string;
  iconUrl: string;
  backgroundColor: string;
  isActive: boolean;
  displayOrder: number;
}

interface CollectionSector {
  id: number;
  seasonId: number;
  name: string;
  displayName: string;
  description: string;
  iconSymbol: string;
  backgroundColor: string;
  unlockCondition: string;
  isUnlocked: boolean;
  displayOrder: number;
}

interface SeasonalToy {
  id: number;
  name: string;
  series: string;
  rarity: string;
  color: string;
  imageUrl: string;
  ownerId: string;
  isActivated: boolean;
  seasonId: number;
  sectorId: number;
  collectionProgress: number;
  isSeasonalExclusive: boolean;
  releaseDate: string;
  isOwned: boolean;
}

interface UserCollectionProgress {
  id: number;
  seasonId: number;
  sectorId: number;
  totalItems: number;
  collectedItems: number;
  completionPercentage: number;
  isCompleted: boolean;
  lastUpdated: string;
  season: {
    id: number;
    name: string;
    displayName: string;
    backgroundColor: string;
  };
  sector: {
    id: number;
    name: string;
    displayName: string;
    iconSymbol: string;
  };
}

const getRarityColor = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'common': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'rare': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ultra_rare': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'secret': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRarityIcon = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'common': return <Star className="w-3 h-3" />;
    case 'rare': return <Sparkles className="w-3 h-3" />;
    case 'ultra_rare': return <Trophy className="w-3 h-3" />;
    case 'secret': return <CheckCircle2 className="w-3 h-3" />;
    default: return <Star className="w-3 h-3" />;
  }
};

export default function SeasonalCollections() {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedSector, setSelectedSector] = useState<number | null>(null);

  // Fetch all seasons
  const { data: seasons = [], isLoading: loadingSeasons } = useQuery<Season[]>({
    queryKey: ['/api/seasons'],
  });

  // Fetch sectors for selected season
  const { data: sectors = [], isLoading: loadingSectors } = useQuery<CollectionSector[]>({
    queryKey: ['/api/seasons', selectedSeason, 'sectors'],
    enabled: !!selectedSeason,
  });

  // Fetch toys for selected season/sector
  const { data: toys = [], isLoading: loadingToys } = useQuery<SeasonalToy[]>({
    queryKey: ['/api/seasons', selectedSeason, 'toys', selectedSector],
    enabled: !!selectedSeason,
  });

  // Fetch user's collection progress
  const { data: userProgress = [] } = useQuery<UserCollectionProgress[]>({
    queryKey: ['/api/user/collection-progress'],
  });

  // Set default selected season on load
  useEffect(() => {
    if (seasons.length > 0 && !selectedSeason) {
      setSelectedSeason(seasons[0].id);
    }
  }, [seasons, selectedSeason]);

  // Get progress for current season
  const getSeasonProgress = (seasonId: number) => {
    const progress = userProgress.filter(p => p.seasonId === seasonId);
    if (progress.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = progress.reduce((sum, p) => sum + p.collectedItems, 0);
    const total = progress.reduce((sum, p) => sum + p.totalItems, 0);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  // Get progress for current sector
  const getSectorProgress = (sectorId: number) => {
    const progress = userProgress.find(p => p.sectorId === sectorId);
    return progress || { collectedItems: 0, totalItems: 0, completionPercentage: 0 };
  };

  if (loadingSeasons) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedSeasonData = seasons.find(s => s.id === selectedSeason);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Seasonal Collections
        </h1>
        <p className="text-gray-600">
          Discover and collect exclusive seasonal treasures throughout the year
        </p>
      </div>

      {/* Season Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {seasons.map((season) => {
          const progress = getSeasonProgress(season.id);
          const isSelected = selectedSeason === season.id;
          
          return (
            <Card 
              key={season.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
              style={{ borderColor: season.backgroundColor }}
              onClick={() => {
                setSelectedSeason(season.id);
                setSelectedSector(null);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: season.backgroundColor }}
                  >
                    {season.displayName.charAt(0)}
                  </div>
                  {progress.percentage === 100 && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <CardTitle className="text-sm">{season.displayName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-gray-600 line-clamp-2">{season.description}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progress</span>
                    <span>{progress.completed}/{progress.total}</span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                  <div className="text-xs text-center text-gray-500">
                    {progress.percentage}% Complete
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Season Details */}
      {selectedSeasonData && (
        <div className="space-y-6">
          <Card style={{ backgroundColor: `${selectedSeasonData.backgroundColor}10` }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedSeasonData.backgroundColor }}
                >
                  {selectedSeasonData.displayName.charAt(0)}
                </div>
                {selectedSeasonData.displayName}
              </CardTitle>
              <CardDescription>{selectedSeasonData.description}</CardDescription>
            </CardHeader>
          </Card>

          {/* Collection Sectors */}
          {loadingSectors ? (
            <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectors.map((sector) => {
                const progress = getSectorProgress(sector.id);
                const isSelected = selectedSector === sector.id;
                
                return (
                  <Card 
                    key={sector.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected ? 'ring-2 ring-blue-400' : ''
                    } ${!sector.isUnlocked ? 'opacity-60' : ''}`}
                    style={{ backgroundColor: sector.backgroundColor }}
                    onClick={() => sector.isUnlocked && setSelectedSector(sector.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{sector.iconSymbol}</span>
                          <div>
                            <CardTitle className="text-sm">{sector.displayName}</CardTitle>
                            <CardDescription className="text-xs">{sector.description}</CardDescription>
                          </div>
                        </div>
                        {!sector.isUnlocked && <Lock className="w-4 h-4 text-gray-400" />}
                        {progress.completionPercentage === 100 && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Collected</span>
                          <span>{progress.collectedItems}/{progress.totalItems}</span>
                        </div>
                        <Progress value={progress.completionPercentage} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Toys Grid */}
          {selectedSector && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  {sectors.find(s => s.id === selectedSector)?.displayName} Collection
                </h3>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {toys.filter(t => t.isOwned).length} / {toys.length} Collected
                </Badge>
              </div>

              {loadingToys ? (
                <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {toys.map((toy) => (
                    <Card 
                      key={toy.id}
                      className={`relative transition-all duration-200 hover:shadow-lg ${
                        toy.isOwned ? 'ring-2 ring-green-400' : 'opacity-60 grayscale'
                      }`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                          {toy.imageUrl ? (
                            <img 
                              src={toy.imageUrl} 
                              alt={toy.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                              🧸
                            </div>
                          )}
                          
                          {/* Ownership indicator */}
                          {toy.isOwned && (
                            <div className="absolute top-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          )}

                          {/* Seasonal exclusive badge */}
                          {toy.isSeasonalExclusive && (
                            <div className="absolute top-1 left-1">
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                <Sparkles className="w-2 h-2 mr-1" />
                                Exclusive
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-medium line-clamp-1">{toy.name}</h4>
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getRarityColor(toy.rarity)}`}
                            >
                              {getRarityIcon(toy.rarity)}
                              <span className="ml-1 capitalize">{toy.rarity.replace('_', ' ')}</span>
                            </Badge>
                            {toy.color && (
                              <div 
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: toy.color }}
                                title={toy.color}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {toys.length === 0 && !loadingToys && (
                <div className="text-center py-12 text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No collectibles found in this sector yet.</p>
                  <p className="text-sm">Check back later for new additions!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedSeasonData && seasons.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a season above to explore its collections</p>
        </div>
      )}
    </div>
  );
}