import { Router } from 'express';
import { PostController } from '../controllers/post.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireProfessional } from '../middlewares/role.middleware.js';
import { validateBody, createPostSchema } from '../middlewares/validate.js';
import { postImageUpload, uploadSingleToCloudinary } from '../middlewares/upload.js';

const router = Router();

// ── Public (no auth needed) ──────────────────────────────────────────────────
router.get('/feed', PostController.getFeed);

// Image upload for posts (authenticated)
router.post(
  '/upload-image',
  requireAuth,
  requireProfessional,
  postImageUpload.single('image'),
  uploadSingleToCloudinary('docin/posts'),
  PostController.uploadPostImage
);

// ── Auth required (observer can access) ──────────────────────────────────────
router.get('/saved', requireAuth, PostController.getSavedPosts);
router.post('/saved-status', requireAuth, PostController.getSavedStatus);

// ── Professional only ─────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  requireProfessional,
  validateBody(createPostSchema),
  PostController.createPost
);
router.put(
  '/:id',
  requireAuth,
  requireProfessional,
  validateBody({ content: { required: true, type: 'string', minLength: 1, maxLength: 5000 } }),
  PostController.editPost
);
router.post('/:id/like', requireAuth, requireProfessional, PostController.toggleLike);
router.post('/:id/repost', requireAuth, requireProfessional, PostController.repostPost);
router.post(
  '/:id/comment',
  requireAuth,
  requireProfessional,
  validateBody({ text: { required: true, type: 'string', minLength: 1, maxLength: 1000 } }),
  PostController.addComment
);
router.post('/:id/save', requireAuth, PostController.toggleSave);  // observers can save
router.post('/:id/report', requireAuth, PostController.reportPost); // observers can report
router.delete('/:id', requireAuth, PostController.deletePost);

export default router;
