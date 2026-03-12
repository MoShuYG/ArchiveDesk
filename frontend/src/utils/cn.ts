import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge tailwind classes safely
 * combining clsx for conditional classes and tailwind-merge for overriding
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
