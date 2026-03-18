const { Router } = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
  }

  const validRole = role === 'DRIVER' ? 'DRIVER' : role === 'ADMIN' ? 'ADMIN' : 'USER';

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hash, name, phone, role: validRole },
  });

  const token = signToken({ userId: user.id, role: user.role });

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { driver: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      driver: user.driver ? {
        id: user.driver.id,
        onboarded: user.driver.onboarded,
        online: user.driver.online,
        carModel: user.driver.carModel,
        plate: user.driver.plate,
        rating: user.driver.rating,
        earnings: user.driver.earnings,
      } : null,
    },
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { driver: { include: { documents: true } } },
  });

  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { password, ...safe } = user;
  res.json(safe);
});

module.exports = router;
