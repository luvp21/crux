"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MemberStatus = "coding" | "solved" | "idle";

export interface RoomMember {
  userId: string;
  name: string;
  status: MemberStatus;
}

export interface ChatMessage {
  userId: string;
  name: string;
  text: string;
  timestamp: number;
}

interface InitMessage {
  type: "init";
  members: RoomMember[];
  chat: ChatMessage[];
}

interface MembersMessage {
  type: "members";
  members: RoomMember[];
}

interface IncomingChatMessage extends ChatMessage {
  type: "chat";
}

type ServerMessage = InitMessage | MembersMessage | IncomingChatMessage;

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST;

/**
 * Client-side hook for connecting to a PartyKit room.
 * Falls back to a mock local-only state if NEXT_PUBLIC_PARTYKIT_HOST isn't set.
 */
export function usePartyRoom(
  crewId: string,
  userId: string,
  userName: string,
) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempt = useRef(0);

  const connect = useCallback(() => {
    if (!PARTYKIT_HOST) {
      // Mock mode — no PartyKit server
      setMembers([{ userId, name: userName, status: "coding" }]);
      setConnected(true);
      return;
    }

    const protocol = PARTYKIT_HOST.startsWith("localhost") ? "ws" : "wss";
    const ws = new WebSocket(`${protocol}://${PARTYKIT_HOST}/party/${crewId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempt.current = 0;

      // Announce presence
      ws.send(
        JSON.stringify({
          type: "presence",
          userId,
          name: userName,
          status: "coding" as MemberStatus,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerMessage;

        switch (data.type) {
          case "init":
            setMembers(data.members);
            setChat(data.chat);
            break;
          case "members":
            setMembers(data.members);
            break;
          case "chat":
            setChat((prev) => [
              ...prev,
              {
                userId: data.userId,
                name: data.name,
                text: data.text,
                timestamp: data.timestamp,
              },
            ]);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      // Exponential backoff reconnect
      const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
      reconnectAttempt.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [crewId, userId, userName]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendChat = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "chat",
            userId,
            name: userName,
            text: text.trim(),
          }),
        );
      } else {
        // Mock mode — add locally
        setChat((prev) => [
          ...prev,
          {
            userId,
            name: userName,
            text: text.trim(),
            timestamp: Date.now(),
          },
        ]);
      }
    },
    [userId, userName],
  );

  const updateStatus = useCallback(
    (status: MemberStatus) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "status",
            userId,
            status,
          }),
        );
      } else {
        // Mock mode — update locally
        setMembers((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, status } : m)),
        );
      }
    },
    [userId],
  );

  return { members, chat, connected, sendChat, updateStatus };
}
