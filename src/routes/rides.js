const { Router } = require('express');
const prisma = require('../prisma');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

const MAX_MATCH_KM = 5;

function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLng / 2);
  const q = s1 * s1 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(q));
}

// POST /api/rides/request
router.post('/request', async (req, res) => {
  const { fromLat, fromLng, fromLabel, toLat, toLng, toLabel, service, tier, pet, promo, payment, distanceKm, durationMin, price } = req.body;

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: 'Origen y destino son requeridos' });
  }

  // Cancel any old stuck rides from this user before creating new one
  await prisma.ride.updateMany({
    where: { userId: req.user.userId, status: 'REQUESTED' },
    data: { status: 'CANCELLED' },
  });

  const ride = await prisma.ride.create({
    data: {
      userId: req.user.userId,
      fromLat, fromLng, fromLabel: fromLabel || 'Origen',
      toLat, toLng, toLabel: toLabel || 'Destino',
      service: service || 'ride', tier: tier || 'economy',
      pet: pet || false, promo: promo || null, payment: payment || 'card',
      distanceKm: distanceKm ?? null, durationMin: durationMin ?? null, price: price ?? null,
      status: 'REQUESTED',
    },
  });

  // Check if there are online drivers nearby (to tell the user)
  const degLat = MAX_MATCH_KM / 111;
  const degLng = MAX_MATCH_KM / (111 * Math.cos(fromLat * Math.PI / 180));

  const nearbyDrivers = await prisma.driver.findMany({
    where: {
      online: true, onboarded: true,
      lat: { gte: fromLat - degLat, lte: fromLat + degLat },
      lng: { gte: fromLng - degLng, lte: fromLng + degLng },
    },
    include: { user: { select: { name: true } } },
  });

  const withDist = nearbyDrivers
    .map(d => ({ ...d, dist: haversineKm({ lat: fromLat, lng: fromLng }, { lat: d.lat, lng: d.lng }) }))
    .filter(d => d.dist <= MAX_MATCH_KM)
    .sort((a, b) => a.dist - b.dist);

  // Ride stays as REQUESTED — drivers will pick it up via polling
  // Return closest driver info so the UI can show ETA
  if (withDist.length > 0) {
    const closest = withDist[0];
    return res.status(201).json({
      ride,
      driver: {
        id: closest.id, name: closest.user.name,
        carModel: closest.carModel, plate: closest.plate,
        rating: closest.rating, battery: closest.battery,
        lat: closest.lat, lng: closest.lng, dist: closest.dist,
      },
      driversNearby: withDist.length,
    });
  }

  res.status(201).json({ ride, driver: null, driversNearby: 0 });
});

// GET /api/rides/active
router.get('/active', async (req, res) => {
  const ride = await prisma.ride.findFirst({
    where: { userId: req.user.userId, status: { in: ['REQUESTED', 'ASSIGNED', 'PICKUP', 'ONTRIP'] } },
    include: { driver: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ ride });
});

// PUT /api/rides/:id/cancel
router.put('/:id/cancel', async (req, res) => {
  const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
  if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
  if (ride.userId !== req.user.userId) return res.status(403).json({ error: 'No es tu viaje' });

  const updated = await prisma.ride.update({ where: { id: ride.id }, data: { status: 'CANCELLED' } });
  res.json(updated);
});

// POST /api/rides/:id/rate
router.post('/:id/rate', async (req, res) => {
  const { stars, tip, comment } = req.body;
  const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
  if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
  if (ride.status !== 'COMPLETED') return res.status(400).json({ error: 'El viaje no está completado' });
  if (!ride.driverId) return res.status(400).json({ error: 'Sin conductor asignado' });

  const rating = await prisma.rating.create({
    data: { rideId: ride.id, userId: req.user.userId, driverId: ride.driverId, stars: stars || 5, tip: tip || 0, comment },
  });

  const allRatings = await prisma.rating.findMany({ where: { driverId: ride.driverId }, select: { stars: true } });
  const avg = allRatings.reduce((s, r) => s + r.stars, 0) / allRatings.length;
  await prisma.driver.update({ where: { id: ride.driverId }, data: { rating: Math.round(avg * 10) / 10 } });

  res.json(rating);
});

// GET /api/rides/history
router.get('/history', async (req, res) => {
  const rides = await prisma.ride.findMany({
    where: { userId: req.user.userId },
    include: { driver: { include: { user: { select: { name: true } } } }, rating: true },
    orderBy: { createdAt: 'desc' }, take: 50,
  });
  res.json({ rides });
});

module.exports = router;
