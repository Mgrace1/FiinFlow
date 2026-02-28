import React, { useEffect } from 'react';

const Starfield: React.FC = () => {
  useEffect(() => {
    const createStars = (numStars: number, className: string, minSize: number, maxSize: number, animationDuration: string) => {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.className = `star ${className}`;
        star.style.width = star.style.height = `${Math.random() * (maxSize - minSize) + minSize}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * parseFloat(animationDuration) * 0.8}s`;
        star.style.animationDuration = animationDuration;
        fragment.appendChild(star);
      }
      return fragment;
    };

    const createAsteroids = (numAsteroids: number) => {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < numAsteroids; i++) {
        const asteroid = document.createElement('div');
        asteroid.className = 'asteroid';
        const size = Math.random() * (15 - 5) + 5; // Asteroids between 5px and 15px
        asteroid.style.width = `${size}px`;
        asteroid.style.height = `${size}px`;
        asteroid.style.left = `${Math.random() * 100}%`;
        asteroid.style.top = `${Math.random() * 100}%`;
        asteroid.style.animationDelay = `${Math.random() * 60}s`; // Vary asteroid animation start
        asteroid.style.animationDuration = `${30 + Math.random() * 30}s`; // Asteroids move for 30-60 seconds
        fragment.appendChild(asteroid);
      }
      return fragment;
    };

    const starfieldContainer = document.createElement('div');
    starfieldContainer.className = 'starfield-background';
    document.body.appendChild(starfieldContainer);

    starfieldContainer.appendChild(createStars(200, 'star-1', 1, 1, '20s'));
    starfieldContainer.appendChild(createStars(100, 'star-2', 1, 2, '30s'));
    starfieldContainer.appendChild(createStars(50, 'star-3', 2, 3, '40s'));
    starfieldContainer.appendChild(createAsteroids(5)); // Adjust number of asteroids

    return () => {
      // Cleanup function to remove the starfield when the component unmounts
      if (document.body.contains(starfieldContainer)) {
        document.body.removeChild(starfieldContainer);
      }
    };
  }, []);

  return null; // This component doesn't render anything itself, it modifies the DOM directly
};

export default Starfield;
