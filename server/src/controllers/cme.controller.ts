import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { CMERecord } from '../models/CMERecord.js';

export class CMEController {
  public static async getMyCME(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const records = await CMERecord.find({ doctorId: req.user.userId }).sort({ completedAt: -1 }).lean();
      const totalCredits = records.reduce((sum, r) => sum + r.credits, 0);
      const currentYearCredits = records
        .filter(r => new Date(r.completedAt).getFullYear() === new Date().getFullYear())
        .reduce((sum, r) => sum + r.credits, 0);
      res.json({ success: true, data: records, summary: { totalCredits, currentYearCredits, targetCredits: 50 } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async addCMERecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { activityTitle, provider, credits, activityType, completedAt, certificateUrl, notes } = req.body;
      if (!activityTitle || !provider || credits === undefined || !completedAt) {
        res.status(400).json({ success: false, message: 'Title, provider, credits, and date are required.' }); return;
      }
      const record = await CMERecord.create({
        doctorId: req.user.userId,
        activityTitle: String(activityTitle).substring(0, 200),
        provider: String(provider).substring(0, 200),
        credits: Math.max(0, Math.min(100, Number(credits))),
        activityType: activityType || 'OTHER',
        completedAt: new Date(completedAt),
        certificateUrl: certificateUrl || undefined,
        notes: notes ? String(notes).substring(0, 1000) : undefined,
      });
      res.status(201).json({ success: true, data: record });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async deleteCMERecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id } = req.params;
      const record = await CMERecord.findOne({ _id: id, doctorId: req.user.userId });
      if (!record) { res.status(404).json({ success: false, message: 'Record not found.' }); return; }
      await record.deleteOne();
      res.json({ success: true, message: 'CME record deleted.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async getDoctorCME(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { doctorId } = req.params;
      const records = await CMERecord.find({ doctorId }).sort({ completedAt: -1 }).lean();
      const totalCredits = records.reduce((sum, r) => sum + r.credits, 0);
      const currentYearCredits = records
        .filter(r => new Date(r.completedAt).getFullYear() === new Date().getFullYear())
        .reduce((sum, r) => sum + r.credits, 0);
      res.json({ success: true, data: records, summary: { totalCredits, currentYearCredits, targetCredits: 50 } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }
}
