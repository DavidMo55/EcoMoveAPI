const { Router } = require('express');
const prisma = require('../prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware, requireRole('ADMIN'));

// GET /api/admin/fleet
router.get('/fleet', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { unitId: 'asc' } });
  res.json({ vehicles });
});

// PUT /api/admin/fleet/:id/lock
router.put('/fleet/:id/lock', async (req, res) => {
  const v = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!v) return res.status(404).json({ error: 'Vehículo no encontrado' });
  const updated = await prisma.vehicle.update({ where: { id: v.id }, data: { locked: !v.locked } });
  res.json(updated);
});

// PUT /api/admin/fleet/:id/shop
router.put('/fleet/:id/shop', async (req, res) => {
  const updated = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: { status: 'bad', battery: 0, locked: true },
  });
  res.json(updated);
});

// PUT /api/admin/fleet/:id/recharge
router.put('/fleet/:id/recharge', async (req, res) => {
  const v = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!v) return res.status(404).json({ error: 'Vehículo no encontrado' });
  const updated = await prisma.vehicle.update({
    where: { id: v.id },
    data: { status: 'ok', locked: false, battery: Math.min(100, v.battery + 55) },
  });
  res.json(updated);
});

// GET /api/admin/drivers
router.get('/drivers', async (req, res) => {
  const drivers = await prisma.driver.findMany({
    include: { user: { select: { name: true, email: true } }, documents: true, _count: { select: { ridesAsDriver: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ drivers });
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  const [totalUsers, totalDrivers, totalRides, activeDrivers, vehicles] = await Promise.all([
    prisma.user.count(), prisma.driver.count(), prisma.ride.count(),
    prisma.driver.count({ where: { online: true } }), prisma.vehicle.findMany(),
  ]);

  res.json({
    totalUsers, totalDrivers, totalRides, activeDrivers,
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === 'ok' && !v.locked).length,
    inShop: vehicles.filter(v => v.status === 'bad').length,
  });
});

// POST /api/admin/fleet/seed
router.post('/fleet/seed', async (req, res) => {
  const defaults = [
    { unitId: 'ECO-99', name: 'Roberto', car: 'BYD Dolphin', plate: 'PUE-231', battery: 95, status: 'ok', lat: 19.4369, lng: -99.129, locked: false },
    { unitId: 'ECO-23', name: 'Mariana', car: 'Tesla M3', plate: 'CDMX-902', battery: 62, status: 'ok', lat: 19.427, lng: -99.1406, locked: false },
    { unitId: 'ECO-12', name: 'Diego', car: 'Nissan Leaf', plate: 'PUE-118', battery: 78, status: 'ok', lat: 19.4398, lng: -99.1381, locked: false },
    { unitId: 'ECO-04', name: 'Ana', car: 'JAC E10X', plate: 'CDMX-044', battery: 0, status: 'bad', lat: 19.4255, lng: -99.128, locked: true },
    { unitId: 'ECO-55', name: 'Iván', car: 'Kia EV6', plate: 'PUE-550', battery: 88, status: 'ok', lat: 19.4342, lng: -99.1453, locked: false },
    { unitId: 'ECO-77', name: 'Sofía', car: 'MG4 Electric', plate: 'PUE-771', battery: 74, status: 'ok', lat: 19.441, lng: -99.1322, locked: false },
  ];
  for (const v of defaults) {
    await prisma.vehicle.upsert({ where: { unitId: v.unitId }, create: v, update: v });
  }
  res.json({ message: 'Fleet seeded', count: defaults.length });
});

module.exports = router;
