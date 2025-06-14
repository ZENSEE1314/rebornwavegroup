          {/* Simplified Toy Management Tab */}
          <TabsContent value="toys">
            <div className="space-y-6">
              {/* Toy List Display */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">Toy Management ({(toysResponse?.data || []).length} toys)</CardTitle>
                    <Button 
                      onClick={() => downloadCSV(toysResponse?.data || [], 'toys')}
                      variant="outline" 
                      size="sm"
                      className="bg-white/10 text-white border-white/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search toys..."
                        value={toySearch}
                        onChange={(e) => setToySearch(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                      />
                    </div>
                    <Select value={rarityFilter} onValueChange={setRarityFilter}>
                      <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Filter by rarity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Rarities</SelectItem>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                        <SelectItem value="secret">Secret</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {toysLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="text-white">Loading toys...</div>
                    </div>
                  ) : toysError ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="text-red-400">Error loading toys: {String(toysError)}</div>
                    </div>
                  ) : !toysResponse?.data || toysResponse.data.length === 0 ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="text-gray-300">No toys found</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/20">
                            <TableHead className="text-blue-200">ID</TableHead>
                            <TableHead className="text-blue-200">Name</TableHead>
                            <TableHead className="text-blue-200">Series</TableHead>
                            <TableHead className="text-blue-200">Rarity</TableHead>
                            <TableHead className="text-blue-200">Owner</TableHead>
                            <TableHead className="text-blue-200">QR Code</TableHead>
                            <TableHead className="text-blue-200">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredToys.map((toy: any) => (
                            <TableRow key={toy.id} className="border-white/10">
                              <TableCell className="text-white">{toy.id}</TableCell>
                              <TableCell className="text-white">{toy.name || 'Unnamed'}</TableCell>
                              <TableCell className="text-gray-300">{toy.series || 'No Series'}</TableCell>
                              <TableCell>
                                <Badge className={getRarityColor(toy.rarity || 'common')}>
                                  {toy.rarity || 'common'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {toy.owner ? `${toy.owner.firstName || ''} ${toy.owner.lastName || ''}`.trim() || toy.owner.email : 'No Owner'}
                              </TableCell>
                              <TableCell className="text-gray-300 font-mono text-xs">{toy.qrCode || 'No QR'}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (confirm(`Delete toy "${toy.name}"?`)) {
                                      deleteToyMutation.mutate(toy.id);
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white border-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>