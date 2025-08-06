'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface MindARConfig {
  type: 'image' | 'face';
  imageTargetSrc?: string;
  maxTrack?: number;
  filterMinCF?: number;
  filterBeta?: number;
  warmupTolerance?: number;
  missTolerance?: number;
}

export const useMindAR = (config: MindARConfig) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindARRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let mindAR: any = null;

    const loadMindAR = async () => {
      if (!containerRef.current || !isMounted) return;

      try {
        setIsLoading(true);
        setError(null);

        const script = document.createElement('script');
        
        if (config.type === 'image') {
          script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
        } else {
          script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-face-three.prod.js';
        }

        script.async = true;

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        const MindARConstructor = config.type === 'image' 
          ? (window as any).MINDAR.IMAGE.MindARThree
          : (window as any).MINDAR.FACE.MindARThree;

        if (!MindARConstructor) {
          throw new Error('MindAR library not loaded properly');
        }

        const options: any = {
          container: containerRef.current,
          uiLoading: 'no',
          uiScanning: 'no',
          uiError: 'no',
        };

        if (config.type === 'image' && config.imageTargetSrc) {
          options.imageTargetSrc = config.imageTargetSrc;
          options.maxTrack = config.maxTrack || 1;
          options.filterMinCF = config.filterMinCF || 0.0001;
          options.filterBeta = config.filterBeta || 1000;
          options.warmupTolerance = config.warmupTolerance || 5;
          options.missTolerance = config.missTolerance || 5;
        }

        mindAR = new MindARConstructor(options);
        mindARRef.current = mindAR;

        if (isMounted) {
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading MindAR:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load MindAR');
          setIsLoading(false);
        }
      }
    };

    loadMindAR();

    return () => {
      isMounted = false;
      if (mindAR) {
        try {
          mindAR.stop();
        } catch (err) {
          console.error('Error stopping MindAR:', err);
        }
      }
      
      const scripts = document.querySelectorAll('script[src*="mind-ar"]');
      scripts.forEach(script => script.remove());
    };
  }, [config.type, config.imageTargetSrc]);

  const start = async () => {
    if (!mindARRef.current) {
      setError('MindAR not initialized');
      return;
    }

    try {
      await mindARRef.current.start();
    } catch (err) {
      console.error('Error starting MindAR:', err);
      setError(err instanceof Error ? err.message : 'Failed to start AR');
    }
  };

  const stop = () => {
    if (!mindARRef.current) return;

    try {
      mindARRef.current.stop();
    } catch (err) {
      console.error('Error stopping MindAR:', err);
    }
  };

  const addAnchor = (targetIndex: number) => {
    if (!mindARRef.current) {
      console.error('MindAR not initialized');
      return null;
    }

    try {
      return mindARRef.current.addAnchor(targetIndex);
    } catch (err) {
      console.error('Error adding anchor:', err);
      return null;
    }
  };

  return {
    containerRef,
    mindAR: mindARRef.current,
    isLoading,
    isReady,
    error,
    start,
    stop,
    addAnchor,
  };
};