'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Video, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function NewMeetingDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [formData, setFormData] = useState({
        googleMeetUrl: '',
        scheduledFor: '',
        notes: '',
    });
    const router = useRouter();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/v1/meetings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    googleMeetUrl: formData.googleMeetUrl,
                    scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : null,
                    notes: formData.notes || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar reunião');
            }

            toast({
                title: '✅ Reunião criada com sucesso!',
                description: 'O bot está entrando na reunião do Google Meet.',
            });

            setOpen(false);
            setFormData({ googleMeetUrl: '', scheduledFor: '', notes: '' });
            router.refresh();

            setTimeout(() => {
                router.push(`/meetings/${data.meetingId}`);
            }, 500);
        } catch (error: any) {
            console.error('Erro ao criar reunião:', error);
            toast({
                title: '❌ Erro ao criar reunião',
                description: error.message || 'Tente novamente mais tarde.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleGenerateLink = async () => {
        setGeneratingLink(true);
        try {
            const response = await fetch('/api/v1/meetings/generate-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar link');
            }

            setFormData((prev) => ({
                ...prev,
                googleMeetUrl: data.meetingLink,
            }));

            toast({
                title: '✅ Link gerado com sucesso!',
                description: 'Link do Google Meet criado automaticamente.',
            });
        } catch (error: any) {
            console.error('Erro ao gerar link:', error);
            toast({
                title: '❌ Erro ao gerar link',
                description: error.message || 'Tente novamente mais tarde.',
                variant: 'destructive',
            });
        } finally {
            setGeneratingLink(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Reunião
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        Criar Nova Reunião
                    </DialogTitle>
                    <DialogDescription>
                        Insira a URL do Google Meet para iniciar a análise em tempo real com IA.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="googleMeetUrl">
                                URL do Google Meet <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="googleMeetUrl"
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                    value={formData.googleMeetUrl}
                                    onChange={(e) => handleChange('googleMeetUrl', e.target.value)}
                                    required
                                    disabled={loading || generatingLink}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGenerateLink}
                                    disabled={loading || generatingLink}
                                    className="shrink-0"
                                >
                                    {generatingLink ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Wand2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Cole um link existente ou clique no botão para gerar automaticamente
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="scheduledFor">Data/Hora Agendada (opcional)</Label>
                            <Input
                                id="scheduledFor"
                                type="datetime-local"
                                value={formData.scheduledFor}
                                onChange={(e) => handleChange('scheduledFor', e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Observações (opcional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Ex: Reunião com lead sobre produto X"
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                disabled={loading}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !formData.googleMeetUrl}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <Video className="mr-2 h-4 w-4" />
                                    Criar e Iniciar Bot
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
