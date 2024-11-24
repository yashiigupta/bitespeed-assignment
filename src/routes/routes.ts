import { Router } from 'express';
import identityCtrl from '../controllers/identityController';

const router = Router();

router.post('/identify', identityCtrl.identify);

export default router;