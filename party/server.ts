import type * as Party from "partykit/server";

type MemberStatus = "coding" | "solved" | "idle";

interface PresenceMessage {
  type: "presence";
  userId: string;
  name: string;
  status: MemberStatus;
}

interface ChatMessage {
  type: "chat";
  userId: string;
  name: string;
  text: string;
  timestamp: number;
}

interface StatusUpdate {
  type: "status";
  userId: string;
  status: MemberStatus;
}

type IncomingMessage = PresenceMessage | ChatMessage | StatusUpdate;

interface RoomMember {
  userId: string;
  name: string;
  status: MemberStatus;
  connectionId: string;
}

export default class RoomServer implements Party.Server {
  members: Map<string, RoomMember> = new Map();
  chatHistory: ChatMessage[] = [];

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current state to the new connection
    conn.send(
      JSON.stringify({
        type: "init",
        members: Array.from(this.members.values()).map(({ userId, name, status }) => ({
          userId,
          name,
          status,
        })),
        chat: this.chatHistory.slice(-50),
      }),
    );
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as IncomingMessage;

      switch (data.type) {
        case "presence": {
          this.members.set(data.userId, {
            userId: data.userId,
            name: data.name,
            status: data.status,
            connectionId: sender.id,
          });

          // Broadcast updated member list to all connections
          this.broadcastMembers();
          break;
        }

        case "status": {
          const member = this.members.get(data.userId);
          if (member) {
            member.status = data.status;
            this.broadcastMembers();
          }
          break;
        }

        case "chat": {
          const chatMsg: ChatMessage = {
            type: "chat",
            userId: data.userId,
            name: data.name,
            text: data.text,
            timestamp: Date.now(),
          };
          this.chatHistory.push(chatMsg);

          // Keep chat history bounded
          if (this.chatHistory.length > 200) {
            this.chatHistory = this.chatHistory.slice(-100);
          }

          // Broadcast to all
          this.room.broadcast(JSON.stringify(chatMsg));
          break;
        }
      }
    } catch (e) {
      console.error("Invalid message:", e);
    }
  }

  onClose(conn: Party.Connection) {
    // Remove member by connection ID
    for (const [userId, member] of this.members) {
      if (member.connectionId === conn.id) {
        this.members.delete(userId);
        break;
      }
    }
    this.broadcastMembers();
  }

  private broadcastMembers() {
    const memberList = Array.from(this.members.values()).map(
      ({ userId, name, status }) => ({ userId, name, status }),
    );
    this.room.broadcast(
      JSON.stringify({ type: "members", members: memberList }),
    );
  }
}
