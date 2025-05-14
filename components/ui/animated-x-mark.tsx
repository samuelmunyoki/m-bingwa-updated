"use client";

import { motion } from "framer-motion";

const AnimatedXCircle = () => {
  const circleVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.4, ease: "easeInOut" },
    },
  };

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeInOut", delay: 0.2 },
    },
  };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="100"
      height="100"
      viewBox="0 0 100 100"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="#EF4444"
        strokeWidth="5"
        variants={circleVariants}
      />
      <motion.path
        d="M35 35 L65 65 M65 35 L35 65"
        fill="none"
        stroke="#EF4444"
        strokeWidth="5"
        strokeLinecap="round"
        variants={pathVariants}
      />
    </motion.svg>
  );
};

export default AnimatedXCircle;
