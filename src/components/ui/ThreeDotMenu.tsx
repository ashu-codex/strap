'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ThreeDotAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

interface ThreeDotMenuProps {
  actions: ThreeDotAction[];
  ariaLabel?: string;
  align?: 'left' | 'right';
}

export default function ThreeDotMenu({
  actions,
  ariaLabel = 'More options',
  align = 'right',
}: ThreeDotMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={ariaLabel}
        title={ariaLabel}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-[#52525B] dark:text-[#9496A1] hover:text-[#111318] dark:hover:text-white hover:border-[#B7F34A]/60 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-48 rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] shadow-xl py-1 z-50`}
        >
          {actions.map((act, idx) => (
            <button
              key={idx}
              type="button"
              disabled={act.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                act.onClick();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors disabled:opacity-50 ${
                act.destructive
                  ? 'text-red-500 hover:bg-red-500/10'
                  : 'text-[#111318] dark:text-[#E5E7EB] hover:bg-[#F0F2F5] dark:hover:bg-[#252830]'
              }`}
            >
              {act.icon && <span className="shrink-0">{act.icon}</span>}
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
