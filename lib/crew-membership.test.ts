import { describe, it, expect } from "vitest";
import { pickNextOwner } from "@/lib/crew-membership";

describe("pickNextOwner", () => {
  it("returns null when no members remain", () => {
    // Arrange
    const remaining: { userId: string; joinedAt: Date }[] = [];

    // Act
    const nextOwner = pickNextOwner(remaining);

    // Assert
    expect(nextOwner).toBeNull();
  });

  it("returns the only remaining member", () => {
    // Arrange
    const remaining = [{ userId: "user-a", joinedAt: new Date("2026-01-01") }];

    // Act
    const nextOwner = pickNextOwner(remaining);

    // Assert
    expect(nextOwner).toBe("user-a");
  });

  it("picks the member with the earliest joinedAt", () => {
    // Arrange
    const remaining = [
      { userId: "user-b", joinedAt: new Date("2026-02-01") },
      { userId: "user-a", joinedAt: new Date("2026-01-01") },
      { userId: "user-c", joinedAt: new Date("2026-03-01") },
    ];

    // Act
    const nextOwner = pickNextOwner(remaining);

    // Assert
    expect(nextOwner).toBe("user-a");
  });

  it("breaks ties on joinedAt by userId ascending", () => {
    // Arrange
    const tiedAt = new Date("2026-01-01");
    const remaining = [
      { userId: "user-z", joinedAt: tiedAt },
      { userId: "user-a", joinedAt: tiedAt },
    ];

    // Act
    const nextOwner = pickNextOwner(remaining);

    // Assert
    expect(nextOwner).toBe("user-a");
  });
});
