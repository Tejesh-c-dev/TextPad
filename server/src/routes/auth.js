const express = require('express');
const { customAlphabet } = require('nanoid');
const router = express.Router();

const animals = ['Fox','Wolf','Bear','Hawk','Lion','Tiger','Panda','Eagle','Shark','Whale','Owl','Lynx','Viper','Cobra','Falcon','Raven','Moose','Bison','Otter','Seal'];
const adjectives = ['Swift','Bold','Calm','Dark','Jade','Neon','Sage','Teal','Gold','Rose','Blue','Gray','Warm','Cool','Wild','Keen','Rare','Fine','Vast','Deep'];
const nanoid = customAlphabet('0123456789', 4);

// POST /api/auth/session — create anonymous session
router.post('/session', (req, res) => {
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const num = nanoid();

  const username = `${adj}${animal}${num}`;
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  res.json({
    username,
    color,
    createdAt: new Date().toISOString(),
  });
});

module.exports = router;