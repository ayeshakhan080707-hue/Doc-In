import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { MedicalEvent } from '../models/MedicalEvent.js';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class EventsController {
  public static async listEvents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { q, specialty, upcoming = 'true', page = '1', limit = '20' } = req.query;
      const filter: any = {};
      if (upcoming === 'true') filter.startDate = { $gte: new Date() };
      if (specialty) filter.specialty = { $regex: escapeRegex(String(specialty).substring(0, 100)), $options: 'i' };
      if (q) {
        const safe = escapeRegex(String(q).substring(0, 100));
        filter.$or = [{ title: { $regex: safe, $options: 'i' } }, { description: { $regex: safe, $options: 'i' } }];
      }
      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(50, parseInt(String(limit)));
      const [events, total] = await Promise.all([
        MedicalEvent.find(filter).sort({ startDate: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
        MedicalEvent.countDocuments(filter),
      ]);
      res.json({ success: true, data: events, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async createEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { title, description, specialty, eventType, location, isOnline, meetingLink, startDate, endDate, registrationUrl, cmeCredits } = req.body;
      if (!title || !startDate || !endDate) {
        res.status(400).json({ success: false, message: 'Title, startDate, and endDate are required.' }); return;
      }
      const event = await MedicalEvent.create({
        title: String(title).substring(0, 200),
        description: description ? String(description).substring(0, 3000) : '',
        organizerId: req.user.userId,
        organizerName: req.user.email,
        specialty: specialty || 'General Medicine',
        eventType: eventType || 'OTHER',
        location: location || '',
        isOnline: !!isOnline,
        meetingLink: meetingLink || undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationUrl: registrationUrl || undefined,
        cmeCredits: cmeCredits ? Math.max(0, Math.min(50, Number(cmeCredits))) : undefined,
      });
      res.status(201).json({ success: true, data: event });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async rsvpEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id } = req.params;
      const event = await MedicalEvent.findById(id);
      if (!event) { res.status(404).json({ success: false, message: 'Event not found.' }); return; }
      const alreadyRsvp = event.rsvps.some(r => r.toString() === req.user!.userId);
      if (alreadyRsvp) {
        event.rsvps = event.rsvps.filter(r => r.toString() !== req.user!.userId);
        event.rsvpCount = event.rsvps.length;
        await event.save();
        res.json({ success: true, attending: false, rsvpCount: event.rsvpCount });
      } else {
        event.rsvps.push(req.user.userId as any);
        event.rsvpCount = event.rsvps.length;
        await event.save();
        res.json({ success: true, attending: true, rsvpCount: event.rsvpCount });
      }
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async deleteEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id } = req.params;
      const event = await MedicalEvent.findById(id);
      if (!event) { res.status(404).json({ success: false, message: 'Event not found.' }); return; }
      if (event.organizerId.toString() !== req.user.userId && req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, message: 'Access denied.' }); return;
      }
      await event.deleteOne();
      res.json({ success: true, message: 'Event deleted.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
}
