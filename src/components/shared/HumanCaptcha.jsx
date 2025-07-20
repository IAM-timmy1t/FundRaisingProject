import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

const HumanCaptcha = ({ onVerified }) => {
  const [verified, setVerified] = useState(false);
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [0, 230],
    ["linear-gradient(90deg, #10B981, #3B82F6)", "linear-gradient(90deg, #10B981, #10B981)"]
  );

  const handleDragEnd = () => {
    if (x.get() > 220) {
      setVerified(true);
      onVerified(true);
    } else {
      x.set(0);
    }
  };

  return (
    <div className="w-full">
      <div className="relative w-full h-12 bg-white/10 rounded-full flex items-center justify-center text-white/50 select-none overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full w-full"
          style={{ background }}
        />
        <span className="z-10 transition-opacity duration-300" style={{ opacity: verified ? 1 : 0 }}>
          Verification Complete!
        </span>
        <span className="z-10 absolute transition-opacity duration-300" style={{ opacity: verified ? 0 : 1 }}>
          Slide to verify you are human
        </span>
        
        {!verified && (
          <motion.div
            className="absolute left-1 top-1 w-10 h-10 bg-white rounded-full z-20 flex items-center justify-center cursor-grab"
            drag="x"
            dragConstraints={{ left: 0, right: 230 }}
            dragElastic={0.1}
            style={{ x }}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: 'grabbing' }}
          >
            <ArrowRight className="text-blue-900" />
          </motion.div>
        )}

        {verified && (
           <motion.div
            className="absolute right-1 top-1 w-10 h-10 bg-white rounded-full z-20 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <Check className="text-green-500" />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HumanCaptcha;