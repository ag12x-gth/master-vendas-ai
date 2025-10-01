

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, MoreHorizontal, Loader2, Trash2, Edit, ChevronsRight, ChevronsLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ContactList } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

export function ContactListsTable() {
    const [lists, setLists] = useState<ContactList[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingList, setEditingList] = useState<ContactList | null>(null);
    const { toast } = useToast();

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');

    const fetchLists = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (search) params.set('search', search);

            const response = await fetch(`/api/v1/lists?${params.toString()}`);
            if (!response.ok) throw new Error('Falha ao carregar as listas.');
            
            const data = await response.json();
            setLists(data.data || []);
            setTotalPages(data.totalPages || 1);

        } catch (error) {
                 toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Não foi possível carregar as listas.' });
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, toast]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchLists();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchLists]);
    
    const handleOpenModal = (list: ContactList | null) => {
        setEditingList(list);
        setIsModalOpen(true);
    }
    
    const handleDeleteList = async (listId: string) => {
        try {
            const response = await fetch(`/api/v1/lists/${listId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao excluir a lista.');
            await fetchLists();
            toast({ title: 'Lista Excluída', description: 'A lista de contatos foi removida com sucesso.'});
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Não foi possível excluir a lista.' });
        }
    }

    const handleSaveList = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const listData = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
        };

        const isEditing = !!editingList;
        const url = isEditing ? `/api/v1/lists/${editingList.id}` : '/api/v1/lists';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(listData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao salvar a lista.');
            }

            const savedList: ContactList = await response.json();
            toast({ title: `Lista ${isEditing ? 'Atualizada' : 'Criada'}!`, description: `A lista "${savedList.name}" foi salva.`});
            await fetchLists();

        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.' });
        } finally {
            setIsModalOpen(false);
            setEditingList(null);
        }
    }

    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:w-auto sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou descrição..."
                        className="pl-9 w-full sm:w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex w-full sm:w-auto">
                    <Button onClick={() => handleOpenModal(null)} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Criar Lista
                    </Button>
                </div>
            </div>
            <div className="border rounded-lg w-full">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome da Lista</TableHead>
                            <TableHead>Contatos</TableHead>
                            <TableHead>Data de Criação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : lists.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Nenhuma lista de contatos encontrada.</TableCell>
                            </TableRow>
                        ) : (
                            lists.map((list) => (
                                <TableRow key={list.id}>
                                    <TableCell>
                                        <div className="font-medium">{list.name}</div>
                                        <div className="text-sm text-muted-foreground">{list.description}</div>
                                    </TableCell>
                                    <TableCell>{list.contactCount}</TableCell>
                                    <TableCell>{list.createdAt ? new Date(list.createdAt).toLocaleDateString('pt-BR') : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onSelect={() => handleOpenModal(list)}>
                                                    <Edit className="mr-2 h-4 w-4"/>Editar
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4"/>Excluir
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta ação não pode ser desfeita e excluirá permanentemente a lista &quot;{list.name}&quot;.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteList(list.id)}>Sim, Excluir</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
             {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                        Página {page} de {totalPages}.
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={limit.toString()} onValueChange={(value) => {setLimit(parseInt(value, 10)); setPage(1);}}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[10, 20, 50].map(val => <SelectItem key={val} value={val.toString()}>{val} por página</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            )}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingList ? 'Editar Lista' : 'Criar Nova Lista'}</DialogTitle>
                        <DialogDescription>
                            Dê um nome e uma descrição para a sua lista de contatos.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveList}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="list-name">Nome da Lista</Label>
                                <Input id="list-name" name="name" placeholder="Ex: Clientes VIP" defaultValue={editingList?.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="list-description">Descrição (Opcional)</Label>
                                <Textarea id="list-description" name="description" placeholder="Ex: Clientes que compraram nos últimos 30 dias" defaultValue={editingList?.description || ''} />
                            </div>
                        </div>
                         <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
