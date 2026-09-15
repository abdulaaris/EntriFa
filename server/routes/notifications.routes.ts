import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate } from '../middleware.js';

const router = Router();

router.use(authenticate);

// Get notifications
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
  const tenantId = req.user?.tenantId || null;

  let notifs = isSuperAdmin
    ? db.getNotifications(null)
    : db.getNotifications(tenantId);

  // If client, also include system broadcast notifications
  if (!isSuperAdmin) {
    const broadcasts = db.raw.notifications.filter(n => n.tenantId === null && n.type === 'SYSTEM');
    notifs = [...notifs, ...broadcasts];
  }

  notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifs.filter(n => !n.read).length;

  return res.json({
    notifications: notifs,
    unreadCount,
  });
});

// Mark single notification read
router.post('/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const notif = db.raw.notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    db.save();
  }
  return res.json({ success: true });
});

// Mark all read
router.post('/read-all', (req: AuthenticatedRequest, res: Response) => {
  const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
  const tenantId = req.user?.tenantId || null;

  db.raw.notifications.forEach(n => {
    if (isSuperAdmin && n.tenantId === null) {
      n.read = true;
    } else if (!isSuperAdmin && n.tenantId === tenantId) {
      n.read = true;
    }
  });

  db.save();
  return res.json({ success: true });
});

export default router;
