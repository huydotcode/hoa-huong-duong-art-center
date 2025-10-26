"use client";

export function PianoLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className="h-8 w-2 bg-primary rounded-sm animate-[piano-key-press_0.6s_ease-in-out_infinite]"
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-sm">Đang tải...</p>
      </div>
    </div>
  );
}
