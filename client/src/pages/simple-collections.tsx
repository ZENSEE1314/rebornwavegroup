import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";

interface Season {
  id: number;
  name: string;
  displayName: string;
  description: string;
  backgroundColor: string;
}

interface SeasonalToy {
  id: number;
  name: string;
  imageUrl: string;
  isTemplate: boolean;
  rarity: string;
  color: string;
  gender: string;
}

export default function SimpleCollections() {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  // Fetch seasons
  const { data: seasons = [], isLoading: loadingSeasons } = useQuery<Season[]>({
    queryKey: ['/api/seasons'],
  });

  // Fetch toys for selected season
  const { data: seasonToys = [], isLoading: loadingSeasonToys } = useQuery<SeasonalToy[]>({
    queryKey: ['/api/seasons', selectedSeason, 'toys'],
    enabled: !!selectedSeason,
  });

  // Filter only toy templates
  const toyTemplates = seasonToys.filter(toy => toy.isTemplate === true);
  
  // Debug template filtering
  console.log('*** TEMPLATE FILTERING DEBUG:', {
    allToys: seasonToys.map(t => ({ id: t.id, name: t.name, isTemplate: t.isTemplate })),
    templatesFound: toyTemplates.map(t => ({ id: t.id, name: t.name, isTemplate: t.isTemplate }))
  });

  console.log('*** SIMPLE COLLECTIONS DEBUG:', {
    selectedSeason,
    seasonsLoaded: seasons.length,
    loadingSeasons,
    seasonToys: seasonToys.length,
    toyTemplates: toyTemplates.length,
    loadingSeasonToys,
    queryEnabled: !!selectedSeason,
    actualSeasonToys: seasonToys
  });

  const selectedSeasonData = seasons.find(s => s.id === selectedSeason);

  if (loadingSeasons) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedSeason) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Seasonal Collections</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {seasons.map((season) => (
            <Card 
              key={season.id} 
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => setSelectedSeason(season.id)}
            >
              <CardHeader>
                <CardTitle className="text-xl">{season.displayName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{season.description}</p>
                <Button className="w-full">
                  View Collection
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedSeason(null)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Button>
        <h1 className="text-3xl font-bold">{selectedSeasonData?.displayName}</h1>
      </div>

      {loadingSeasonToys ? (
        <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      ) : toyTemplates.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {toyTemplates.map((toy) => (
            <div key={toy.id} className="aspect-square relative">
              {toy.imageUrl ? (
                <img 
                  src={toy.imageUrl} 
                  alt=""
                  className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl bg-gray-100 rounded-lg">
                  🧸
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No toy templates found in this season yet.</p>
          <p className="text-sm">Check back later for new additions!</p>
        </div>
      )}
    </div>
  );
}