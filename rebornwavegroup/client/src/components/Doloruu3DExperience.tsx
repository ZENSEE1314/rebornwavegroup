import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Doloruu3DExperience: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Create floors
    const floorSize = 20;
    const floorHeight = 5;
    const floors = [
      { name: 'KTV', color: 0xff6b6b, y: 0 },
      { name: 'Lounge', color: 0x4ecdc4, y: 1 },
      { name: 'VIP', color: 0x45b7d1, y: 2 },
      { name: 'Pet', color: 0x96ceb4, y: 3 },
      { name: 'Stage', color: 0xfdcb6e, y: 4 }
    ];

    floors.forEach(floor => {
      const geometry = new THREE.PlaneGeometry(floorSize, floorSize);
      const material = new THREE.MeshStandardMaterial({
        color: floor.color,
        metalness: 0.1,
        roughness: 0.9
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = floor.y * floorHeight;
      scene.add(mesh);
    });

    // Create a simple doloruu character (placeholder)
    const createDoloruu = () => {
      const group = new THREE.Group();

      // Body
      const bodyGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff9aa2 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.2;
      group.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.6, 12, 12);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffb3ba });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 2.0;
      group.add(head);

      // Simple arms
      const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.0, 8);
      const armMat = new THREE.MeshStandardMaterial({ color: 0xff9aa2 });

      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-0.8, 1.5, 0);
      leftArm.rotation.z = Math.PI / 6;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(0.8, 1.5, 0);
      rightArm.rotation.z = -Math.PI / 6;
      group.add(rightArm);

      return group;
    };

    const doloruu = createDoloruu();
    doloruu.position.set(0, 1.2, 5);
    scene.add(doloruu);

    // Animation loop
    let lastTime = 0;
    const animate = (time: number) => {
      requestAnimationFrame(animate);

      const delta = (time - lastTime) / 1000; // seconds
      lastTime = time;

      // Animate doloruu - simple bobbing
      doloruu.position.y = 1.2 + Math.sin(time * 0.002) * 0.2;
      doloruu.rotation.y = time * 0.0005;

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
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-[80vh] bg-gradient-to-t from-indigo-50 via-purple-50 to-pink-50"
    />
  );
};

export default Doloruu3DExperience;