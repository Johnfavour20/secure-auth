import { AnimatePresence, motion } from 'motion/react';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <div className="w-full h-full min-h-screen bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          key="app-routes"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="w-full min-h-screen"
        >
          <AppRoutes />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
