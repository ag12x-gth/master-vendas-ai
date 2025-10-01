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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, PlusCircle, Search, Trash2, List, LayoutGrid, Tags, Download, Loader2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, MoreHorizontal, Edit, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PageHeader } from '../page-header';
import type { ExtendedContact, ContactList, Tag } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { ImportContactsDialog } from './import-contacts-dialog';
import { AddContactDialog } from './add-contact-dialog';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';

type ViewType = 'table' | 'grid';
type SortKey = 'name' | 'createdAt';

const ContactGrid = ({ contacts, onRowClick }: { contacts: ExtendedContact[], onRowClick: (id: string) => void }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {contacts.map(contact => (
                <Card key={contact.id} onClick={() => onRowClick(contact.id)} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                         <Avatar className="h-16 w-16 mb-4">
                            <AvatarImage src={contact.avatarUrl || `https://placehold.co/64x64.png`} alt={contact.name} data-ai-hint="avatar user"/>
                            <AvatarFallback>{contact.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                         <div className="flex gap-1 flex-wrap mt-3 justify-center">
                            {contact.tags?.slice(0, 2).map(tag => (
                            <Badge key={tag.id} variant="secondary" style={{ backgroundColor: tag.color, color: '#fff' }}>{tag.name}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

const ContactTableView = ({ contacts, onRowClick, selectedRows, onSelectedRowsChange, isMobile, onDelete, onSort }: { 
    contacts: ExtendedContact[], 
    onRowClick: (id: string) => void
    selectedRows: string[],
    onSelectedRowsChange: (ids: string[]) => void
    isMobile: boolean,
    onDelete: (id: string) => void
    onSort: (key: SortKey) => void
 }) => {
    
    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        onSelectedRowsChange(checked === true ? contacts.map(c => c.id) : []);
    }

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            onSelectedRowsChange([...selectedRows, id]);
        } else {
            onSelectedRowsChange(selectedRows.filter(rowId => rowId !== id));
        }
    }

    if (isMobile) {
        return (
            <div className="space-y-4">
                {contacts.map(contact => (
                    <Card key={contact.id} onClick={() => onRowClick(contact.id)} className="cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                            <Checkbox 
                                checked={selectedRows.includes(contact.id)}
                                onCheckedChange={(checked) => handleSelectRow(contact.id, !!checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-5 w-5"
                             />
                             <div className="flex-1 space-y-1">
                                <p className="font-bold">{contact.name}</p>
                                <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                <div className="flex gap-1 flex-wrap pt-1">
                                    {contact.tags?.map(tag => (
                                    <Badge key={tag.id} variant="secondary" style={{ backgroundColor: tag.color, color: '#fff' }}>{tag.name}</Badge>
                                    ))}
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                ))}
                 {contacts.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>Nenhum contato encontrado.</p>
                    </div>
                 )}
            </div>
        )
    }

    return (
         <div className="border rounded-lg w-full overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <Checkbox 
                                checked={selectedRows.length === contacts.length && contacts.length > 0}
                                onCheckedChange={handleSelectAll}
                             />
                        </TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => onSort('name')}>
                                Nome <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Listas</TableHead>
                        <TableHead>
                            <Button variant="ghost" onClick={() => onSort('createdAt')}>
                                Data de Criação <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                         <TableCell>
                           <Checkbox 
                                checked={selectedRows.includes(contact.id)}
                                onCheckedChange={(checked) => handleSelectRow(contact.id, !!checked)}
                            />
                        </TableCell>
                        <TableCell>
                            <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">{contact.name}</Link>
                        </TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>
                            <div className="flex flex-wrap gap-1">
                                {contact.tags?.map(tag => (
                                    <Badge key={tag.id} style={{ backgroundColor: tag.color, color: '#fff' }}>{tag.name}</Badge>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell>
                             <div className="flex flex-wrap gap-1">
                                {contact.lists?.map(list => (
                                    <Badge key={list.id} variant="secondary">{list.name}</Badge>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell>{contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => onRowClick(contact.id)}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                         <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tem certeza que deseja excluir o contato &quot;{contact.name}&quot;? Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onDelete(contact.id)}>Sim, Excluir</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                           </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                    {contacts.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">Nenhum contato encontrado.</TableCell>
                    </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
 }

export function ContactTable() {
  const [contacts, setContacts] = useState<ExtendedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewType>('table');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [tagFilter, setTagFilter] = useState('all');
  const [listFilter, setListFilter] = useState('all');

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableLists, setAvailableLists] = useState<ContactList[]>([]);
  
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
        const [sortByField, sortOrder] = sortBy.split(':');
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (sortByField) params.set('sortBy', sortByField);
        if (sortOrder) params.set('sortOrder', sortOrder);
        if (search) params.set('search', search);
        if (tagFilter !== 'all') params.set('tagId', tagFilter);
        if (listFilter !== 'all') params.set('listId', listFilter);
        
        const response = await fetch(`/api/v1/contacts?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch contacts");
        
        const data = await response.json();
        setContacts(data.data || []);
        setTotalPages(data.totalPages);

    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os contatos."})
    } finally {
        setLoading(false);
    }
  }, [page, limit, sortBy, search, tagFilter, listFilter, toast]);

  useEffect(() => {
    const debounce = setTimeout(() => {
        fetchContacts();
    }, 300)

    return () => clearTimeout(debounce)
  }, [fetchContacts]);
  
  useEffect(() => {
    const fetchFilters = async () => {
        try {
            const [tagsRes, listsRes] = await Promise.all([
                fetch('/api/v1/tags'),
                fetch('/api/v1/lists')
            ]);
            if (!tagsRes.ok || !listsRes.ok) throw new Error("Failed to fetch filter options");
            const tagsData = await tagsRes.json();
            const listsData = await listsRes.json();
            setAvailableTags(tagsData);
            setAvailableLists(listsData);
        } catch (error) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as opções de filtro."})
        }
    };
    fetchFilters();
  }, [toast]);
  
  const handleSort = (key: SortKey) => {
    const [currentKey, currentOrder] = sortBy.split(':');
    if (key === currentKey) {
        setSortBy(`${key}:${currentOrder === 'asc' ? 'desc' : 'asc'}`);
    } else {
        setSortBy(`${key}:desc`);
    }
  };

  const handleRowClick = (contactId: string) => {
    router.push(`/contacts/${contactId}`);
  };

  const handleDelete = async (contactId: string) => {
    const originalContacts = [...contacts];
    setContacts(prev => prev.filter(c => c.id !== contactId));
    try {
      const response = await fetch(`/api/v1/contacts/${contactId}`, { method: 'DELETE' });
      if (response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao excluir contato.');
      }
      toast({ title: 'Contato excluído!', description: 'O contato foi removido com sucesso.' });
      fetchContacts(); // Refresh data
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: (error as Error).message });
      setContacts(originalContacts); // Rollback on failure
    }
  };


  const handleBulkDelete = async () => {
    toast({
        title: "A excluir contatos...",
        description: `Por favor aguarde enquanto ${selectedRows.length} contatos são excluídos.`,
    });
    
    const originalContacts = [...contacts];
    const newContacts = contacts.filter(c => !selectedRows.includes(c.id));
    setContacts(newContacts);

    try {
        const results = await Promise.all(selectedRows.map(id => fetch(`/api/v1/contacts/${id}`, { method: 'DELETE' })));
        const failed = results.filter(res => !res.ok);
        if (failed.length > 0) {
            throw new Error(`${failed.length} contatos não puderam ser excluídos.`);
        }
        toast({
            title: `${selectedRows.length} contatos excluídos`,
            description: 'Os contatos selecionados foram removidos com sucesso.',
        });
        fetchContacts(); // Refresh data
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao excluir',
            description: error instanceof Error ? error.message : 'Ocorreu um erro.',
        });
        setContacts(originalContacts); // Rollback
    } finally {
        setSelectedRows([]);
    }
  }
  
  return (
    <>
      <div className="flex items-center justify-between">
        <PageHeader
          title="Contatos"
          description="Gerencie a sua base de clientes e leads."
        />
        <div className="flex items-center gap-2">
           <AddContactDialog onSaveSuccess={fetchContacts}>
                <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar
                </Button>
           </AddContactDialog>
           <ImportContactsDialog onImportCompleted={fetchContacts}>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Contatos
                </Button>
            </ImportContactsDialog>
        </div>
      </div>
      
       <div className="flex flex-col gap-4">
         <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-auto sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                className="pl-9 w-full sm:w-80"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
                <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filtrar por Tag" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Tags</SelectItem>
                        {Array.isArray(availableTags) && availableTags.map(tag => <SelectItem key={tag.id} value={tag.id!}>{tag.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={listFilter} onValueChange={setListFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filtrar por Lista" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Listas</SelectItem>
                         {Array.isArray(availableLists) && availableLists.map(list => <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="createdAt:desc">Mais Recentes</SelectItem>
                        <SelectItem value="createdAt:asc">Mais Antigos</SelectItem>
                        <SelectItem value="name:asc">Nome (A-Z)</SelectItem>
                        <SelectItem value="name:desc">Nome (Z-A)</SelectItem>
                    </SelectContent>
                </Select>
                {!isMobile && (
                  <div className="flex items-center gap-2">
                      <Button variant={view === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setView('table')}>
                          <List className="h-4 w-4" />
                      </Button>
                      <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setView('grid')}>
                          <LayoutGrid className="h-4 w-4" />
                      </Button>
                  </div>
                )}
            </div>
         </div>
       </div>
      
       {selectedRows.length > 0 && (
         <div className="mb-4 p-3 bg-muted rounded-lg flex flex-col sm:flex-row gap-4 justify-between items-center">
            <p className="text-sm font-medium">{selectedRows.length} contato(s) selecionado(s)</p>
            <div className="flex gap-2 flex-wrap justify-center">
                <Button variant="outline" size="sm"><Tags className="mr-2 h-4 w-4" />Adicionar Tag</Button>
                <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Exportar</Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
            </div>
         </div>
       )}
      
      {loading ? (
        <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : view === 'table' && !isMobile ? (
        <ContactTableView contacts={contacts} onRowClick={handleRowClick} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows} isMobile={false} onDelete={handleDelete} onSort={handleSort}/>
      ) : isMobile ? (
        <ContactTableView contacts={contacts} onRowClick={handleRowClick} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows} isMobile={true} onDelete={handleDelete} onSort={handleSort}/>
      ) : (
        <ContactGrid contacts={contacts} onRowClick={handleRowClick} />
      )}
      
       {totalPages > 1 && (
         <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                {selectedRows.length > 0 ? (
                    `${selectedRows.length} de ${contacts.length} linha(s) selecionadas.`
                ) : (
                    `Página ${page} de ${totalPages}.`
                )}
            </div>
            <div className="flex items-center gap-2">
                 <Select value={limit.toString()} onValueChange={(value) => {setLimit(parseInt(value, 10)); setPage(1);}}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[10, 25, 50, 100, 250, 500].map(val => (
                             <SelectItem key={val} value={val.toString()}>{val} por página</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
         </div>
       )}
    </>
  );
}
