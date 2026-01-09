import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { initSocket } from './config/socket.js';

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
const io = initSocket(httpServer);

const server = httpServer.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});