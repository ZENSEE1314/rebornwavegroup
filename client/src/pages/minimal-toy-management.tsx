import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

export function MinimalToyManagement() {
  const { data: toysResponse, isLoading: toysLoading, error: toysError } = useQuery({
    queryKey: ['/api/admin/all-toys'],
  });

  const toysData = Array.isArray(toysResponse?.data) ? toysResponse.data : [];

  return (
    <TabsContent value="toys">
      <div className="space-y-6">
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Toy Management Dashboard</CardTitle>
            <p className="text-gray-300 text-sm">Overview of toy inventory and management tools</p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-white text-lg mb-4">
                Toy Management System
              </div>
              {toysLoading ? (
                <div className="text-gray-300 mb-6">Loading toy data...</div>
              ) : toysError ? (
                <div className="text-red-400 mb-6">Error loading toys</div>
              ) : (
                <div className="text-gray-300 mb-6">
                  {toysData.length} toys in system
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {toysLoading ? "--" : toysData.length}
                  </div>
                  <div className="text-sm text-gray-300">Total Toys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {toysLoading ? "--" : toysData.filter((toy: any) => toy.owner).length}
                  </div>
                  <div className="text-sm text-gray-300">Owned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {toysLoading ? "--" : toysData.filter((toy: any) => !toy.owner).length}
                  </div>
                  <div className="text-sm text-gray-300">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {toysLoading ? "--" : toysData.filter((toy: any) => 
                      toy.rarity === 'legendary' || toy.rarity === 'secret'
                    ).length}
                  </div>
                  <div className="text-sm text-gray-300">Rare Items</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}