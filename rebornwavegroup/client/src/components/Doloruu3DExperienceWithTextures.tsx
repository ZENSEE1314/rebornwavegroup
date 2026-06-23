import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface FloorConfig {
  id: number;
  name: string;
  description: string;
  color: number;
  textureUrl: string; // URL to Doloruu image for this floor
}

const FLOOR_CONFIGS: FloorConfig[] = [
  {
    id: 1,
    name: "KTV Floor",
    description: "Sing your heart out",
    color: 0xff6b6b,
    textureUrl: "/assets/doluruuBoy.png"
  },
  {
    id: 2,
    name: "Private Lounge",
    description: "Exclusive gatherings",
    color: 0x4ecdc4,
    textureUrl: "/assets/doluruuBaby.png"
  },
  {
    id: 3,
    name: "VIP Suite",
    description: "Luxury experience",
    color: 0x45b7d1,
    textureUrl: "/assets/doluruuFemale.png"
  },
  {
    id: 4,
    name: "Pet Paradise",
    description: "Special area for pets",
    color: 0x96ceb4,
    textureUrl: "/assets/doluruuBlindboxBox.jpeg"
  },
  {
    id: 5,
    name: "Live Stage",
    description: "Live performances",
    color: 0xfdcb6e,
    textureUrl: "/assets/doluruuBoy.png"
  }
];

const Doloruu3DExperienceWithTextures: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [textures, setTextures] = useState<THREE.Texture[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Light blue sky

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Load textures for each floor
    const textureLoader = new THREE.TextureLoader();
    const texturePromises = FLOOR_CONFIGS.map(floor =>
      textureLoader.loadAsync(floor.textureUrl)
    );

    Promise.all(texturePromises)
      .then(loadedTextures => {
        setTextures(loadedTextures);

        // Create floors with textures
        const floorSize = 15;
        const floorHeight = 4;

        FLOOR_CONFIGS.forEach((floor, index) => {
          const geometry = new THREE.PlaneGeometry(floorSize, floorSize);
          const material = new THREE.MeshStandardMaterial({
            map: loadedTextures[index],
            metalness: 0.1,
            roughness: 0.9
          });

          const floorMesh = new THREE.Mesh(geometry, material);
          floorMesh.rotation.x = -Math.PI / 2; // Lay flat
          floorMesh.position.y = index * floorHeight;
          scene.add(floorMesh);
        });

        // Create a floating doloruu character
        const createDoloruuCharacter = () => {
          const group = new THREE.Group();

          // Use the baby doloruu texture for the character
          const characterGeometry = new THREE.PlaneGeometry(2, 3);
          const characterMaterial = new THREE.MeshBasicMaterial({
            map: textures[1], // Baby doloruu texture
            transparent: true
          });

          const character = new THREE.Mesh(characterGeometry, characterMaterial);
          character.position.y = 1.5;
          group.add(character);

          return group;
        };

        const doloruu = createDoloruuCharacter();
        doloruu.position.set(0, 1.5, 5);
        scene.add(doloruu);

        // Animation loop
        let lastTime = 0;
        const animate = (time: number) => {
          requestAnimationFrame(animate);

          const delta = (time - lastTime) / 1000; // seconds
          lastTime = time;

          // Gentle floating animation
          doloruu.position.y = 1.5 + Math.sin(time * 0.001) * 0.3;
          doloruu.rotation.y = time * 0.0002;
          doloruu.rotation.z = Math.sin(time * 0.0005) * 0.1;

          renderer.render(scene, camera);
        };

        requestAnimationFrame(animate);

        // Handle window resize
        const handleResize = () => {
          if (!container) return;

          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          container.removeChild(renderer.domElement);
          // Dispose textures
          loadedTextures.forEach(texture => texture.dispose());
        };
      })
      .catch(error => {
        console.error('Failed to load textures:', error);
        // Fallback to colored floors if textures fail to load
        createFallbackExperience(container, scene, camera, renderer);
      });
  }, []);

  // Fallback experience if textures fail to load
  const createFallbackExperience = (
    container: HTMLDivElement,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) => {
    const floorSize = 15;
    const floorHeight = 4;

    FLOOR_CONFIGS.forEach((floor, index) => {
      const geometry = new THREE.PlaneGeometry(floorSize, floorSize);
      const material = new THREE.MeshStandardMaterial({
        color: floor.color,
        metalness: 0.1,
        roughness: 0.9
      });

      const floorMesh = new THREE.Mesh(geometry, material);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = index * floorHeight;
      scene.add(floorMesh);
    });

    // Simple character
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0xff9aa2 });
    const character = new THREE.Mesh(geometry, material);
    character.position.set(0, 1, 5);
    scene.add(character);

    // Animation loop
    let lastTime = 0;
    const animate = (time: number) => {
      requestAnimationFrame(animate);

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      character.position.y = 1 + Math.sin(time * 0.001) * 0.2;
      character.rotation.y = time * 0.0002;

      renderer.render(scene, camera);
    };

    requestAnimationFrame(animate);

    // Handle window resize
    const handleResize = () => {
      if (!container) return;

      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
    };
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-[70vh] bg-gradient-to-t from-indigo-50 via-purple-50 to-pink-50"
    />
  );
};

export default Doloruu3DExperienceWithTextures;