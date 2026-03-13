import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names intelligently.
 * Combines clsx for conditional classes with tailwind-merge
 * to resolve conflicting utility classes.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-indigo-500", "px-6")
 * // → "py-2 px-6 bg-indigo-500"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
