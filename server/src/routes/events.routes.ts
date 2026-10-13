import { Router } from 'express';
import { EventsController } from '../controllers/events.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireProfessional } from '../middlewares/role.middleware.js';

const router = Router();
router.get('/', EventsController.listEvents);
router.post('/', requireAuth, requireProfessional, EventsController.createEvent);
router.post('/:id/rsvp', requireAuth, EventsController.rsvpEvent);
router.delete('/:id', requireAuth, EventsController.deleteEvent);
export default router;
