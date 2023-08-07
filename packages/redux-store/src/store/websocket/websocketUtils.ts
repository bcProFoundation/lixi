import { io, Socket } from 'socket.io-client';

const baseUrl = process.env.NEXT_PUBLIC_LIXI_API ? process.env.NEXT_PUBLIC_LIXI_API : 'https://lixilotus.com/';
const socketServerUrl = `${baseUrl}ws/notifications`;

export function connectWebSocket(): Promise<Socket> {
  return new Promise<Socket>((resolve, reject) => {
    const socket = io(socketServerUrl, { transports: ['websocket'] });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      resolve(socket);
    });

    socket.on('connect_error', error => {
      console.error('WebSocket connection error:', error);
      reject(error);
    });

    socket.on('connect_timeout', timeout => {
      console.error('WebSocket connection timeout:', timeout);
      reject(timeout);
    });

    socket.on('error', error => {
      console.error('WebSocket error:', error);
      reject(error);
    });

    // You can handle other socket events here

    // If needed, you can add authentication or other setup here
    // socket.emit('authentication', { token: 'your-auth-token' });

    // Clean up the socket on disconnect
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      // Perform any cleanup or reconnection logic here if needed
    });
  });
}
