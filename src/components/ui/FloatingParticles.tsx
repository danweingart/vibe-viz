"use client";

import { useMemo } from 'react';

/**
 * Floating particles effect - firefly-like dots rising up the screen
 */
export function FloatingParticles({ count = 30 }: { count?: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 3 + 2,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.6 + 0.2,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bottom-0 rounded-full animate-float-up"
          style={{
            left: `${particle.left}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: 'rgba(255, 224, 72, 0.6)',
            boxShadow: '0 0 10px rgba(255, 224, 72, 0.8)',
            animation: `floatUp ${particle.duration}s linear ${particle.delay}s infinite`,
            opacity: particle.opacity,
          }}
        />
      ))}
    </div>
  );
}
