import { Request, Response } from 'express';
import { NewsService } from '../services/newsService.js';

export class NewsController {
  public static async getClinicalBriefs(req: Request, res: Response): Promise<void> {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const briefs = await NewsService.getClinicalBriefs(category);
      res.json({
        success: true,
        data: briefs,
        count: briefs.length,
      });
    } catch (error: any) {
      console.error('[NewsController] Error fetching clinical briefs:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve clinical briefs.' });
    }
  }

  public static async getArticleById(req: Request, res: Response): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
      if (!id) {
        res.status(400).json({ success: false, message: 'Article ID is required.' });
        return;
      }

      const article = await NewsService.getArticleById(id);
      if (!article) {
        res.status(404).json({ success: false, message: 'Clinical article not found.' });
        return;
      }

      res.json({
        success: true,
        data: article,
      });
    } catch (error: any) {
      console.error('[NewsController] Error fetching article by ID:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve clinical article.' });
    }
  }
}
