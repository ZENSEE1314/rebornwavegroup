import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const { data: seasons = [], isLoading: loadingSeasons } = useQuery<Season[]>({
    queryKey: ['/api/seasons'],
  });

  const { data: seasonToys = [], isLoading: loadingSeasonToys } = useQuery<SeasonalToy[]>({
    queryKey: ['/api/seasons', selectedSeason, 'toys'],
    queryFn: async () => {
      console.log('*** FETCHING TOYS for season:', selectedSeason);
      const response = await fetch(`/api/seasons/${selectedSeason}/toys`);
      if (!response.ok) throw new Error('Failed to fetch toys');
      const data = await response.json();
      console.log('*** TOYS RESPONSE:', data);
      return data;
    },
    enabled: !!selectedSeason,
  });

  const toyTemplates = seasonToys.filter(toy => toy.isTemplate === true);

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
      <div className="rwg-page-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/40 text-sm">Loading collections...</p>
        </div>
      </div>
    );
  }

  if (!selectedSeason) {
    return (
      <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
        <div className="rwg-orb-1" />
        <div className="rwg-orb-2" />
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Seasonal Collections</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {seasons.map((season) => (
              <div
                key={season.id}
                className="rwg-card p-6 cursor-pointer hover:border-violet-500/40 transition-all duration-200 hover:scale-[1.02]"
                onClick={() => {
                  console.log('*** SEASON CLICKED:', season.id, season.name);
                  setSelectedSeason(season.id);
                }}
              >
                <h3 className="text-xl font-bold text-white mb-2">{season.displayName}</h3>
                <p className="text-white/60 mb-4">{season.description}</p>
                <Button className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl">
                  View Collection
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setSelectedSeason(null)}
            className="flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collections
          </Button>
          <h1 className="text-3xl font-bold text-white">{selectedSeasonData?.displayName}</h1>
        </div>

        {loadingSeasonToys ? (
          <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-white/10 rounded-xl"></div>
            ))}
          </div>
        ) : toyTemplates.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {toyTemplates.map((toy) => (
              <div key={toy.id} className="aspect-square relative group">
                {toy.imageUrl ? (
                  <img
                    src={toy.imageUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-xl shadow-md group-hover:shadow-violet-500/20 transition-shadow"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl bg-white/5 border border-white/10 rounded-xl">
                    🧸
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rwg-card text-center py-16">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="text-white/60">No toy templates found in this season yet.</p>
            <p className="text-sm text-white/40 mt-1">Check back later for new additions!</p>
          </div>
        )}
      </div>
    </div>
  );
}
