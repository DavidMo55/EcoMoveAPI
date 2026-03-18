require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // ─── Clean existing data ───
  await prisma.rating.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.document.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  console.log('Cleaned existing data.');

  const hash = await bcrypt.hash('123456', 10);

  // ─── Users (passengers) ───
  const user1 = await prisma.user.create({
    data: { email: 'usuario@ecomove.com', password: hash, name: 'Juan Pérez', phone: '5551234567', role: 'USER' },
  });
  const user2 = await prisma.user.create({
    data: { email: 'maria@ecomove.com', password: hash, name: 'María García', phone: '5559876543', role: 'USER' },
  });
  const user3 = await prisma.user.create({
    data: { email: 'carlos@ecomove.com', password: hash, name: 'Carlos López', phone: '5554567890', role: 'USER' },
  });

  // ─── Drivers ───
  const driverUser1 = await prisma.user.create({
    data: { email: 'chofer@ecomove.com', password: hash, name: 'Roberto Soto', phone: '2221234567', role: 'DRIVER' },
  });
  const driver1 = await prisma.driver.create({
    data: {
      userId: driverUser1.id, curp: 'SOTR900101HPLXXX01', phone: '2221234567',
      carModel: 'BYD Dolphin', plate: 'PUE-231', onboarded: true, online: true,
      lat: 19.4350, lng: -99.1340, battery: 95, rating: 4.9, earnings: 1250,
    },
  });
  await prisma.document.createMany({
    data: [
      { driverId: driver1.id, type: 'INE', folio: 'INE-098765432', verified: true },
      { driverId: driver1.id, type: 'ACTA_NACIMIENTO', folio: 'ACTA-2024-00123', verified: true },
      { driverId: driver1.id, type: 'LICENCIA', folio: 'LIC-PUE-456789', verified: true },
      { driverId: driver1.id, type: 'COMPROBANTE_DOMICILIO', folio: 'CFE-2024-78901', verified: true },
    ],
  });

  const driverUser2 = await prisma.user.create({
    data: { email: 'chofer2@ecomove.com', password: hash, name: 'Mariana Torres', phone: '5557654321', role: 'DRIVER' },
  });
  const driver2 = await prisma.driver.create({
    data: {
      userId: driverUser2.id, curp: 'TOTM950315MDFXXX02', phone: '5557654321',
      carModel: 'Tesla Model 3', plate: 'CDMX-902', onboarded: true, online: true,
      lat: 19.4290, lng: -99.1400, battery: 62, rating: 4.8, earnings: 890,
    },
  });
  await prisma.document.createMany({
    data: [
      { driverId: driver2.id, type: 'INE', folio: 'INE-112233445', verified: true },
      { driverId: driver2.id, type: 'ACTA_NACIMIENTO', folio: 'ACTA-2024-00456', verified: true },
      { driverId: driver2.id, type: 'LICENCIA', folio: 'LIC-CDMX-112233', verified: true },
      { driverId: driver2.id, type: 'COMPROBANTE_DOMICILIO', folio: 'TELMEX-2024-55678', verified: true },
    ],
  });

  const driverUser3 = await prisma.user.create({
    data: { email: 'chofer3@ecomove.com', password: hash, name: 'Diego Hernández', phone: '2229876543', role: 'DRIVER' },
  });
  const driver3 = await prisma.driver.create({
    data: {
      userId: driverUser3.id, curp: 'HERD880520HPLXXX03', phone: '2229876543',
      carModel: 'Nissan Leaf', plate: 'PUE-118', onboarded: true, online: false,
      lat: 19.4380, lng: -99.1370, battery: 78, rating: 4.7, earnings: 560,
    },
  });
  await prisma.document.createMany({
    data: [
      { driverId: driver3.id, type: 'INE', folio: 'INE-667788990', verified: true },
      { driverId: driver3.id, type: 'ACTA_NACIMIENTO', folio: 'ACTA-2024-00789', verified: true },
      { driverId: driver3.id, type: 'LICENCIA', folio: 'LIC-PUE-334455', verified: true },
      { driverId: driver3.id, type: 'COMPROBANTE_DOMICILIO', folio: 'CFE-2024-11223', verified: true },
    ],
  });

  // ─── Choferes Hidalgo (Tepeapulco, Cd. Sahagún, Tlanalapa) ───
  // Coordenadas verificadas de cada centro urbano
  const hidalgoDrivers = [
    // TEPEAPULCO — centro y alrededores
    { email: 'luis.tepeapulco@ecomove.com', name: 'Luis Ramírez', phone: '7711234567', curp: 'RAML920815HHGXXX04', car: 'BYD Dolphin', plate: 'HGO-456', lat: 19.7856, lng: -98.5519, bat: 90 },
    { email: 'ana.tepeapulco@ecomove.com', name: 'Ana Martínez', phone: '7719876543', curp: 'MAMA950220MHGXXX05', car: 'Nissan Leaf', plate: 'HGO-789', lat: 19.7840, lng: -98.5535, bat: 75 },
    { email: 'pedro.tepeapulco@ecomove.com', name: 'Pedro Flores', phone: '7712345678', curp: 'FLOP880310HHGXXX06', car: 'Kia EV6', plate: 'HGO-101', lat: 19.7868, lng: -98.5505, bat: 88 },
    // CD. SAHAGÚN — centro (3.5km al suroeste de Tepeapulco)
    { email: 'maria.sahagun@ecomove.com', name: 'María López', phone: '7713456789', curp: 'LOMA900425MHGXXX07', car: 'Tesla M3', plate: 'HGO-202', lat: 19.7768, lng: -98.5858, bat: 82 },
    { email: 'jorge.sahagun@ecomove.com', name: 'Jorge Sánchez', phone: '7714567890', curp: 'SAJR870615HHGXXX08', car: 'BYD Dolphin', plate: 'HGO-303', lat: 19.7780, lng: -98.5840, bat: 95 },
    { email: 'rosa.sahagun@ecomove.com', name: 'Rosa Hernández', phone: '7715678901', curp: 'HERR930720MHGXXX09', car: 'JAC E10X', plate: 'HGO-404', lat: 19.7755, lng: -98.5870, bat: 70 },
    // TLANALAPA — centro (7km al noroeste de Tepeapulco)
    { email: 'carlos.tlanalapa@ecomove.com', name: 'Carlos Mendoza', phone: '7716789012', curp: 'MECC850905HHGXXX10', car: 'Nissan Leaf', plate: 'HGO-505', lat: 19.8167, lng: -98.6072, bat: 85 },
    { email: 'sofia.tlanalapa@ecomove.com', name: 'Sofía Reyes', phone: '7717890123', curp: 'RELS960110MHGXXX11', car: 'MG4 Electric', plate: 'HGO-606', lat: 19.8155, lng: -98.6090, bat: 68 },
  ];

  for (let i = 0; i < hidalgoDrivers.length; i++) {
    const d = hidalgoDrivers[i];
    const dUser = await prisma.user.create({
      data: { email: d.email, password: hash, name: d.name, phone: d.phone, role: 'DRIVER' },
    });
    const dDriver = await prisma.driver.create({
      data: {
        userId: dUser.id, curp: d.curp, phone: d.phone,
        carModel: d.car, plate: d.plate, onboarded: true, online: true,
        lat: d.lat, lng: d.lng, battery: d.bat, rating: +(4.5 + Math.random() * 0.5).toFixed(1), earnings: Math.round(Math.random() * 1500),
      },
    });
    await prisma.document.createMany({
      data: [
        { driverId: dDriver.id, type: 'INE', folio: `INE-HGO-${1000 + i}`, verified: true },
        { driverId: dDriver.id, type: 'ACTA_NACIMIENTO', folio: `ACTA-HGO-${2000 + i}`, verified: true },
        { driverId: dDriver.id, type: 'LICENCIA', folio: `LIC-HGO-${3000 + i}`, verified: true },
        { driverId: dDriver.id, type: 'COMPROBANTE_DOMICILIO', folio: `CFE-HGO-${4000 + i}`, verified: true },
      ],
    });
  }

  // ─── Admin ───
  await prisma.user.create({
    data: { email: 'admin@ecomove.com', password: hash, name: 'Admin EcoMove', phone: '5550000000', role: 'ADMIN' },
  });

  // ─── Fleet vehicles ───
  const vehicles = [
    { unitId: 'ECO-99', name: 'Roberto', car: 'BYD Dolphin', plate: 'PUE-231', battery: 95, status: 'ok', lat: 19.4369, lng: -99.129, locked: false },
    { unitId: 'ECO-23', name: 'Mariana', car: 'Tesla M3', plate: 'CDMX-902', battery: 62, status: 'ok', lat: 19.427, lng: -99.1406, locked: false },
    { unitId: 'ECO-12', name: 'Diego', car: 'Nissan Leaf', plate: 'PUE-118', battery: 78, status: 'ok', lat: 19.4398, lng: -99.1381, locked: false },
    { unitId: 'ECO-04', name: 'Ana', car: 'JAC E10X', plate: 'CDMX-044', battery: 0, status: 'bad', lat: 19.4255, lng: -99.128, locked: true },
    { unitId: 'ECO-55', name: 'Iván', car: 'Kia EV6', plate: 'PUE-550', battery: 88, status: 'ok', lat: 19.4342, lng: -99.1453, locked: false },
    { unitId: 'ECO-77', name: 'Sofía', car: 'MG4 Electric', plate: 'PUE-771', battery: 74, status: 'ok', lat: 19.441, lng: -99.1322, locked: false },
  ];
  for (const v of vehicles) {
    await prisma.vehicle.create({ data: v });
  }

  // ─── Print summary ───
  console.log('\n═══════════════════════════════════════');
  console.log('  SEED COMPLETADO — USUARIOS CREADOS');
  console.log('═══════════════════════════════════════\n');
  console.log('  Contraseña para todos: 123456\n');
  console.log('  ── USUARIOS (pasajeros) ──');
  console.log('  usuario@ecomove.com   — Juan Pérez');
  console.log('  maria@ecomove.com     — María García');
  console.log('  carlos@ecomove.com    — Carlos López\n');
  console.log('  ── CHOFERES CDMX (ya onboarded + docs) ──');
  console.log('  chofer@ecomove.com    — Roberto Soto   (BYD Dolphin, ONLINE, CDMX)');
  console.log('  chofer2@ecomove.com   — Mariana Torres (Tesla M3, ONLINE, CDMX)');
  console.log('  chofer3@ecomove.com   — Diego Hernández (Nissan Leaf, OFFLINE, CDMX)\n');
  console.log('  ── CHOFERES TEPEAPULCO ──');
  console.log('  luis.tepeapulco@ecomove.com    — Luis Ramírez   (BYD Dolphin)');
  console.log('  ana.tepeapulco@ecomove.com     — Ana Martínez   (Nissan Leaf)');
  console.log('  pedro.tepeapulco@ecomove.com   — Pedro Flores   (Kia EV6)\n');
  console.log('  ── CHOFERES CD. SAHAGÚN ──');
  console.log('  maria.sahagun@ecomove.com      — María López    (Tesla M3)');
  console.log('  jorge.sahagun@ecomove.com      — Jorge Sánchez  (BYD Dolphin)');
  console.log('  rosa.sahagun@ecomove.com       — Rosa Hernández (JAC E10X)\n');
  console.log('  ── CHOFERES TLANALAPA ──');
  console.log('  carlos.tlanalapa@ecomove.com   — Carlos Mendoza (Nissan Leaf)');
  console.log('  sofia.tlanalapa@ecomove.com    — Sofía Reyes    (MG4 Electric)\n');
  console.log('  Todos ONLINE, onboarded, con docs verificados.\n');
  console.log('  ── ADMIN ──');
  console.log('  admin@ecomove.com     — Admin EcoMove\n');
  console.log('  ── FLOTA ──');
  console.log('  6 vehículos (5 activos, 1 en taller)\n');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
