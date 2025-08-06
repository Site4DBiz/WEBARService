'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ARSceneProps {
  scene: THREE.Scene | null;
  anchor: any;
  modelUrl?: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const ARScene: React.FC<ARSceneProps> = ({
  scene,
  anchor,
  modelUrl,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const modelRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (!scene || !anchor) return;

    const loadModel = async () => {
      if (modelUrl) {
        const loader = new THREE.ObjectLoader();
        
        try {
          const response = await fetch(modelUrl);
          const modelData = await response.json();
          const model = loader.parse(modelData);
          
          model.scale.set(scale, scale, scale);
          model.position.set(...position);
          model.rotation.set(...rotation);
          
          anchor.group.add(model);
          modelRef.current = model;
        } catch (error) {
          console.error('Error loading 3D model:', error);
          
          const fallbackGeometry = new THREE.SphereGeometry(0.1, 32, 32);
          const fallbackMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
          const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
          
          fallbackMesh.scale.set(scale, scale, scale);
          fallbackMesh.position.set(...position);
          
          anchor.group.add(fallbackMesh);
          modelRef.current = fallbackMesh;
        }
      } else {
        const geometry = new THREE.TorusKnotGeometry(0.1, 0.03, 100, 16);
        const material = new THREE.MeshPhongMaterial({
          color: 0x00ffff,
          emissive: 0x004444,
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        
        anchor.group.add(mesh);
        modelRef.current = mesh;

        const animate = () => {
          if (modelRef.current) {
            modelRef.current.rotation.y += 0.01;
          }
          requestAnimationFrame(animate);
        };
        animate();
      }

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(0, 10, 10);
      scene.add(light);

      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);
    };

    loadModel();

    return () => {
      if (modelRef.current && anchor) {
        anchor.group.remove(modelRef.current);
      }
    };
  }, [scene, anchor, modelUrl, scale, position, rotation]);

  return null;
};