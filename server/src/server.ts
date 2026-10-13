import http from 'http';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocketIO } from './config/socket.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp();
const server = http.createServer(app);

// ── Initialize Socket.IO (singleton — imported by controllers via getIO()) ────
const io = initSocketIO(server);

// Online users map: userId → socketId
const onlineUsers = new Map<string, string>();

io.on('connection', (socket) => {
  // User joins their personal room for notifications
  socket.on('join_user_room', (userId: string) => {
    if (typeof userId !== 'string' || userId.length > 100) return;
    socket.join(`user_${userId}`);
    onlineUsers.set(userId, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  // Join a conversation room
  socket.on('join_conversation', (conversationId: string) => {
    if (typeof conversationId !== 'string' || conversationId.length > 100) return;
    socket.join(`conv_${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leave_conversation', (conversationId: string) => {
    if (typeof conversationId !== 'string' || conversationId.length > 100) return;
    socket.leave(`conv_${conversationId}`);
  });

  // Relay real-time chat message
  socket.on(
    'send_message',
    (data: { conversationId: string; recipientId: string; message: any }) => {
      if (!data?.conversationId || !data?.recipientId) return;
      io.to(`conv_${data.conversationId}`).emit('new_message', data.message);
      io.to(`user_${data.recipientId}`).emit('message_notification', {
        conversationId: data.conversationId,
        sender: data.message?.senderId,
      });
    }
  );

  // Typing indicators
  socket.on('typing_start', (data: { conversationId: string; userId: string }) => {
    if (!data?.conversationId || !data?.userId) return;
    socket.to(`conv_${data.conversationId}`).emit('typing_start', { userId: data.userId });
  });

  socket.on('typing_stop', (data: { conversationId: string; userId: string }) => {
    if (!data?.conversationId || !data?.userId) return;
    socket.to(`conv_${data.conversationId}`).emit('typing_stop', { userId: data.userId });
  });

  socket.on('disconnect', () => {
    for (const [userId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

// ── Seeded demo accounts (dev/staging only) ───────────────────────────────────
const SEEDED_ACCOUNTS = [
  {
    email: 'doctor@docin.com',
    password: 'DocIn@Medical2026',
    fullName: 'Dr. Sarah Jenkins, MD, FCPS',
    role: 'DOCTOR' as const,
    isClinicalVerified: true,
    subscriptionTier: 'PREMIUM_GOLD' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
    doctorExtras: {
      headline: 'Consultant Interventional Cardiologist | St. Jude Heart Center',
      specialization: 'Cardiology',
      medicalLicenseNumber: 'PMC-94218-C',
      licensingBody: 'State Medical Board & Royal College of Physicians',
      yearsOfExperience: 12,
      about:
        'Board-certified Interventional Cardiologist with over 12 years of experience in percutaneous coronary interventions and structural heart disease.',
      city: 'New York',
      country: 'United States',
    },
  },
  {
    email: 'hospital@docin.com',
    password: 'DocIn@Hospital2026',
    fullName: 'Metropolitan General Hospital',
    role: 'HOSPITAL_ADMIN' as const,
    isClinicalVerified: true,
    subscriptionTier: 'PREMIUM_GOLD' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&auto=format&fit=crop&q=80',
  },
  {
    email: 'recruiter@docin.com',
    password: 'DocIn@Recruit2026',
    fullName: 'Marcus Vance — Talent Director',
    role: 'RECRUITER' as const,
    isClinicalVerified: false,
    subscriptionTier: 'PREMIUM_GOLD' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  },
  {
    email: 'verifier@docin.com',
    password: 'DocIn@Verify2026',
    fullName: 'Eleanor Ward — Lead Credentialing Officer',
    role: 'CREDENTIALING_OFFICER' as const,
    isClinicalVerified: false,
    subscriptionTier: 'FREE' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
  },
  {
    email: 'admin@docin.com',
    password: 'DocIn@Admin2026',
    fullName: 'DocIn Platform Administrator',
    role: 'SUPER_ADMIN' as const,
    isClinicalVerified: true,
    subscriptionTier: 'PREMIUM_GOLD' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
  },
];

async function seedFixedAccounts() {
  const { User } = await import('./models/User.js');
  const { DoctorProfile } = await import('./models/DoctorProfile.js');
  const { JobPosting } = await import('./models/JobPosting.js');

  for (const acc of SEEDED_ACCOUNTS) {
    const existing = await User.findOne({ email: acc.email });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(acc.password, 12);
    const user = await User.create({
      email: acc.email,
      passwordHash,
      fullName: acc.fullName,
      role: acc.role,
      isClinicalVerified: acc.isClinicalVerified,
      subscriptionTier: acc.subscriptionTier,
      avatarUrl: acc.avatarUrl,
      isEmailVerified: true,
      status: 'ACTIVE',
    });

    if (acc.role === 'DOCTOR' && acc.doctorExtras) {
      await DoctorProfile.create({
        userId: user._id,
        fullName: acc.fullName,
        ...acc.doctorExtras,
        education: [
          {
            degree: 'Doctor of Medicine (MD)',
            institution: 'Johns Hopkins School of Medicine',
            year: 2012,
          },
          {
            degree: 'Fellowship — Interventional Cardiology',
            institution: 'Mayo Clinic',
            year: 2016,
          },
        ],
        hospitalAffiliations: [
          {
            hospitalName: 'Metropolitan General Hospital',
            position: 'Senior Attending Physician',
            isCurrent: true,
          },
        ],
        procedures: [
          'Transcatheter Aortic Valve Replacement (TAVR)',
          'Percutaneous Coronary Intervention (PCI)',
          'Intravascular Ultrasound (IVUS)',
          'Rotational Atherectomy',
          'Coronary Angiography',
        ],
      });
    }
  }

  // Seed 2 sample job postings if none exist
  const jobCount = await JobPosting.countDocuments();
  if (jobCount === 0) {
    const hospital = await User.findOne({ email: 'hospital@docin.com' });
    if (hospital) {
      await JobPosting.create([
        {
          employerId: hospital._id,
          title: 'Senior Consultant Interventional Cardiologist',
          institutionName: 'Metropolitan General Hospital',
          department: 'Cardiovascular Institute',
          specializationRequired: 'Cardiology',
          minimumExperienceYears: 5,
          location: 'New York, NY',
          jobType: 'FULL_TIME',
          salaryRange: '$380,000 – $450,000 / yr',
          description:
            'Leading tertiary center seeking an experienced Interventional Cardiologist for high-volume Cath Lab procedures and structural heart interventions. Must hold an active state medical license.',
          clinicalVerificationRequired: true,
        },
        {
          employerId: hospital._id,
          title: 'Attending Pediatric Critical Care Specialist',
          institutionName: "Children's Memorial Hospital",
          department: 'Pediatric ICU',
          specializationRequired: 'Pediatrics',
          minimumExperienceYears: 3,
          location: 'Boston, MA',
          jobType: 'FULL_TIME',
          salaryRange: '$290,000 – $340,000 / yr',
          description:
            'Full-time Attending Physician required for 24-bed Level IV Pediatric Intensive Care Unit with ECMO support. Fellowship-trained candidates preferred.',
          clinicalVerificationRequired: true,
        },
      ]);
    }
  }

  // ── Log seeded accounts (email only — NO passwords in logs) ──────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DocIn™ Platform — Demo Accounts Ready');
  console.log('═══════════════════════════════════════════════════════════');
  for (const acc of SEEDED_ACCOUNTS) {
    console.log(`  [${acc.role.padEnd(25)}]  ${acc.email}`);
  }
  console.log('  (Passwords are in .env / docs — not logged for security)');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function startServer() {
  await connectDB();
  await seedFixedAccounts();

  server.listen(PORT, () => {
    console.log(`[DocIn API] Running → http://localhost:${PORT}`);
  });
}

startServer();
