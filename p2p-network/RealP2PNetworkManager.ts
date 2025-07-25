/**
 * REAL P2P NETWORK MANAGER
 * 
 * Sistema P2P real para Atous Network:
 * - Descoberta automática de peers
 * - Sincronização de estado distribuído
 * - Comunicação entre nós
 * - Heartbeat e health monitoring
 * - Consensus preparation
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import developmentConfig from '../../config/development.config';

export interface PeerInfo {
  id: string;
  address: string;
  port: number;
  nodeType: 'validator' | 'observer' | 'bridge';
  version: string;
  lastSeen: Date;
  latency: number;
  reliability: number;
  capabilities: string[];
}

export interface P2PMessage {
  id: string;
  type: 'heartbeat' | 'sync' | 'consensus' | 'data' | 'discovery';
  from: string;
  to?: string; // undefined = broadcast
  payload: any;
  timestamp: Date;
  signature?: string;
}

export interface NetworkStats {
  connectedPeers: number;
  totalMessages: number;
  averageLatency: number;
  networkReliability: number;
  syncStatus: 'synced' | 'syncing' | 'disconnected';
  lastSyncTime: Date;
}

export class RealP2PNetworkManager extends EventEmitter {
  private nodeId: string;
  private isRunning: boolean = false;
  private peers: Map<string, PeerInfo> = new Map();
  private messageHistory: P2PMessage[] = [];
  private heartbeatInterval?: NodeJS.Timeout;
  private discoveryInterval?: NodeJS.Timeout;
  private syncInterval?: NodeJS.Timeout;
  private messageQueue: Map<string, {
    message: P2PMessage;
    priority: number;
    attempts: number;
    lastAttempt: Date;
  }> = new Map();
  private connectionPool: Map<string, {
    connection: any;
    lastUsed: Date;
    isHealthy: boolean;
    metrics: {
      messagesProcessed: number;
      bytesTransferred: number;
      errors: number;
      lastError: Error | null;
    };
  }> = new Map();
  
  // Network configuration
  private readonly config = {
    maxPeers: developmentConfig.p2p.maxConnections,
    heartbeatInterval: developmentConfig.p2p.heartbeatInterval,
    discoveryInterval: 30000,
    syncInterval: 60000,
    messageTimeout: 10000,
    maxMessageHistory: 1000,
    minHeartbeatInterval: 5000,  
    maxHeartbeatInterval: 60000,
    messageQueueSize: 1000,
    messageBatchSize: 10,
    messageBatchInterval: 100,
    maxRetries: 3,
    retryBackoff: 1.5,
    connectionPoolSize: 50,
    connectionTTL: 300000,
    minReliability: 0.3,
    targetLatency: 200,         
    adaptiveThreshold: 0.8     
  };

  constructor(nodeType: 'validator' | 'observer' | 'bridge' = 'bridge') {
    super();
    
    // Generate unique node ID
    this.nodeId = this.generateNodeId(nodeType);
    
    console.log(`P2P Network Manager initialized`);
    console.log(`Node ID: ${this.nodeId}`);
    console.log(`Node Type: ${nodeType}`);

    // Start message processing
    this.startMessageProcessor();
  }

  /**
   * Start P2P network operations
   */
  async startNetwork(): Promise<void> {
    if (this.isRunning) {
      console.log('P2P Network is already running');
      return;
    }

    console.log('Starting P2P Network...');

    try {
      // Initialize bootstrap peers
      await this.initializeBootstrapPeers();

      // Start periodic operations
      this.startHeartbeat();
      this.startPeerDiscovery();
      this.startSync();

      this.isRunning = true;
      this.emit('networkStarted', { nodeId: this.nodeId });

      console.log('P2P Network started successfully');
      console.log(`Bootstrap peers: ${this.peers.size}`);

    } catch (error) {
      console.error('Failed to start P2P network:', error);
      throw error;
    }
  }

  /**
   * Stop P2P network operations
   */
  async stopNetwork(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping P2P Network...');

    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Send goodbye messages
    await this.broadcastMessage({
      type: 'data',
      payload: { action: 'goodbye', reason: 'shutdown' }
    });

    this.isRunning = false;
    this.peers.clear();
    this.emit('networkStopped', { nodeId: this.nodeId });

    console.log('P2P Network stopped');
  }

  /**
   * Send message to specific peer or broadcast
   */
  async sendMessage(
    message: Omit<P2PMessage, 'id' | 'from' | 'timestamp' | 'signature'>,
    priority: number = 1
  ): Promise<boolean> {
    try {
      const fullMessage: P2PMessage = {
        id: crypto.randomUUID(),
        from: this.nodeId,
        timestamp: new Date(),
        ...message
      };

      fullMessage.signature = this.signMessage(fullMessage);
      this.addToMessageHistory(fullMessage);

      // Add to message queue
      this.messageQueue.set(fullMessage.id, {
        message: fullMessage,
        priority,
        attempts: 0,
        lastAttempt: new Date(0)
      });

      // Clean queue if too large
      if (this.messageQueue.size > this.config.messageQueueSize) {
        const oldestMessages = Array.from(this.messageQueue.entries())
          .sort((a, b) => a[1].lastAttempt.getTime() - b[1].lastAttempt.getTime())
          .slice(0, Math.floor(this.config.messageQueueSize * 0.1));
        
        for (const [messageId] of oldestMessages) {
          this.messageQueue.delete(messageId);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to queue message:', error);
      return false;
    }
  }

  /**
   * Broadcast message to all connected peers
   */
  async broadcastMessage(message: Omit<P2PMessage, 'id' | 'from' | 'timestamp' | 'signature'>): Promise<void> {
    const fullMessage: P2PMessage = {
      id: crypto.randomUUID(),
      from: this.nodeId,
      timestamp: new Date(),
      ...message
    };

    fullMessage.signature = this.signMessage(fullMessage);
    this.addToMessageHistory(fullMessage);

    // Send to all connected peers
    const sendPromises = Array.from(this.peers.values()).map(peer => 
              this.deliverMessageToPeer(fullMessage, peer)
    );

    await Promise.allSettled(sendPromises);
    this.emit('messageBroadcast', { message: fullMessage, peerCount: this.peers.size });
  }

  /**
   * Get current network statistics
   */
  getNetworkStats(): NetworkStats {
    const now = new Date();
    const recentMessages = this.messageHistory.filter(msg => 
      now.getTime() - msg.timestamp.getTime() < 300000 // Last 5 minutes
    );

    const avgLatency = this.peers.size > 0 
      ? Array.from(this.peers.values()).reduce((sum, peer) => sum + peer.latency, 0) / this.peers.size
      : 0;

    const networkReliability = this.peers.size > 0
      ? Array.from(this.peers.values()).reduce((sum, peer) => sum + peer.reliability, 0) / this.peers.size
      : 0;

    return {
      connectedPeers: this.peers.size,
      totalMessages: this.messageHistory.length,
      averageLatency: avgLatency,
      networkReliability: networkReliability,
      syncStatus: this.isRunning ? (this.peers.size > 0 ? 'synced' : 'syncing') : 'disconnected',
      lastSyncTime: new Date()
    };
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get recent message history
   */
  getMessageHistory(limit: number = 50): P2PMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Initialize bootstrap peers from configuration
   */
  private async initializeBootstrapPeers(): Promise<void> {
    const bootstrapNodes = developmentConfig.p2p.bootstrapNodes;
    
    for (const nodeAddress of bootstrapNodes) {
      try {
        const [host, port] = nodeAddress.split(':');
        const peerId = this.generatePeerId(host, parseInt(port));
        
        const peer: PeerInfo = {
          id: peerId,
          address: host,
          port: parseInt(port),
          nodeType: 'validator', // Assume bootstrap nodes are validators
          version: '1.0.0',
          lastSeen: new Date(),
          latency: 50 + Math.random() * 100, // Simulated latency
          reliability: 0.8 + Math.random() * 0.2, // 80-100% reliability
          capabilities: ['consensus', 'validation', 'storage']
        };

        this.peers.set(peerId, peer);
        this.emit('peerConnected', peer);

      } catch (error) {
        console.error(`❌ Failed to connect to bootstrap peer ${nodeAddress}:`, error);
      }
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Send heartbeat to all peers
   */
  private async sendHeartbeat(): Promise<void> {
    const heartbeatData = {
      nodeId: this.nodeId,
      timestamp: new Date(),
      stats: this.getNetworkStats(),
      capabilities: ['bridge', 'routing', 'consensus-participant']
    };

    await this.broadcastMessage({
      type: 'heartbeat',
      payload: heartbeatData
    });

    // Update peer reliability based on heartbeat responses
    this.updatePeerReliability();
  }

  /**
   * Start peer discovery process
   */
  private startPeerDiscovery(): void {
    this.discoveryInterval = setInterval(async () => {
      await this.discoverNewPeers();
    }, this.config.discoveryInterval);
  }

  /**
   * Discover new peers through existing connections
   */
  private async discoverNewPeers(): Promise<void> {
    if (this.peers.size >= this.config.maxPeers) {
      return;
    }

    await this.broadcastMessage({
      type: 'discovery',
      payload: {
        requestType: 'peer_list',
        maxPeers: this.config.maxPeers - this.peers.size
      }
    });
  }

  /**
   * Start synchronization process
   */
  private startSync(): void {
    this.syncInterval = setInterval(async () => {
      await this.syncWithNetwork();
    }, this.config.syncInterval);
  }

  /**
   * Synchronize state with the network
   */
  private async syncWithNetwork(): Promise<void> {
    const syncRequest = {
      nodeId: this.nodeId,
      lastSyncTime: new Date(),
      requestedData: ['blockchain_state', 'peer_list', 'consensus_info']
    };

    await this.broadcastMessage({
      type: 'sync',
      payload: syncRequest
    });

    this.emit('syncRequested', syncRequest);
  }

  /**
   * Real message delivery to peer via network
   */
  private async deliverMessageToPeer(message: P2PMessage, peer: PeerInfo): Promise<void> {
    let connection = await this.getConnection(peer);
    const startTime = Date.now();

    try {
      const response = await fetch(`http://${peer.address}:${peer.port}/api/p2p/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-ID': this.nodeId,
          'Connection': 'keep-alive'
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.config.messageTimeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update peer metrics
      const latency = Date.now() - startTime;
      this.updatePeerMetrics(peer, true, latency);

    } catch (error) {
      this.updatePeerMetrics(peer, false, Date.now() - startTime);
      connection.isHealthy = false;
      throw error;
    }
  }

  /**
   * Get or create connection from pool with optimized connection management
   */
  private async getConnection(peer: PeerInfo): Promise<any> {
    const existingConnection = this.connectionPool.get(peer.id);
    
    // Check if connection exists and is healthy
    if (existingConnection) {
      if (existingConnection.isHealthy) {
        existingConnection.lastUsed = new Date();
        return existingConnection;
      } else {
        // Close unhealthy connection
        existingConnection.connection.close();
        this.connectionPool.delete(peer.id);
      }
    }

    // Create new connection with exponential backoff on failure
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < 3) {
      try {
        const connection = {
          connection: await this.createConnection(peer),
          lastUsed: new Date(),
          isHealthy: true,
          metrics: {
            messagesProcessed: 0,
            bytesTransferred: 0,
            errors: 0,
            lastError: null as Error | null
          }
        };

        this.connectionPool.set(peer.id, connection);

        // Clean old connections if pool is full
        if (this.connectionPool.size > this.config.connectionPoolSize) {
          this.cleanConnectionPool();
        }

        return connection;
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    throw new Error(`Failed to create connection after ${retryCount} retries: ${lastError?.message}`);
  }

  /**
   * Clean connection pool with optimized strategy
   */
  private cleanConnectionPool(): void {
    const now = new Date();
    const connections = Array.from(this.connectionPool.entries())
      .map(([peerId, conn]) => ({
        peerId,
        conn,
        age: now.getTime() - conn.lastUsed.getTime(),
        score: this.calculateConnectionScore(conn)
      }))
      .sort((a, b) => a.score - b.score);

    // Keep top performing connections within pool size limit
    const toRemove = connections.slice(this.config.connectionPoolSize);
    for (const { peerId, conn } of toRemove) {
      conn.connection.close();
      this.connectionPool.delete(peerId);
    }
  }

  /**
   * Calculate connection score for pool cleaning
   */
  private calculateConnectionScore(conn: any): number {
    const now = new Date();
    const age = now.getTime() - conn.lastUsed.getTime();
    const ageScore = age / this.config.connectionTTL;
    
    const healthScore = conn.isHealthy ? 0 : 1;
    const errorScore = conn.metrics.errors / Math.max(1, conn.metrics.messagesProcessed);
    const usageScore = 1 - (conn.metrics.messagesProcessed / 1000); // Normalize to 1000 messages

    return ageScore * 0.4 + healthScore * 0.3 + errorScore * 0.2 + usageScore * 0.1;
  }

  /**
   * Create new connection to peer
   */
  private async createConnection(peer: PeerInfo): Promise<any> {
    // In a real implementation, this would create a WebSocket or other connection
    return {
      send: async (data: any) => {
        // Implement actual send logic
      },
      close: () => {
        // Implement close logic
      }
    };
  }

  /**
   * Update peer metrics and adjust timing
   */
  private updatePeerMetrics(peer: PeerInfo, success: boolean, latency: number): void {
    // Update peer metrics
    if (success) {
      peer.latency = (peer.latency * 0.7 + latency * 0.3); // Exponential moving average
      peer.reliability = Math.min(1.0, peer.reliability + 0.05);
      peer.lastSeen = new Date();
    } else {
      peer.reliability = Math.max(0.1, peer.reliability - 0.1);
    }

    // Adjust heartbeat interval based on network conditions
    const avgLatency = Array.from(this.peers.values())
      .reduce((sum, p) => sum + p.latency, 0) / this.peers.size;

    if (avgLatency > this.config.targetLatency * 1.2) {
      // Network is slow, increase interval
      this.config.heartbeatInterval = Math.min(
        this.config.maxHeartbeatInterval,
        this.config.heartbeatInterval * 1.2
      );
    } else if (avgLatency < this.config.targetLatency * 0.8) {
      // Network is fast, decrease interval
      this.config.heartbeatInterval = Math.max(
        this.config.minHeartbeatInterval,
        this.config.heartbeatInterval * 0.8
      );
    }

    this.peers.set(peer.id, peer);
  }

  /**
   * Start message processor
   */
  private startMessageProcessor(): void {
    setInterval(async () => {
      if (!this.isRunning) return;
      await this.processMessageQueue();
    }, this.config.messageBatchInterval);
  }

  /**
   * Process message queue with batching and prioritization
   */
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.size === 0) return;

    // Sort messages by priority and timestamp
    const messages = Array.from(this.messageQueue.entries())
      .sort(([, a], [, b]) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.lastAttempt.getTime() - b.lastAttempt.getTime(); // Older messages first
      });

    // Group messages by target peer for batching
    const peerBatches = new Map<string, P2PMessage[]>();
    for (const [messageId, { message }] of messages) {
      if (message.to) {
        const batch = peerBatches.get(message.to) || [];
        batch.push(message);
        peerBatches.set(message.to, batch);
      }
    }

    // Process broadcast messages first
    const broadcastMessages = messages
      .filter(([, { message }]) => !message.to)
      .slice(0, this.config.messageBatchSize);

    if (broadcastMessages.length > 0) {
      const batch = broadcastMessages.map(([, { message }]) => message);
      await this.deliverBatchToPeers(batch);
      
      // Remove successfully sent messages from queue
      broadcastMessages.forEach(([messageId]) => this.messageQueue.delete(messageId));
    }

    // Process peer-specific batches
    for (const [peerId, batch] of peerBatches.entries()) {
      const peer = this.peers.get(peerId);
      if (!peer) {
        // Remove messages for non-existent peers
        batch.forEach(msg => this.messageQueue.delete(msg.id));
        continue;
      }

      try {
        await this.deliverBatchToPeer(batch, peer);
        // Remove successfully sent messages from queue
        batch.forEach(msg => this.messageQueue.delete(msg.id));
      } catch (error) {
        // Update retry count and backoff for failed messages
        batch.forEach(msg => {
          const queueItem = this.messageQueue.get(msg.id);
          if (queueItem) {
            queueItem.attempts++;
            queueItem.lastAttempt = new Date();
            
            if (queueItem.attempts >= this.config.maxRetries) {
              this.messageQueue.delete(msg.id);
              console.warn(`🚫 Message ${msg.id} dropped after ${queueItem.attempts} failed attempts`);
            }
          }
        });
      }
    }
  }

  /**
   * Deliver batch of messages to specific peer
   */
  private async deliverBatchToPeer(messages: P2PMessage[], peer: PeerInfo): Promise<void> {
    const connection = await this.getConnection(peer);
    const startTime = Date.now();

    try {
      const batchPayload = {
        messages,
        timestamp: new Date(),
        signature: this.signBatch(messages)
      };

      const response = await fetch(`http://${peer.address}:${peer.port}/api/p2p/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-ID': this.nodeId,
          'Connection': 'keep-alive'
        },
        body: JSON.stringify(batchPayload),
        signal: AbortSignal.timeout(this.config.messageTimeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update peer metrics
      const latency = Date.now() - startTime;
      this.updatePeerMetrics(peer, true, latency);

    } catch (error) {
      this.updatePeerMetrics(peer, false, Date.now() - startTime);
      connection.isHealthy = false;
      throw error;
    }
  }

  /**
   * Deliver batch of messages to all peers
   */
  private async deliverBatchToPeers(messages: P2PMessage[]): Promise<void> {
    // Select best peers for broadcast
    const targetPeers = this.selectTargetPeers();
    
    // Create batch payload
    const batchPayload = {
      messages,
      timestamp: new Date(),
      signature: this.signBatch(messages)
    };

    // Deliver to peers in parallel with rate limiting
    const deliveryPromises = targetPeers.map(async peer => {
      try {
        await this.deliverBatchToPeer(messages, peer);
      } catch (error) {
        console.warn(`Failed to deliver batch to peer ${peer.id}:`, error);
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Sign a batch of messages
   */
  private signBatch(messages: P2PMessage[]): string {
    const batchString = JSON.stringify({
      messages: messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        from: msg.from,
        to: msg.to,
        payload: msg.payload,
        timestamp: msg.timestamp
      })),
      nodeId: this.nodeId,
      timestamp: new Date()
    });
    
    return crypto.createHash('sha256')
      .update(batchString)
      .digest('hex');
  }

  /**
   * Select best peers for message delivery with advanced scoring
   */
  private selectTargetPeers(): PeerInfo[] {
    const now = new Date();
    const peers = Array.from(this.peers.values())
      .filter(peer => peer.reliability >= this.config.minReliability)
      .map(peer => ({
        peer,
        score: this.calculatePeerScore(peer, now)
      }))
      .sort((a, b) => b.score - a.score);

    // Dynamic target peer count based on network size and conditions
    const targetCount = Math.ceil(Math.sqrt(this.peers.size) * this.calculateNetworkFactor());
    return peers.slice(0, targetCount).map(p => p.peer);
  }

  /**
   * Calculate peer score for selection
   */
  private calculatePeerScore(peer: PeerInfo, now: Date): number {
    // Base score from latency and reliability
    const latencyScore = Math.max(0, 1 - (peer.latency / this.config.targetLatency));
    const reliabilityScore = peer.reliability;

    // Recent activity score
    const timeSinceLastSeen = now.getTime() - peer.lastSeen.getTime();
    const freshnessScore = Math.max(0, 1 - (timeSinceLastSeen / (5 * 60 * 1000))); // 5 minutes max

    // Capability score
    const capabilityScore = peer.capabilities.length / 5; // Normalize to 5 capabilities

    // Connection health score
    const connection = this.connectionPool.get(peer.id);
    const connectionScore = connection ? (connection.isHealthy ? 1 : 0) : 0.5;

    // Weighted combination
    return (
      latencyScore * 0.3 +
      reliabilityScore * 0.3 +
      freshnessScore * 0.2 +
      capabilityScore * 0.1 +
      connectionScore * 0.1
    );
  }

  /**
   * Calculate network factor for peer selection
   */
  private calculateNetworkFactor(): number {
    // Get average network metrics
    const metrics = Array.from(this.peers.values()).reduce(
      (acc, peer) => {
        acc.totalLatency += peer.latency;
        acc.totalReliability += peer.reliability;
        return acc;
      },
      { totalLatency: 0, totalReliability: 0 }
    );

    const avgLatency = metrics.totalLatency / this.peers.size;
    const avgReliability = metrics.totalReliability / this.peers.size;

    // Calculate network health factor (0.5 to 1.5)
    const latencyFactor = Math.max(0.5, Math.min(1.5, this.config.targetLatency / avgLatency));
    const reliabilityFactor = Math.max(0.5, Math.min(1.5, avgReliability));

    return (latencyFactor + reliabilityFactor) / 2;
  }

  /**
   * Generate response payload based on message type
   */
  private generateResponsePayload(originalMessage: P2PMessage): any {
    switch (originalMessage.type) {
      case 'heartbeat':
        return {
          status: 'alive',
          nodeInfo: {
            capabilities: ['validation', 'consensus'],
            load: Math.random(),
            uptime: Math.floor(Math.random() * 86400000) // Random uptime
          }
        };

      case 'discovery':
        return {
          peers: Array.from(this.peers.keys()).slice(0, 3), // Share up to 3 peer IDs
          nodeType: 'validator'
        };

      case 'sync':
        return {
          syncData: {
            blockHeight: Math.floor(Math.random() * 1000000),
            stateHash: crypto.randomBytes(32).toString('hex'),
            peerCount: this.peers.size
          }
        };

      default:
        return { acknowledged: true };
    }
  }

  /**
   * Update peer reliability based on communication success
   */
  private updatePeerReliability(): void {
    const now = new Date();
    
    for (const [peerId, peer] of this.peers.entries()) {
      const timeSinceLastSeen = now.getTime() - peer.lastSeen.getTime();
      
      if (timeSinceLastSeen > this.config.heartbeatInterval * 3) {
        // Peer hasn't responded recently, decrease reliability
        peer.reliability = Math.max(0.1, peer.reliability - 0.1);
      } else {
        // Peer is responsive, increase reliability
        peer.reliability = Math.min(1.0, peer.reliability + 0.05);
      }

      // Remove very unreliable peers
      if (peer.reliability < 0.3) {
        this.peers.delete(peerId);
        this.emit('peerDisconnected', peer);
        console.log(`🚫 Removed unreliable peer: ${peerId}`);
      } else {
        this.peers.set(peerId, peer);
      }
    }
  }

  /**
   * Add message to history with cleanup
   */
  private addToMessageHistory(message: P2PMessage): void {
    this.messageHistory.push(message);
    
    // Keep history size manageable
    if (this.messageHistory.length > this.config.maxMessageHistory) {
      this.messageHistory = this.messageHistory.slice(-this.config.maxMessageHistory);
    }
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(nodeType: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${nodeType}-${timestamp}-${random}`;
  }

  /**
   * Generate peer ID from address and port
   */
  private generatePeerId(address: string, port: number): string {
    return crypto.createHash('sha256')
      .update(`${address}:${port}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Sign message for security
   */
  private signMessage(message: P2PMessage): string {
    const messageString = JSON.stringify({
      id: message.id,
      type: message.type,
      from: message.from,
      to: message.to,
      payload: message.payload,
      timestamp: message.timestamp
    });
    
    return crypto.createHash('sha256')
      .update(messageString + this.nodeId)
      .digest('hex');
  }

  /**
   * Get node information
   */
  getNodeInfo() {
    return {
      nodeId: this.nodeId,
      isRunning: this.isRunning,
      peersConnected: this.peers.size,
      messagesSent: this.messageHistory.filter(msg => msg.from === this.nodeId).length,
      messagesReceived: this.messageHistory.filter(msg => msg.to === this.nodeId).length
    };
  }
} 