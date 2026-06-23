import { useEffect, useState, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import * as THREE from 'three';
import { useTranslation } from '@/lib/i18n';
import Doloruu3DExperience from '@/components/Doloruu3DExperience';

interface Floor {
  id: number;
  name: string;
  description: string;
  icon: React.ComponentType<any> | string;
  color: string;
  order: number;
}

const floors: Floor[] = [
  {
    id: 1,
    name: 'KTV Floor',
    description: 'Sing your heart out in private karaoke rooms',
    icon: '🎤',
    color: '#ff6b6b',
    order: 1
  },
  {
    id: 2,
    name: 'Private Lounge',
    description: 'Exclusive lounge for intimate gatherings',
    icon: '🥂',
    color: '#4ecdc4',
    order: 2
  },
  {
    id: 3,
    name: 'VIP Suite',
    description: 'Luxury VIP experience with premium services',
    icon: '👑',
    color: '#45b7d1',
    order: 3
  },
  {
    id: 4,
    name: 'Pet Paradise',
    description: 'Special play area and cafe for pets',
    icon: '🐾',
    color: '#96ceb4',
    order: 4
  },
  {
    id: 5,
    name: 'Live Stage',
    description: 'Live performances, bands, and entertainment',
    icon: '🎵',
    color: '#fdcb6e',
    order: 5
  }
];

const DoloruuExperiencePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [currentFloor, setCurrentFloor] = useState(1);
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.1
  });

  // Update current floor based on scroll position
  useEffect(() => {
    if (!inView) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const sectionTop = document.getElementById('doloruu-experience')?.offsetTop || 0;
      const sectionHeight = document.getElementById('doloruu-experience')?.offsetHeight || windowHeight * 4;

      const relativePosition = Math.max(0, Math.min(1, (scrollPosition - sectionTop + windowHeight * 0.3) / sectionHeight));
      const floorNumber = Math.floor(relativePosition * 5) + 1;

      if (floorNumber >= 1 && floorNumber <= 5 && floorNumber !== currentFloor) {
        setCurrentFloor(floorNumber);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [inView, currentFloor]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/20 backdrop-blur-sm sticky top-0 z-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gradient bg-clip-text text-transparent from-emerald-400 to-tear-500">
              Doloruu's 5-Floor Journey
            </h1>
            <nav className="hidden md:flex space-x-6">
              {floors.map(floor => (
                <a
                  key={floor.id}
                  href={`#floor-${floor.id}`}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentFloor === floor.order
                      ? 'bg-white/20 backdrop-blur-sm text-white'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {floor.icon} {floor.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {/* 3D Experience Section */}
        <section id="doloruu-experience" className="h-[100vh] flex flex-col items-center justify-center">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gradient bg-clip-text text-transparent from-emerald-400 to-teal-500 mb-4">
              Experience the Magic
            </h2>
            <p className="text-lg text-gray-600 max-w-xl">
              Join Doloruu on an enchanting journey through five magical floors,
              each with its own unique theme and atmosphere. As you scroll down,
              watch Doloruu explore each level in beautiful 3D.
            </p>
          </div>

          <div ref={ref} className="w-full max-w-4xl h-[60vh]">
            <Doloruu3DExperience />
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-4">
              {[1, 2, 3, 4, 5].map(num => (
                <div
                  key={num}
                  className={`flex items-center space-x-2 ${
                    num === currentFloor
                      ? 'text-xl font-bold'
                      : 'text-gray-400'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full"
                       style={{ backgroundColor: floors[num-1].color }}></div>
                  <span>{floors[num-1].name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Floor Details */}
        <section className="py-20 bg-white/5 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Discover Each Floor
            </h2>

            <div className="space-y-12">
              {floors.map(floor => (
                <div
                  key={floor.id}
                  id={`floor-${floor.id}`}
                  className={`border-l-4 border-l-${floor.color === '#ff6b6b' ? 'red-500' :
                           floor.color === '#4ecdc4' ? 'teal-500' :
                           floor.color === '#45b7d1' ? 'blue-500' :
                           floor.color === '#96ceb4' ? 'green-500' : 'yellow-500'}
                           pl-6 py-8`}
                >
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[${floor.color}]/20">
                        <span className="text-2xl">{floor.icon}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2">{floor.name}</h3>
                      <p className="text-gray-600 lg:w-2/3">
                        {floor.description}
                      </p>
                      {currentFloor === floor.order && (
                        <div className="mt-4 p-3 bg-[${floor.color}]/10 rounded-lg">
                          <span className="text-[{floor.color}] font-medium">
                            👉 You are currently exploring this floor!
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 text-center bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Join the Adventure?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Experience all five floors of Doloruu's magical world.
              Each level offers unique activities, entertainment, and memories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30
                           text-white font-medium rounded-lg transition-all duration-300"
              >
                Learn More
              </button>
              <button
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500
                           text-white font-medium rounded-lg hover:from-rose-600 hover:to-pink-600
                           transform hover:scale-105 transition-all duration-300"
              >
                Start Journey
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} Reborn Wave Group. All rights reserved.</p>
          <p className="mt-2 text-sm">
            Doloruu is the official mascot of Reborn Wave Group
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DoloruuExperiencePage;