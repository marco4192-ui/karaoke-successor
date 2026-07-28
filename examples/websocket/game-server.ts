import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ===================== TYPES =====================
interface Player {
  id: string
  name: string
  avatar?: string
  color: string
  isReady: boolean
  isHost: boolean
  score: number
  combo: number
  accuracy: number
}

interface GameRoom {
  id: string
  code: string
  hostId: string
  players: Map<string, Player>
  status: 'waiting' | 'countdown' | 'playing' | 'ended'
  song: {
    id: string
    title: string
    artist: string
    duration: number
  } | null
  countdown: number
  createdAt: number
  gameMode: 'duel' | 'battle-royale' | 'tournament'
  maxPlayers: number
}

interface MatchmakingQueue {
  playerId: string
  playerName: string
  joinedAt: number
  preferredMode: 'duel' | 'battle-royale'
}

// ===================== STATE =====================
const rooms = new Map<string, GameRoom>()
const playerRooms = new Map<string, string>() // playerId -> roomId
const matchmakingQueue: MatchmakingQueue[] = []
const playerSockets = new Map<string, Socket>()

// Generate 6-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate unique room ID
function generateRoomId(): string {
  return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Get room by code
function getRoomByCode(code: string): GameRoom | undefined {
  for (const room of rooms.values()) {
    if (room.code === code) return room
  }
  return undefined
}

// Broadcast room update to all players
function broadcastRoomUpdate(room: GameRoom) {
  const playersArray = Array.from(room.players.values())
  const roomData = {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    players: playersArray,
    status: room.status,
    song: room.song,
    countdown: room.countdown,
    gameMode: room.gameMode,
    maxPlayers: room.maxPlayers
  }
  
  room.players.forEach((_, playerId) => {
    const socket = playerSockets.get(playerId)
    if (socket) {
      socket.emit('room-update', roomData)
    }
  })
}

// Start countdown
function startCountdown(room: GameRoom) {
  room.status = 'countdown'
  room.countdown = 5
  broadcastRoomUpdate(room)
  
  const countdownInterval = setInterval(() => {
    room.countdown--
    broadcastRoomUpdate(room)
    
    if (room.countdown <= 0) {
      clearInterval(countdownInterval)
      room.status = 'playing'
      broadcastRoomUpdate(room)
    }
  }, 1000)
}

// Matchmaking logic
function processMatchmaking() {
  // Process duel matchmaking (2 players)
  const duelPlayers = matchmakingQueue.filter(p => p.preferredMode === 'duel')
  while (duelPlayers.length >= 2) {
    const [p1, p2] = duelPlayers.splice(0, 2)
    
    // Remove from queue
    const idx1 = matchmakingQueue.findIndex(q => q.playerId === p1.playerId)
    if (idx1 >= 0) matchmakingQueue.splice(idx1, 1)
    const idx2 = matchmakingQueue.findIndex(q => q.playerId === p2.playerId)
    if (idx2 >= 0) matchmakingQueue.splice(idx2, 1)
    
    // Create room
    const room: GameRoom = {
      id: generateRoomId(),
      code: generateRoomCode(),
      hostId: p1.playerId,
      players: new Map(),
      status: 'waiting',
      song: null,
      countdown: 0,
      createdAt: Date.now(),
      gameMode: 'duel',
      maxPlayers: 2
    }
    
    // Add players to room
    const socket1 = playerSockets.get(p1.playerId)
    const socket2 = playerSockets.get(p2.playerId)
    
    if (socket1) {
      socket1.join(room.id)
      room.players.set(p1.playerId, {
        id: p1.playerId,
        name: p1.playerName,
        color: '#00ffff',
        isReady: false,
        isHost: true,
        score: 0,
        combo: 0,
        accuracy: 0
      })
      playerRooms.set(p1.playerId, room.id)
    }
    
    if (socket2) {
      socket2.join(room.id)
      room.players.set(p2.playerId, {
        id: p2.playerId,
        name: p2.playerName,
        color: '#ff00ff',
        isReady: false,
        isHost: false,
        score: 0,
        combo: 0,
        accuracy: 0
      })
      playerRooms.set(p2.playerId, room.id)
    }
    
    rooms.set(room.id, room)
    broadcastRoomUpdate(room)
    
    // Notify players of match
    if (socket1) {
      socket1.emit('match-found', { roomId: room.id, opponent: p2.playerName })
    }
    if (socket2) {
      socket2.emit('match-found', { roomId: room.id, opponent: p1.playerName })
    }
  }
  
  // Process battle royale (4+ players)
  const brPlayers = matchmakingQueue.filter(p => p.preferredMode === 'battle-royale')
  if (brPlayers.length >= 4) {
    const matched = brPlayers.splice(0, 4)
    
    // Remove from queue
    matched.forEach(p => {
      const idx = matchmakingQueue.findIndex(q => q.playerId === p.playerId)
      if (idx >= 0) matchmakingQueue.splice(idx, 1)
    })
    
    // Create room
    const room: GameRoom = {
      id: generateRoomId(),
      code: generateRoomCode(),
      hostId: matched[0].playerId,
      players: new Map(),
      status: 'waiting',
      song: null,
      countdown: 0,
      createdAt: Date.now(),
      gameMode: 'battle-royale',
      maxPlayers: 8
    }
    
    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00']
    matched.forEach((p, i) => {
      const socket = playerSockets.get(p.playerId)
      if (socket) {
        socket.join(room.id)
        room.players.set(p.playerId, {
          id: p.playerId,
          name: p.playerName,
          color: colors[i] || '#ffffff',
          isReady: false,
          isHost: i === 0,
          score: 0,
          combo: 0,
          accuracy: 0
        })
        playerRooms.set(p.playerId, room.id)
        socket.emit('match-found', { roomId: room.id, players: matched.map(m => m.playerName) })
      }
    })
    
    rooms.set(room.id, room)
    broadcastRoomUpdate(room)
  }
}

// ===================== SOCKET HANDLERS =====================
io.on('connection', (socket) => {
  console.log(`[CONNECT] ${socket.id}`)
  
  // Register player
  socket.on('register', (data: { name: string; avatar?: string }) => {
    playerSockets.set(socket.id, socket)
    console.log(`[REGISTER] ${data.name} (${socket.id})`)
  })
  
  // Create room
  socket.on('create-room', (data: { 
    playerName: string
    avatar?: string
    gameMode: 'duel' | 'battle-royale' | 'tournament'
    maxPlayers?: number
  }) => {
    const room: GameRoom = {
      id: generateRoomId(),
      code: generateRoomCode(),
      hostId: socket.id,
      players: new Map(),
      status: 'waiting',
      song: null,
      countdown: 0,
      createdAt: Date.now(),
      gameMode: data.gameMode,
      maxPlayers: data.maxPlayers || (data.gameMode === 'duel' ? 2 : 8)
    }
    
    socket.join(room.id)
    room.players.set(socket.id, {
      id: socket.id,
      name: data.playerName,
      avatar: data.avatar,
      color: '#00ffff',
      isReady: false,
      isHost: true,
      score: 0,
      combo: 0,
      accuracy: 0
    })
    
    playerRooms.set(socket.id, room.id)
    rooms.set(room.id, room)
    
    console.log(`[CREATE ROOM] ${data.playerName} created ${room.code} (${room.gameMode})`)
    
    socket.emit('room-created', {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.values()),
      status: room.status,
      gameMode: room.gameMode
    })
  })
  
  // Join room by code
  socket.on('join-room', (data: { 
    code: string
    playerName: string
    avatar?: string
  }) => {
    const room = getRoomByCode(data.code.toUpperCase())
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }
    
    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' })
      return
    }
    
    if (room.players.size >= room.maxPlayers) {
      socket.emit('error', { message: 'Room is full' })
      return
    }
    
    socket.join(room.id)
    
    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff6600', '#0066ff', '#ff0066', '#66ff00']
    const playerColor = colors[room.players.size] || '#ffffff'
    
    room.players.set(socket.id, {
      id: socket.id,
      name: data.playerName,
      avatar: data.avatar,
      color: playerColor,
      isReady: false,
      isHost: false,
      score: 0,
      combo: 0,
      accuracy: 0
    })
    
    playerRooms.set(socket.id, room.id)
    
    console.log(`[JOIN ROOM] ${data.playerName} joined ${room.code}`)
    
    socket.emit('room-joined', {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.values()),
      status: room.status,
      gameMode: room.gameMode
    })
    
    broadcastRoomUpdate(room)
  })
  
  // Leave room
  socket.on('leave-room', () => {
    const roomId = playerRooms.get(socket.id)
    if (!roomId) return
    
    const room = rooms.get(roomId)
    if (!room) return
    
    room.players.delete(socket.id)
    socket.leave(roomId)
    playerRooms.delete(socket.id)
    
    console.log(`[LEAVE ROOM] Player left ${room.code}`)
    
    if (room.players.size === 0) {
      rooms.delete(roomId)
      console.log(`[DELETE ROOM] ${room.code} (empty)`)
    } else {
      // Transfer host if needed
      if (room.hostId === socket.id) {
        const newHost = room.players.values().next().value
        if (newHost) {
          room.hostId = newHost.id
          newHost.isHost = true
        }
      }
      broadcastRoomUpdate(room)
    }
    
    socket.emit('left-room')
  })
  
  // Set ready status
  socket.on('set-ready', (data: { ready: boolean }) => {
    const roomId = playerRooms.get(socket.id)
    if (!roomId) return
    
    const room = rooms.get(roomId)
    if (!room) return
    
    const player = room.players.get(socket.id)
    if (player) {
      player.isReady = data.ready
      broadcastRoomUpdate(room)
    }
  })
  
  // Select song (host only)
  socket.on('select-song', (data: { 
    song: { id: string; title: string; artist: string; duration: number }
  }) => {
    const roomId = playerRooms.get(socket.id)
    if (!roomId) return
    
    const room = rooms.get(roomId)
    if (!room || room.hostId !== socket.id) return
    
    room.song = data.song
    broadcastRoomUpdate(room)
  })
  
  // Start game (host only)
  socket.on('start-game', () => {
    const roomId = playerRooms.get(socket.id)
    if (!roomId) return
    
    const room = rooms.get(roomId)
    if (!room || room.hostId !== socket.id) return
    
    // Check if all players are ready
    const allReady = Array.from(room.players.values()).every(p => p.isReady || p.isHost)
    if (!allReady) {
      socket.emit('error', { message: 'Not all players are ready' })
      return
    }
    
    console.log(`[START GAME] ${room.code}`)
    startCountdown(room)
  })
  
  // ===================== IN-GAME EVENTS =====================
  
  // Update score during game
  socket.on('score-update', (data: {
    score: number
    combo: number
    accuracy: number
    notesHit: number
    notesMissed: number
  }) => {
    const roomId = playerRooms.get(socket.id)
    if (!roomId) return
    
    const room = rooms.get(roomId)
    if (!room || room.status !== 'playing') return
    
    const player = room.players.get(socket.id)
    if (player) {
      player.score = data.score
      player.combo = data.combo
      player.accuracy = data.accuracy
      
      // Broadcast to other players
      socket.to(roomId).emit('opponent-update', {
        playerId: socket.id,
        playerName: player.name,
        score: data.score,
        combo: data.combo,
        accuracy: data.accuracy
      })
    }
  })
  
  // Player finished song
  socket.on('finish-song', (data: {
    score: number
    combo: number
    accuracy: number
  }) => {
    const roomId = playerRooms.get(socket.id)
    if (!roomId) return
    
    const room = rooms.get(roomId)
    if (!room) return
    
    const player = room.players.get(socket.id)
    if (player) {
      player.score = data.score
      player.combo = data.combo
      player.accuracy = data.accuracy
      
      console.log(`[FINISH] ${player.name} finished with ${data.score} points`)
      
      // Check if all players finished
      const allFinished = Array.from(room.players.values()).every(p => p.score > 0)
      if (allFinished) {
        room.status = 'ended'
        
        // Determine winner
        const players = Array.from(room.players.values())
        const winner = players.reduce((a, b) => a.score > b.score ? a : b)
        
        broadcastRoomUpdate(room)
        io.to(roomId).emit('game-ended', {
          winner: winner,
          players: players.sort((a, b) => b.score - a.score)
        })
      }
    }
  })
  
  // ===================== MATCHMAKING =====================
  
  // Join matchmaking queue
  socket.on('find-match', (data: {
    playerName: string
    mode: 'duel' | 'battle-royale'
  }) => {
    matchmakingQueue.push({
      playerId: socket.id,
      playerName: data.playerName,
      joinedAt: Date.now(),
      preferredMode: data.mode
    })
    
    playerSockets.set(socket.id, socket)
    
    console.log(`[MATCHMAKING] ${data.playerName} looking for ${data.mode}`)
    
    socket.emit('finding-match', { 
      queueSize: matchmakingQueue.filter(m => m.preferredMode === data.mode).length
    })
    
    processMatchmaking()
  })
  
  // Cancel matchmaking
  socket.on('cancel-matchmaking', () => {
    const idx = matchmakingQueue.findIndex(m => m.playerId === socket.id)
    if (idx >= 0) {
      matchmakingQueue.splice(idx, 1)
      console.log(`[MATCHMAKING CANCEL] ${socket.id}`)
    }
    socket.emit('matchmaking-cancelled')
  })
  
  // ===================== DISCONNECT =====================
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] ${socket.id}`)
    
    // Remove from matchmaking
    const mmIdx = matchmakingQueue.findIndex(m => m.playerId === socket.id)
    if (mmIdx >= 0) matchmakingQueue.splice(mmIdx, 1)
    
    // Remove from room
    const roomId = playerRooms.get(socket.id)
    if (roomId) {
      const room = rooms.get(roomId)
      if (room) {
        const player = room.players.get(socket.id)
        room.players.delete(socket.id)
        playerRooms.delete(socket.id)
        playerSockets.delete(socket.id)
        
        // Notify others
        io.to(roomId).emit('player-left', { 
          playerId: socket.id,
          playerName: player?.name || 'Unknown'
        })
        
        if (room.players.size === 0) {
          rooms.delete(roomId)
        } else if (room.hostId === socket.id) {
          // Transfer host
          const newHost = room.players.values().next().value
          if (newHost) {
            room.hostId = newHost.id
            newHost.isHost = true
            broadcastRoomUpdate(room)
          }
        }
      }
    }
    
    playerSockets.delete(socket.id)
  })
})

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok',
      rooms: rooms.size,
      players: playerSockets.size,
      matchmaking: matchmakingQueue.length
    }))
  }
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`🎮 Game WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
