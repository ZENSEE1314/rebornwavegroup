                    {/* Pet Stats with Real-time Values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">😊</div>
                        <div className="text-sm font-medium text-gray-700">
                          {language === "id" ? "Kebahagiaan" : "Happiness"}
                        </div>
                        <div className={`text-2xl font-bold ${
                          happiness >= 75 ? 'text-green-600' :
                          happiness >= 50 ? 'text-purple-600' :
                          happiness >= 25 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {happiness}%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">🍎</div>
                        <div className="text-sm font-medium text-gray-700">
                          {language === "id" ? "Lapar" : "Hunger"}
                        </div>
                        <div className={`text-2xl font-bold ${
                          hunger >= 75 ? 'text-green-600' :
                          hunger >= 50 ? 'text-purple-600' :
                          hunger >= 25 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {hunger}%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">🛁</div>
                        <div className="text-sm font-medium text-gray-700">
                          {language === "id" ? "Kebersihan" : "Cleanliness"}
                        </div>
                        <div className={`text-2xl font-bold ${
                          cleanliness >= 75 ? 'text-green-600' :
                          cleanliness >= 50 ? 'text-purple-600' :
                          cleanliness >= 25 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {cleanliness}%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">⚡</div>
                        <div className="text-sm font-medium text-gray-700">
                          {language === "id" ? "Energi" : "Energy"}
                        </div>
                        <div className={`text-2xl font-bold ${
                          energy >= 75 ? 'text-green-600' :
                          energy >= 50 ? 'text-purple-600' :
                          energy >= 25 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {energy}%
                        </div>
                      </div>
                    </div>