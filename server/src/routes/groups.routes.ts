import { Router } from 'express';
import { GroupsController } from '../controllers/groups.controller.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';
import { requireProfessional } from '../middlewares/role.middleware.js';
import { avatarUpload, uploadSingleToCloudinary } from '../middlewares/upload.js';

const router = Router();

// Groups base routes
router.get('/', GroupsController.listGroups);
router.get('/my', requireAuth, GroupsController.getMyGroups);
router.get('/:id', optionalAuth, GroupsController.getGroup);
router.get('/:id/members', optionalAuth, GroupsController.getMembers);
router.post('/', requireAuth, requireProfessional, GroupsController.createGroup);
router.post('/:id/join', requireAuth, requireProfessional, GroupsController.joinGroup);
router.post('/:id/leave', requireAuth, GroupsController.leaveGroup);
router.delete('/:id', requireAuth, GroupsController.deleteGroup);
router.delete('/:id/members/:memberId', requireAuth, GroupsController.removeMember);

// Group Avatar upload — Cloudinary
router.post(
  '/:id/avatar',
  requireAuth,
  avatarUpload.single('avatar'),
  uploadSingleToCloudinary('docin/avatars'),
  GroupsController.uploadGroupAvatar
);

// Group Posts / Discussions routes
router.get('/:id/posts', optionalAuth, GroupsController.listPosts);
router.post('/:id/posts', requireAuth, requireProfessional, GroupsController.createPost);
router.post('/posts/:postId/like', requireAuth, GroupsController.toggleLike);
router.post('/posts/:postId/comments', requireAuth, GroupsController.addComment);
router.delete('/posts/:postId', requireAuth, GroupsController.deletePost);

export default router;
