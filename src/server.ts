import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import identityRoutes from './routes/routes';

dotenv.config();

const app = express();
const SERVER_PORT = 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/', identityRoutes);

app.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);
});