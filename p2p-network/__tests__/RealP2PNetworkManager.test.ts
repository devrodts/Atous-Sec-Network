import { RealP2PNetworkManager, Peer, MessageType, PeerInfo, P2PMessage } from '../RealP2PNetworkManager';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

// Mock WebSocket
jest.mock('ws');

describe('RealP2PNetworkManager', () => {
  let manager: RealP2PNetworkManager;
  let mockWebSocketServer: any; // Mock WebSocket.Server

  beforeEach(() => {
    // Mock WebSocket.Server constructor
    mockWebSocketServer = {
      on: jest.fn(),
      clients: new Set(),
      close: jest.fn(),
    };
    (WebSocket.Server as jest.Mock).mockImplementation(() => mockWebSocketServer);

    manager = new RealP2PNetworkManager();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await manager.stopNetwork();
  });

  it('should start the network and listen for connections', async () => {
    await manager.startNetwork();
    expect(WebSocket.Server).toHaveBeenCalledWith({ port: 6000 });
    expect(mockWebSocketServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    expect(mockWebSocketServer.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle new peer connections', async () => {
    await manager.startNetwork();

    const mockWs = { on: jest.fn(), send: jest.fn(), readyState: WebSocket.OPEN };
    mockWebSocketServer.clients.add(mockWs);

    // Simulate a connection event
    const connectionHandler = mockWebSocketServer.on.mock.calls.find(call => call[0] === 'connection')[1];
    connectionHandler(mockWs);

    expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
    expect(manager.getNetworkStatus().connectedPeers).toBe(1);
  });

  it('should broadcast messages to connected peers', async () => {
    await manager.startNetwork();

    const mockWs1 = { on: jest.fn(), send: jest.fn(), readyState: WebSocket.OPEN };
    const mockWs2 = { on: jest.fn(), send: jest.fn(), readyState: WebSocket.OPEN };
    mockWebSocketServer.clients.add(mockWs1);
    mockWebSocketServer.clients.add(mockWs2);

    // Simulate connections
    const connectionHandler = mockWebSocketServer.on.mock.calls.find(call => call[0] === 'connection')[1];
    connectionHandler(mockWs1);
    connectionHandler(mockWs2);

    const message = { type: MessageType.TRANSACTION, payload: { id: 'tx1' } };
    manager.broadcastMessage(message);

    expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should handle incoming messages from peers', async () => {
    await manager.startNetwork();

    const mockWs = { on: jest.fn(), send: jest.fn(), readyState: WebSocket.OPEN };
    mockWebSocketServer.clients.add(mockWs);

    const connectionHandler = mockWebSocketServer.on.mock.calls.find(call => call[0] === 'connection')[1];
    connectionHandler(mockWs);

    const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
    const incomingMessage = { type: MessageType.BLOCK, payload: { id: 'block1' } };

    const messageProcessedSpy = jest.spyOn(manager as any, 'handleIncomingMessage');

    messageHandler(JSON.stringify(incomingMessage));

    expect(messageProcessedSpy).toHaveBeenCalledWith(mockWs, incomingMessage);
  });

  it('should stop the network and close connections', async () => {
    await manager.startNetwork();

    const mockWs1 = { on: jest.fn(), send: jest.fn(), readyState: WebSocket.OPEN, close: jest.fn() };
    const mockWs2 = { on: jest.fn(), send: jest.fn(), readyState: WebSocket.OPEN, close: jest.fn() };
    mockWebSocketServer.clients.add(mockWs1);
    mockWebSocketServer.clients.add(mockWs2);

    const connectionHandler = mockWebSocketServer.on.mock.calls.find(call => call[0] === 'connection')[1];
    connectionHandler(mockWs1);
    connectionHandler(mockWs2);

    await manager.stopNetwork();

    expect(mockWebSocketServer.close).toHaveBeenCalledTimes(1);
    expect(mockWs1.close).toHaveBeenCalledTimes(1);
    expect(mockWs2.close).toHaveBeenCalledTimes(1);
    expect(manager.getNetworkStatus().connectedPeers).toBe(0);
  });

  it('should update network status correctly', async () => {
    await manager.startNetwork();
    expect(manager.getNetworkStatus().status).toBe('RUNNING');

    const mockWs = { on: jest.fn(), send: jest.fn(), readyState: WebSocket.OPEN };
    mockWebSocketServer.clients.add(mockWs);
    const connectionHandler = mockWebSocketServer.on.mock.calls.find(call => call[0] === 'connection')[1];
    connectionHandler(mockWs);

    expect(manager.getNetworkStatus().connectedPeers).toBe(1);

    const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
    closeHandler();

    expect(manager.getNetworkStatus().connectedPeers).toBe(0);
  });

  describe('Connection Management', () => {
    it('should maintain connection pool size limits', async () => {
      await manager.startNetwork();
      const poolSpy = jest.spyOn(manager as any, 'cleanConnectionPool');

      // Add more connections than pool size
      const maxPoolSize = (manager as any).config.connectionPoolSize;
      for (let i = 0; i < maxPoolSize + 5; i++) {
        await (manager as any).getConnection({
          id: `peer${i}`,
          address: 'localhost',
          port: 8000 + i
        });
      }

      expect(poolSpy).toHaveBeenCalled();
      expect((manager as any).connectionPool.size).toBeLessThanOrEqual(maxPoolSize);
    });

    it('should reuse healthy connections from pool', async () => {
      await manager.startNetwork();
      const createSpy = jest.spyOn(manager as any, 'createConnection');

      const peer: PeerInfo = {
        id: 'test-peer',
        address: 'localhost',
        port: 8000,
        nodeType: 'validator',
        version: '1.0.0',
        lastSeen: new Date(),
        latency: 50,
        reliability: 0.9,
        capabilities: ['consensus']
      };

      // First connection should create new
      await (manager as any).getConnection(peer);
      expect(createSpy).toHaveBeenCalledTimes(1);

      // Second connection should reuse
      await (manager as any).getConnection(peer);
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('should create new connection when existing is unhealthy', async () => {
      await manager.startNetwork();
      const createSpy = jest.spyOn(manager as any, 'createConnection');

      const peer: PeerInfo = {
        id: 'test-peer',
        address: 'localhost',
        port: 8000,
        nodeType: 'validator',
        version: '1.0.0',
        lastSeen: new Date(),
        latency: 50,
        reliability: 0.9,
        capabilities: ['consensus']
      };

      // Create initial connection
      await (manager as any).getConnection(peer);
      expect(createSpy).toHaveBeenCalledTimes(1);

      // Mark connection as unhealthy
      (manager as any).connectionPool.get(peer.id).isHealthy = false;

      // Should create new connection
      await (manager as any).getConnection(peer);
      expect(createSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Message Queue Management', () => {
    it('should process messages in priority order', async () => {
      await manager.startNetwork();
      const deliverSpy = jest.spyOn(manager as any, 'deliverMessageToPeer');

      // Add messages with different priorities
      await manager.sendMessage({ type: 'data', payload: 'low' }, 1);
      await manager.sendMessage({ type: 'data', payload: 'high' }, 3);
      await manager.sendMessage({ type: 'data', payload: 'medium' }, 2);

      // Process queue
      await (manager as any).processMessageQueue();

      // Check processing order through delivery spy calls
      const calls = deliverSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0].payload).toBe('high');
    });

    it('should retry failed messages with backoff', async () => {
      await manager.startNetwork();
      const deliverSpy = jest.spyOn(manager as any, 'deliverMessageToPeer')
        .mockRejectedValue(new Error('Network error'));

      // Send message
      await manager.sendMessage({ type: 'data', payload: 'test' }, 1);

      // Process queue multiple times
      for (let i = 0; i < 3; i++) {
        await (manager as any).processMessageQueue();
      }

      // Check retry attempts
      const queueItem = Array.from((manager as any).messageQueue.values())[0];
      expect(queueItem.attempts).toBe(3);
    });

    it('should maintain queue size limits', async () => {
      await manager.startNetwork();
      const maxSize = (manager as any).config.messageQueueSize;

      // Add more messages than queue size
      for (let i = 0; i < maxSize + 5; i++) {
        await manager.sendMessage({ type: 'data', payload: `msg${i}` }, 1);
      }

      expect((manager as any).messageQueue.size).toBeLessThanOrEqual(maxSize);
    });
  });

  describe('Peer Selection', () => {
    it('should select peers based on latency and reliability', async () => {
      await manager.startNetwork();

      // Add peers with different metrics
      const peers = [
        { id: 'fast', latency: 50, reliability: 0.9 },
        { id: 'slow', latency: 200, reliability: 0.8 },
        { id: 'unreliable', latency: 50, reliability: 0.2 }
      ];

      peers.forEach(p => (manager as any).peers.set(p.id, {
        ...p,
        address: 'localhost',
        port: 8000,
        nodeType: 'validator',
        version: '1.0.0',
        lastSeen: new Date(),
        capabilities: ['consensus']
      }));

      const selected = (manager as any).selectTargetPeers();
      expect(selected[0].id).toBe('fast');
      expect(selected).not.toContainEqual(expect.objectContaining({ id: 'unreliable' }));
    });

    it('should update peer metrics after message delivery', async () => {
      await manager.startNetwork();
      const peer: PeerInfo = {
        id: 'test-peer',
        address: 'localhost',
        port: 8000,
        nodeType: 'validator',
        version: '1.0.0',
        lastSeen: new Date(),
        latency: 100,
        reliability: 0.5,
        capabilities: ['consensus']
      };

      // Successful delivery
      (manager as any).updatePeerMetrics(peer, true, 50);
      expect(peer.reliability).toBeGreaterThan(0.5);
      expect(peer.latency).toBeLessThan(100);

      // Failed delivery
      (manager as any).updatePeerMetrics(peer, false, 200);
      expect(peer.reliability).toBeLessThan(0.5);
    });
  });

  describe('Adaptive Timing', () => {
    it('should adjust heartbeat interval based on network conditions', async () => {
      await manager.startNetwork();
      const initialInterval = (manager as any).config.heartbeatInterval;

      // Simulate slow network
      const peer: PeerInfo = {
        id: 'test-peer',
        address: 'localhost',
        port: 8000,
        nodeType: 'validator',
        version: '1.0.0',
        lastSeen: new Date(),
        latency: (manager as any).config.targetLatency * 2,
        reliability: 0.9,
        capabilities: ['consensus']
      };

      (manager as any).peers.set(peer.id, peer);
      (manager as any).updatePeerMetrics(peer, true, peer.latency);

      expect((manager as any).config.heartbeatInterval).toBeGreaterThan(initialInterval);
    });

    it('should maintain heartbeat interval within bounds', async () => {
      await manager.startNetwork();
      const peer: PeerInfo = {
        id: 'test-peer',
        address: 'localhost',
        port: 8000,
        nodeType: 'validator',
        version: '1.0.0',
        lastSeen: new Date(),
        latency: 1000,
        reliability: 0.9,
        capabilities: ['consensus']
      };

      (manager as any).peers.set(peer.id, peer);

      // Simulate very slow network
      for (let i = 0; i < 10; i++) {
        (manager as any).updatePeerMetrics(peer, true, 1000);
      }

      expect((manager as any).config.heartbeatInterval).toBeLessThanOrEqual(
        (manager as any).config.maxHeartbeatInterval
      );

      // Simulate very fast network
      peer.latency = 1;
      for (let i = 0; i < 10; i++) {
        (manager as any).updatePeerMetrics(peer, true, 1);
      }

      expect((manager as any).config.heartbeatInterval).toBeGreaterThanOrEqual(
        (manager as any).config.minHeartbeatInterval
      );
    });
  });
});
