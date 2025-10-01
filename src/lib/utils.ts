import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { subHours, differenceInMilliseconds } from 'date-fns';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Checks if a given date is within the last 24 hours.
 * @param date The date to check (can be a Date object or a string).
 * @returns True if the date is within the last 24 hours, false otherwise.
 */
export function is24HourWindowOpen(date: Date | string): boolean {
    if (!date) return false;
    const messageDate = new Date(date);
    const twentyFourHoursAgo = subHours(new Date(), 24);
    return messageDate > twentyFourHoursAgo;
}

/**
 * Calculates the milliseconds left until 24 hours have passed since the given date.
 * @param date The start date (can be a Date object or a string).
 * @returns The number of milliseconds remaining, or 0 if the window has passed.
 */
export function getMillisecondsLeft(date: Date | string): number {
    if (!date) return 0;
    const messageDate = new Date(date);
    const twentyFourHoursLater = new Date(messageDate.getTime() + (24 * 60 * 60 * 1000));
    const now = new Date();
    const diff = differenceInMilliseconds(twentyFourHoursLater, now);
    return Math.max(0, diff);
}


/**
 * Formats the remaining milliseconds into a hh:mm:ss or mm:ss string.
 * @param milliseconds The remaining time in milliseconds.
 * @returns A formatted string representing the time left.
 */
export function formatTimeLeft(milliseconds: number | null): string {
    if (milliseconds === null || milliseconds <= 0) {
        return "00:00";
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    
    if (hours > 0) {
        const paddedHours = String(hours).padStart(2, '0');
        return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
    }

    return `${paddedMinutes}:${paddedSeconds}`;
}


/**
 * Limpa e padroniza um número de telefone para o formato E.164.
 * @param input O número de telefone a ser processado.
 * @returns O número padronizado ou nulo se a entrada for inválida.
 */
export function sanitizePhone(input: unknown): string | null {
    if (input === null || input === undefined) {
        return null;
    }
    
    // Remove tudo que não for dígito
    const digitsOnly = String(input).replace(/\D/g, '');
    
    if (!digitsOnly) {
        return null;
    }

    return `+${digitsOnly}`;
}


/**
 * Cria a versão canônica de um número de telefone brasileiro, adicionando o 9º dígito quando aplicável.
 * Este é o formato que DEVE ser salvo no banco de dados.
 * @param phone O número de telefone sanitizado em E.164 (ex: +5511987654321 ou +551187654321).
 * @returns O número de telefone no formato canônico (+55DDD9...).
 */
export function canonicalizeBrazilPhone(phone: string): string {
  const sanitized = sanitizePhone(phone); // Garante que começa com + e só tem dígitos
  if (!sanitized) return phone; // Retorna original em caso de erro

  // Verifica se é um número de celular brasileiro (+55) com DDD >= 11
  if (sanitized.startsWith('+55') && parseInt(sanitized.substring(3, 5), 10) >= 11) {
    // Se tem 13 caracteres, já tem o 9º dígito (ex: +55119...)
    if (sanitized.length === 14) {
      return sanitized;
    }
    // Se tem 12 caracteres, não tem o 9º dígito (ex: +5511...)
    if (sanitized.length === 13) {
      // Insere o '9' após o DDD
      return `${sanitized.slice(0, 5)}9${sanitized.slice(5)}`;
    }
  }

  // Para todos os outros casos (não-celular, não-Brasil, etc.), retorna como está
  return sanitized;
}


/**
 * Gera as variações de um número de telefone brasileiro (com e sem o 9º dígito) para busca.
 * @param phone O número de telefone sanitizado no formato E.164.
 * @returns Um array com as variações do número.
 */
export function getPhoneVariations(phone: string): string[] {
    const sanitized = sanitizePhone(phone);
    if (!sanitized) return [];

    const variations = new Set([sanitized]);

    // Verifica se é um celular brasileiro (+55) com DDD >= 11
    if (sanitized.startsWith('+55') && parseInt(sanitized.substring(3, 5), 10) >= 11) {
        // Se tem 14 caracteres, significa que tem o 9º dígito (ex: +55119...)
        if (sanitized.length === 14 && sanitized.charAt(5) === '9') {
            const phoneWithoutNine = `${sanitized.slice(0, 5)}${sanitized.slice(6)}`;
            variations.add(phoneWithoutNine);
        }
        // Se tem 13 caracteres, não tem o 9º dígito (ex: +5511...)
        else if (sanitized.length === 13) {
            const phoneWithNine = `${sanitized.slice(0, 5)}9${sanitized.slice(5)}`;
            variations.add(phoneWithNine);
        }
    }
    
    return Array.from(variations);
}
