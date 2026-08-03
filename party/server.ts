import { Server, getServerByName, type Connection, type ConnectionContext } from "partyserver";

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

interface Env {
  RoomServer: DurableObjectNamespace<RoomServer>;
}

// Ported from the original PartyKit `Party.Server` implementation — same
// in-memory members/chatHistory shape, same wire protocol (init/members/chat
// messages), so `lib/partykit.ts` on the client needed zero changes. Only
// the framework underneath changed (PartyKit's managed platform -> a plain
// Cloudflare Worker + Durable Object via partyserver, deployed with
// `wrangler deploy` to sidestep PartyKit's free-plan Durable Objects
// migration issue and the partykit.dev shared-zone custom-domain limit).
export class RoomServer extends Server<Env> {
  members: Map<string, RoomMember> = new Map();
  chatHistory: ChatMessage[] = [];

  onConnect(connection: Connection, _ctx: ConnectionContext) {
    connection.send(
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

  onMessage(connection: Connection, message: string) {
    try {
      const data = JSON.parse(message) as IncomingMessage;

      switch (data.type) {
        case "presence": {
          this.members.set(data.userId, {
            userId: data.userId,
            name: data.name,
            status: data.status,
            connectionId: connection.id,
          });
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

          if (this.chatHistory.length > 200) {
            this.chatHistory = this.chatHistory.slice(-100);
          }

          this.broadcast(JSON.stringify(chatMsg));
          break;
        }
      }
    } catch (e) {
      console.error("Invalid message:", e);
    }
  }

  onClose(connection: Connection) {
    for (const [userId, member] of this.members) {
      if (member.connectionId === connection.id) {
        this.members.delete(userId);
        break;
      }
    }
    this.broadcastMembers();
  }

  private broadcastMembers() {
    const memberList = Array.from(this.members.values()).map(({ userId, name, status }) => ({
      userId,
      name,
      status,
    }));
    this.broadcast(JSON.stringify({ type: "members", members: memberList }));
  }
}

// Manual routing (instead of partyserver's default `routePartykitRequest`,
// which expects `/parties/:party/:room`) so the URL scheme stays exactly
// `/party/:roomId` — matching what `lib/partykit.ts` already sends.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/party\/([^/]+)/);
    if (!match) {
      return new Response("Not found", { status: 404 });
    }
    const roomId = match[1];
    const stub = await getServerByName(env.RoomServer, roomId);
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
