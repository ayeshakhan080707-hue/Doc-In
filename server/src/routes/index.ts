import { Router } from 'express';
import authRoutes from './auth.routes.js';
import doctorRoutes from './doctor.routes.js';
import credentialRoutes from './credential.routes.js';
import postRoutes from './post.routes.js';
import connectionRoutes from './connection.routes.js';
import chatRoutes from './chat.routes.js';
import recruiterRoutes from './recruiter.routes.js';
import adminRoutes from './admin.routes.js';
import jobsRoutes from './jobs.routes.js';
import searchRoutes from './search.routes.js';
import twofaRoutes from './twofa.routes.js';
import paymentRoutes from './payment.routes.js';
import groupsRoutes from './groups.routes.js';
import cmeRoutes from './cme.routes.js';
import eventsRoutes from './events.routes.js';
import newsRoutes from './news.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/doctor', doctorRoutes);
apiRouter.use('/credentials', credentialRoutes);
apiRouter.use('/posts', postRoutes);
apiRouter.use('/network', connectionRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/recruiter', recruiterRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/jobs', jobsRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/2fa', twofaRoutes);
apiRouter.use('/payment', paymentRoutes);
apiRouter.use('/groups', groupsRoutes);
apiRouter.use('/cme', cmeRoutes);
apiRouter.use('/events', eventsRoutes);
apiRouter.use('/news', newsRoutes);

export default apiRouter;
