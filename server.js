require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

/* =====================
   Socket.IO Setup
===================== */
const io = new Server(server, {
  cors: {
    origin: ["https://24x7health.in", "https://www.24x7health.in"],
    credentials: true
  }
});

/* =====================
   Core Middleware
===================== */
app.use(cors({
  origin: ["https://24x7health.in", "https://www.24x7health.in"],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.set('trust proxy', 1);

app.use(session({
  name: 'hh.sid',
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// File Upload Setup
const upload = multer({ dest: 'uploads/' });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =====================
   WebSocket Implementation
===================== */
const peersInRoom = {};
const doctorRooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-doctor-room', (doctorUid) => {
    const roomName = `doctor-notify-${doctorUid}`;
    socket.join(roomName);
    doctorRooms[socket.id] = roomName;
    console.log(`Doctor ${doctorUid} connected to notification room.`);
  });

  socket.on('join-call-room', ({ roomId, doctorUid, patientId, patientName }) => {
    const doctorNotificationRoom = `doctor-notify-${doctorUid}`;
    io.to(doctorNotificationRoom).emit('new-call', {
      roomId,
      patientId,
      patientName
    });
    console.log(`${socket.id} joined room ${roomId}. Sent call invitation to doctor ${doctorUid}.`);
  });

  socket.on('join-room', (roomId) => {
    if (!peersInRoom[roomId]) peersInRoom[roomId] = {};
    socket.emit('existing-peers', Object.keys(peersInRoom[roomId]));
    peersInRoom[roomId][socket.id] = true;
    socket.join(roomId);
    socket.to(roomId).emit('new-peer', socket.id);
    console.log(`${socket.id} successfully joined video call room: ${roomId}`);
  });

  socket.on('signal', ({ to, payload }) => {
    io.to(to).emit('signal', { from: socket.id, payload });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in peersInRoom) {
      if (peersInRoom[roomId][socket.id]) {
        delete peersInRoom[roomId][socket.id];
        io.to(roomId).emit('peer-left', socket.id);
      }
    }
    const roomName = doctorRooms[socket.id];
    if (roomName) {
      delete doctorRooms[socket.id];
      socket.leave(roomName);
    }
  });
});

/* =====================
   ROUTE IMPORTS (ALL HERE BEFORE USE)
===================== */
const appointment_fertilityRoutes = require('./routes/appointment_fertility');
const appointmentsRoutes = require('./routes/appointments');
const bookappointmentRoutes = require('./routes/bookappointment');
const bloodRoutes = require('./routes/blood');
const clinicRoutes = require('./routes/clinicRegister');
const contactRoutes = require('./routes/contact');
const bloodtestRoutes = require('./routes/bloodtest');
const diagnosticstestsRoutes = require('./routes/diagnosticstests');
const doctorRoutes = require('./routes/doctor');
const entappointmentRoutes = require('./routes/entappointment');
const entspecialistRoutes = require('./routes/entspecialist');
const eyedoctorsRoutes = require('./routes/eyedoctors');
const eyeformRoutes = require('./routes/eyeform');
const finddoctorRoutes = require('./routes/finddoctor');
const homesample_testRoutes = require('./routes/homesample_test');
const hr_donationsRoutes = require('./routes/hr_donations');
const hr_packagesRoutes = require('./routes/hr_packages');
const packagesRoutes = require('./routes/packages');
const patientRoutes = require('./routes/patient');
const paymentRoutes = require('./routes/payment');
const analyzeRoutes = require('./routes/analyze');
const sessionRoutes = require('./routes/session');
const unifiedLoginRoutes = require('./routes/unifiedLogin');
const unifiedPasswordResetRoutes = require('./routes/unifiedPasswordReset');
const diagnosticsRoutes = require('./routes/diagnostics');
const newpaymentRoutes = require('./routes/newpayment');
const testsRoutes = require('./routes/tests');
const uploadRecordRoutes = require('./routes/upload_record');
const blogRoutes = require('./routes/blog');
const ratingsRoutes = require('./routes/ratings');
const opticbeeContactRoutes = require('./routes/opticbeeContact');
const opticbeeAffiliateRoutes = require('./routes/opticbeeaffiliate');
const newsletterRoutes = require('./routes/newsletter');
const providersRoutes = require('./routes/providers');
const ambulanceRoutes = require('./routes/Ambulance');
const shiftsRoutes = require('./routes/Shifts');
const driversRoutes = require('./routes/Drivers');
const ambulancebookingRoutes = require('./routes/ambulancebooking');

/* =====================
   API Routes (AFTER IMPORTS)
===================== */
app.use('/api', unifiedLoginRoutes);
app.use('/api', unifiedPasswordResetRoutes);
app.use('/api', bloodRoutes);
app.use('/api', ambulancebookingRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api', providersRoutes);
app.use('/api', newsletterRoutes);
app.use('/api', opticbeeAffiliateRoutes);
app.use('/api', opticbeeContactRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api', blogRoutes);
app.use('/api', uploadRecordRoutes);
app.use('/api', diagnosticsRoutes);
app.use('/api', newpaymentRoutes);
app.use('/api', testsRoutes);
app.use('/api', appointment_fertilityRoutes);
app.use('/api', appointmentsRoutes);
app.use('/api', bookappointmentRoutes);
app.use('/api', clinicRoutes);
app.use('/api', contactRoutes);
app.use('/api', bloodtestRoutes);
app.use('/api', diagnosticstestsRoutes);
app.use('/api', doctorRoutes);
app.use('/api', entappointmentRoutes);
app.use('/api', entspecialistRoutes);
app.use('/api', eyedoctorsRoutes);
app.use('/api', eyeformRoutes);
app.use('/api', finddoctorRoutes);
app.use('/api', homesample_testRoutes);
app.use('/api', hr_donationsRoutes);
app.use('/api', hr_packagesRoutes);
app.use('/api', packagesRoutes);
app.use('/api', patientRoutes);
app.use('/api', paymentRoutes);
app.use('/api', analyzeRoutes);
app.use('/api', sessionRoutes);

// Translate routes
require('./translate')(app);

/* =====================
   Static Files (LAST)
===================== */
app.use(express.static(path.join(__dirname, 'public')));

/* =====================
   Start Server
===================== */
const PORT = 5000;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
