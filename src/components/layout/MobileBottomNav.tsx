import type { ReactNode } from "react";

export const mobileMainSpacing = "lg:pl-64 pb-[calc(6rem+max(env(safe-area-inset-bottom),1rem))] lg:pb-0";

export function MobileBottomNav({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Menu inferior" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border pb-[max(calc(env(safe-area-inset-bottom)-1rem),0.25rem)]">
      <div className="grid grid-cols-5 h-16">{children}</div>
    </nav>
  );
}