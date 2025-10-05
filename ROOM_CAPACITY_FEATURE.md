# Room Capacity Feature Implementation

## Overview
Implemented automatic room management with a maximum capacity of 10 users per room. When a room reaches capacity, users are automatically redirected to the next available room.

## Backend Changes (`backend/server.js`)

### 1. Added Room Capacity Constants
```javascript
const MAX_ROOM_CAPACITY = 10; // Maximum users per room
```

### 2. Helper Functions
- `getRoomUserCount(roomId)` - Returns the current number of users in a room
- `findAvailableRoom(baseRoomId)` - Finds the next available room with space

### 3. Room Capacity Check
Modified the `join-room` socket event handler to:
- Check if the requested room is at capacity before allowing join
- Emit a `room-full` event with details if the room is full
- Suggest the next available room number
- Block the join attempt if the room is full

### 4. New API Endpoint
Added `GET /api/room-capacity/:roomId` endpoint that returns:
- Current user count in the room
- Maximum capacity
- Whether the room is full
- Next available room number

Example response:
```json
{
  "roomId": "1",
  "currentUsers": 10,
  "maxCapacity": 10,
  "isFull": true,
  "nextAvailableRoom": "2"
}
```

## Frontend Changes

### 1. Collaboration Store (`src/hooks/useCollaborationStore.js`)
Added socket listener for `room-full` event that:
- Logs the room capacity information
- Dispatches a custom browser event that the Viewer component can listen to
- Passes along room capacity details

### 2. Viewer Component (`src/Viewer.js`)

#### Room-Full Event Handler
Added a `useEffect` hook that:
- Listens for the `room-full` custom event
- Shows a confirmation dialog to the user
- Automatically updates the room ID and joins the suggested room if accepted

#### UI Improvements
**Before Joining:**
- Added informational text: "💡 Max 10 users per room. If full, you'll be redirected to the next available room."

**After Joining:**
- Shows room capacity: "Room Capacity: X/10 users"
- Color-coded status badge:
  - 🟢 Green "Available" (0-7 users)
  - 🟠 Orange "Almost Full" (8-9 users)
  - 🔴 Red "FULL" (10 users)

## User Experience Flow

1. **User tries to join a full room:**
   ```
   User → Joins Room 1 (10/10 users)
   ```

2. **Backend detects room is full:**
   ```
   Server → Checks capacity
   Server → Room 1 is full (10/10)
   Server → Finds next available room (Room 2)
   Server → Emits 'room-full' event
   ```

3. **Frontend handles the event:**
   ```
   Browser → Shows alert dialog:
   "Room 1 is full (10/10 users).
    Would you like to join Room 2 instead?"
   ```

4. **User accepts:**
   ```
   User → Clicks "OK"
   Browser → Updates room ID to "2"
   Browser → Automatically joins Room 2
   User → Successfully connected to Room 2
   ```

## Configuration

To change the maximum room capacity, edit the constant in `backend/server.js`:
```javascript
const MAX_ROOM_CAPACITY = 10; // Change this value
```

Then update the UI text in `src/Viewer.js` if needed:
```javascript
💡 Max 10 users per room. // Update this message
{activeUsers.length}/10 users // Update this display
```

## Testing

### Test Scenario 1: Normal Join
1. Start the backend server
2. Open the viewer in a browser
3. Join room "1" with less than 10 users
4. ✅ Should join successfully

### Test Scenario 2: Full Room
1. Simulate 10 users in room "1" (or open 10 browser tabs)
2. Try to join room "1" with an 11th user
3. ✅ Should show dialog suggesting room "2"
4. ✅ Accept to automatically join room "2"

### Test Scenario 3: Capacity Display
1. Join a room with multiple users
2. ✅ Check the capacity indicator shows correct count
3. ✅ Badge color changes based on capacity:
   - Green when plenty of space
   - Orange when 8-9 users
   - Red when full (10 users)

## API Testing

Test the room capacity endpoint:
```bash
curl http://localhost:3000/api/room-capacity/1
```

Expected response:
```json
{
  "roomId": "1",
  "currentUsers": 5,
  "maxCapacity": 10,
  "isFull": false,
  "nextAvailableRoom": "1"
}
```

## Benefits

1. **Prevents overcrowding** - Ensures rooms don't exceed capacity
2. **Automatic scaling** - Users are seamlessly directed to available rooms
3. **Visual feedback** - Users can see room capacity status at a glance
4. **Configurable** - Easy to change the max capacity in one place
5. **User-friendly** - Clear dialog explains what's happening

## Future Enhancements

Possible improvements:
- Allow administrators to set different capacities per room
- Add room creation with custom capacity
- Show a list of all rooms with their current capacity
- Implement room reservations
- Add waiting list for full rooms
- Auto-balance users across rooms
