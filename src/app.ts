import express from 'express';
import dotenv from 'dotenv';
// import alaiRoutes from './routes/alai';
import firecrawlRoutes from './routes/firecrawl';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api', firecrawlRoutes);
// app.use('/user', alaiRoutes)

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});