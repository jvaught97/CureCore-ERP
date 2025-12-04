export function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(72,169,153,0.25),_transparent_45%),_radial-gradient(circle_at_bottom,_rgba(23,73,64,0.25),_transparent_40%)] animate-pulse" />
    </div>
  );
}
