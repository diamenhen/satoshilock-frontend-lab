'use client';
import { motion } from 'framer-motion';

// ────────────────────────────────────────
// template.js re-mounts on every route change, so every page
// gets the fade+rise transition automatically.
// Place this next to app/layout.js (same directory).
// ────────────────────────────────────────
export default function Template({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
