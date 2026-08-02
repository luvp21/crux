type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const DELAYS: Record<Corner, number> = {
  "top-left": 260,
  "top-right": 330,
  "bottom-left": 400,
  "bottom-right": 470,
};

function positionFor(corner: Corner, offset: number): React.CSSProperties {
  switch (corner) {
    case "top-left":
      return { left: offset, top: 0, transform: "translate(-50%, -50%)" };
    case "top-right":
      return { right: offset, top: 0, transform: "translate(50%, -50%)" };
    case "bottom-left":
      return { left: offset, bottom: 0, transform: "translate(-50%, 50%)" };
    case "bottom-right":
      return { right: offset, bottom: 0, transform: "translate(50%, 50%)" };
  }
}

/** The decorative "+" glyphs pinned to panel corners throughout the design. */
export function PlusMarks({ corners, offset = 0 }: { corners: Corner[]; offset?: number }) {
  return (
    <>
      {corners.map((corner) => (
        <span
          key={corner}
          style={{
            position: "absolute",
            lineHeight: 0,
            pointerEvents: "none",
            ...positionFor(corner, offset),
          }}
        >
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 700,
              fontSize: 17,
              lineHeight: 0,
              color: "var(--accent)",
              animation: `mark 420ms cubic-bezier(0.2, 0.8, 0.2, 1) ${DELAYS[corner]}ms both`,
            }}
          >
            +
          </span>
        </span>
      ))}
    </>
  );
}
