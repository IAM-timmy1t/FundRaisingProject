import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground = () => {
  const shapes = Array.from({ length: 20 });

  const shapeVariants = {
    initial: {
      opacity: 0,
      scale: 0.5,
      rotate: Math.random() * 360,
    },
    animate: (i) => ({
      opacity: [0, 0.1, 0.15, 0.1, 0],
      scale: [0.5, 1.2, 1, 0.8, 0.5],
      x: `${Math.random() * 100}vw`,
      y: `${Math.random() * 100}vh`,
      transition: {
        duration: 20 + Math.random() * 20,
        repeat: Infinity,
        repeatType: 'loop',
        delay: i * 2,
        ease: "easeInOut"
      },
    }),
  };

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
      {shapes.map((_, i) => {
        const size = 50 + Math.random() * 200;
        const blur = 70 + Math.random() * 50;
        const color = i % 3 === 0 ? 'bg-cyan-500' : i % 3 === 1 ? 'bg-fuchsia-500' : 'bg-blue-500';
        const isCircle = Math.random() > 0.5;

        return (
          <motion.div
            key={i}
            custom={i}
            variants={shapeVariants}
            initial="initial"
            animate="animate"
            style={{
              width: size,
              height: size,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              filter: `blur(${blur}px)`,
            }}
            className={`absolute ${isCircle ? 'rounded-full' : ''} ${color}`}
          />
        );
      })}
       <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-600/50 to-blue-600/50 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-pink-600/50 to-fuchsia-600/50 rounded-full filter blur-3xl opacity-30 animate-pulse animation-delay-4000"></div>
    </div>
  );
};

export default AnimatedBackground;