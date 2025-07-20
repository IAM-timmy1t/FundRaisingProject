import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const checkPasswordStrength = (password) => {
  let score = 0;
  if (!password) return 0;
  if (password.length > 8) score++;
  if (password.match(/[a-z]/)) score++;
  if (password.match(/[A-Z]/)) score++;
  if (password.match(/[0-9]/)) score++;
  if (password.match(/[^a-zA-Z0-9]/)) score++;
  return score;
};

const strengthLevels = {
  0: { text: '', color: 'bg-transparent', width: '0%' },
  1: { text: 'Very Weak', color: 'bg-red-500', width: '20%' },
  2: { text: 'Weak', color: 'bg-orange-500', width: '40%' },
  3: { text: 'Medium', color: 'bg-yellow-500', width: '60%' },
  4: { text: 'Strong', color: 'bg-green-500', width: '80%' },
  5: { text: 'Very Strong', color: 'bg-emerald-500', width: '100%' },
};

const PasswordStrengthMeter = ({ password, onStrengthChange }) => {
  const [strength, setStrength] = useState(strengthLevels[0]);

  useEffect(() => {
    const score = checkPasswordStrength(password);
    setStrength(strengthLevels[score]);
    if (onStrengthChange) {
      onStrengthChange(score);
    }
  }, [password, onStrengthChange]);

  return (
    <div className="w-full space-y-1">
      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${strength.color}`}
          initial={{ width: 0 }}
          animate={{ width: strength.width }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>
      <div className="flex justify-between items-center h-4">
        <p className="text-xs text-white/50">
          e.g., StrongPass!23
        </p>
        <p className="text-xs text-right text-white/70">{strength.text}</p>
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;