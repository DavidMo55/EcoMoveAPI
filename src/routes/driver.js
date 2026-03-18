const { Router } = require('express');
const prisma = require('../prisma');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

// POST /api/driver/onboard
router.post('/onboard', async (req, res) => {
  const { curp, phone, carModel, plate, documents } = req.body;

  if (!curp || !phone || !carModel || !plate) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (!documents || !Array.isArray(documents) || documents.length < 4) {
    return res.status(400).json({ error: 'Se requieren los 4 documentos con folio' });
  }

  await prisma.user.update({
    where: { id: req.user.userId },
    data: { role: 'DRIVER' },
  });

  const driver = await prisma.driver.upsert({
    where: { userId: req.user.userId },
    create: { userId: req.user.userId, curp, phone, carModel, plate, onboarded: true },
    update: { curp, phone, carModel, plate, onboarded: true },
  });

  for (const doc of documents) {
    await prisma.document.upsert({
      where: { driverId_type: { driverId: driver.id, type: doc.type } },
      create: { driverId: driver.id, type: doc.type, folio: doc.folio, verified: true },
      update: { folio: doc.folio, verified: true },
    });
  }

  const full = await prisma.driver.findUnique({
    where: { id: driver.id },
    include: { documents: true, user: { select: { name: true, email: true } } },
  });

  res.json(full);
});

// PUT /api/driver/location
router.put('/location', async (req, res) => {
  const { lat, lng } = req.body;
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.userId } });
  if (!driver) return res.status(404).json({ error: 'No eres conductor' });

  await prisma.driver.update({ where: { id: driver.id }, data: { lat, lng } });
  res.json({ ok: true });
});

// PUT /api/driver/online
router.put('/online', async (req, res) => {
  const { online } = req.body;
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.userId } });
  if (!driver) return res.status(404).json({ error: 'No eres conductor' });
  if (!driver.onboarded) return res.status(400).json({ error: 'Completa tu registro primero' });

  await prisma.driver.update({ where: { id: driver.id }, data: { online: !!online } });
  res.json({ online: !!online });
});

// GET /api/driver/stats
router.get('/stats', async (req, res) => {
  const driver = await prisma.driver.findUnique({
    where: { userId: req.user.userId },
    include: { ridesAsDriver: { where: { status: 'COMPLETED' }, orderBy: { updatedAt: 'desc' }, take: 20 } },
  });
  if (!driver) return res.status(404).json({ error: 'No eres conductor' });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRides = driver.ridesAsDriver.filter(r => r.updatedAt >= todayStart);
  const todayEarnings = todayRides.reduce((sum, r) => sum + (r.price || 0) * 0.72, 0);

  res.json({
    online: driver.online, onboarded: driver.onboarded, rating: driver.rating,
    totalEarnings: driver.earnings, todayEarnings: Math.round(todayEarnings),
    todayTrips: todayRides.length, totalTrips: driver.ridesAsDriver.length,
  });
});

// GET /api/driver/incoming
router.get('/incoming', async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.userId } });
  if (!driver || !driver.online) return res.json({ rides: [] });

  const MAX_KM = 5;
  const degLat = MAX_KM / 111;
  const degLng = MAX_KM / (111 * Math.cos(driver.lat * Math.PI / 180));

  const rides = await prisma.ride.findMany({
    where: {
      status: 'REQUESTED', driverId: null,
      fromLat: { gte: driver.lat - degLat, lte: driver.lat + degLat },
      fromLng: { gte: driver.lng - degLng, lte: driver.lng + degLng },
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }, take: 5,
  });

  res.json({ rides });
});

// PUT /api/driver/accept/:rideId
router.put('/accept/:rideId', async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.userId } });
  if (!driver) return res.status(404).json({ error: 'No eres conductor' });

  const ride = await prisma.ride.findUnique({ where: { id: req.params.rideId } });
  if (!ride || ride.status !== 'REQUESTED') {
    return res.status(400).json({ error: 'Viaje no disponible' });
  }

  const updated = await prisma.ride.update({
    where: { id: ride.id },
    data: { driverId: driver.id, status: 'ASSIGNED' },
    include: { user: { select: { name: true, phone: true } } },
  });

  res.json(updated);
});

// PUT /api/driver/ride/:rideId/status
router.put('/ride/:rideId/status', async (req, res) => {
  const { status } = req.body;
  const ride = await prisma.ride.update({ where: { id: req.params.rideId }, data: { status } });

  if (status === 'COMPLETED' && ride.price) {
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.userId } });
    if (driver) {
      await prisma.driver.update({ where: { id: driver.id }, data: { earnings: { increment: ride.price * 0.72 } } });
    }
  }

  res.json(ride);
});

module.exports = router;
