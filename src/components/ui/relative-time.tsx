
// src/components/ui/relative-time.tsx
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const RelativeTime = ({ date }: { date: string | Date | null }) => {
    const [formattedDate, setFormattedDate] = useState<string | null>(null);

    useEffect(() => {
        if (date) {
            setFormattedDate(
                formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
            );
        }
    }, [date]);
    
    // Render nothing on the server and on initial client render
    if (!formattedDate) {
        return null; // Avoids hydration mismatch by not rendering anything initially.
    }

    return (
        <p className="text-xs text-muted-foreground truncate max-w-40">
            {formattedDate}
        </p>
    );
};
