import type React from "react";
import { motion } from "framer-motion";
import { IconAlertTriangle } from "@tabler/icons-react";

interface FloatingNotificationProps {
  message: string;
}

const FloatingNotification: React.FC<FloatingNotificationProps> = ({
  message,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white my-1 text-neutral-600 px-6 py-3 w-full rounded-lg shadow-lg">
        <p className="text-sm font-medium text-center text-red-500 flex justify-center">
          <IconAlertTriangle className="text-red-500 h-5 w-5 flex-shrink-0 mr-3" />
          Warning! {message}
        </p>
      </div>
    </motion.div>
  );
};

export default FloatingNotification;
