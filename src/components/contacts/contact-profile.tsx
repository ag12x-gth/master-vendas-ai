

'use client';

import { notFound, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save, X, Edit, UserCircle, MapPin, Tag as TagIcon, StickyNote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { ExtendedContact, ContactList, Tag as TagType } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { StartConversationDialog } from './start-conversation-dialog';
import { MultiSelectCreatable } from '../ui/multi-select-creatable';

interface EditableSectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    isEditing: boolean;
    isSaving: boolean;
    onEdit: () => void;
    onSave: () => Promise<void>;
    onCancel: () => void;
}

const EditableCardSection: React.FC<EditableSectionProps> = ({ title, icon: Icon, children, isEditing, isSaving, onEdit, onSave, onCancel }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {title}
            </CardTitle>
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSaving}>
                            <X className="mr-2 h-4 w-4" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={onSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar
                        </Button>
                    </>
                ) : (
                    <Button size="sm" variant="outline" onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);

const ViewModeField = ({ label, value }: { label: string, value: string | null | undefined }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value || '-'}</p>
    </div>
);

const ProfileSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-20" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col items-center"><Skeleton className="h-24 w-24 rounded-full" /></div>
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
             <Card>
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4"><Skeleton className="h-12 w-full" /></div>
                    <div className="space-y-4"><Skeleton className="h-12 w-full" /></div>
                </CardContent>
            </Card>
        </div>
    </div>
)

export function ContactProfile({ contactId }: { contactId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [contact, setContact] = useState<ExtendedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [editingSection, setEditingSection] = useState<'profile' | 'address' | 'segmentation' | 'notes' | null>(null);

  const [formState, setFormState] = useState<Partial<ExtendedContact>>({});
  
  const [_availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [_availableLists, setAvailableLists] = useState<ContactList[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  
  const fetchContact = useCallback(async () => {
    try {
        setLoading(true);
        const [contactRes, tagsRes, listsRes] = await Promise.all([
            fetch(`/api/v1/contacts/${contactId}`),
            fetch('/api/v1/tags'),
            fetch('/api/v1/lists')
        ]);

        if (!contactRes.ok) {
            if (contactRes.status === 404) notFound();
            throw new Error("Falha ao carregar o contato.");
        }
        if (!tagsRes.ok || !listsRes.ok) throw new Error("Falha ao carregar opções de segmentação.");
        
        const data: ExtendedContact = await contactRes.json();
        setContact(data);
        setFormState(data);
        setSelectedTagIds(data.tags?.map(t => t.id) || []);
        setSelectedListIds(data.lists?.map(l => l.id) || []);

        setAvailableTags(await tagsRes.json());
        setAvailableLists(await listsRes.json());

    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : "Ocorreu um erro." })
    } finally {
        setLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    void fetchContact();
  }, [contactId, fetchContact]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }
  
  const handleCancelEdit = () => {
    setFormState(contact || {});
    setSelectedTagIds(contact?.tags?.map(t => t.id) || []);
    setSelectedListIds(contact?.lists?.map(l => l.id) || []);
    setEditingSection(null);
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Partial<ExtendedContact> & { tagIds?: string[], listIds?: string[] } = { ...formState };
      
      if (editingSection === 'segmentation') {
        payload.tagIds = selectedTagIds;
        payload.listIds = selectedListIds;
      }

      const response = await fetch(`/api/v1/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar as alterações.');
      }
      
      await fetchContact();
      setEditingSection(null);
      toast({ title: 'Sucesso!', description: 'As informações do contato foram atualizadas.'});

    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro ao salvar', description: error instanceof Error ? error.message : "Ocorreu um erro."})
    } finally {
        setIsSaving(false);
    }
  }

  if (!contact && !loading) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={loading ? 'Carregando...' : contact?.name || 'Perfil do Contato'} description={loading ? '' : "Perfil detalhado do contato."}>
          <div className="flex items-center gap-2">
            <StartConversationDialog contact={contact} />
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
            </Button>
          </div>
      </PageHeader>
      
      {loading ? <ProfileSkeleton /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {contact && (
                <div className="lg:col-span-1 space-y-6">
                    <EditableCardSection 
                        title="Informações Pessoais" 
                        icon={UserCircle} 
                        isEditing={editingSection === 'profile'} 
                        isSaving={isSaving}
                        onEdit={() => setEditingSection('profile')}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                    >
                        <div className="space-y-4">
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 mb-4">
                                <AvatarImage src={formState.avatarUrl || `https://placehold.co/96x96.png`} alt={contact.name} data-ai-hint="avatar user"/>
                                <AvatarFallback>{contact.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            {editingSection === 'profile' && (
                                <div className='w-full space-y-2'>
                                    <Label htmlFor="avatarUrl">URL do Avatar</Label>
                                    <Input name="avatarUrl" id="avatarUrl" placeholder="https://..." value={formState.avatarUrl || ''} onChange={handleInputChange} />
                                </div>
                            )}
                        </div>
                        {editingSection === 'profile' ? (
                            <>
                            <div className="space-y-2"><Label htmlFor='name'>Nome</Label><Input name='name' id='name' value={formState.name || ''} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor='whatsappName'>Nome no WhatsApp</Label><Input name='whatsappName' id='whatsappName' value={formState.whatsappName || ''} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor='phone'>Telefone</Label><Input name='phone' id='phone' value={formState.phone || ''} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor='email'>Email</Label><Input name='email' id='email' type="email" value={formState.email || ''} onChange={handleInputChange}/></div>
                            </>
                        ) : (
                            <>
                            <ViewModeField label="Nome" value={contact.name} />
                            <ViewModeField label="Nome no WhatsApp" value={contact.whatsappName} />
                            <ViewModeField label="Telefone" value={contact.phone} />
                            <ViewModeField label="Email" value={contact.email} />
                            </>
                        )}
                        </div>
                    </EditableCardSection>

                    <EditableCardSection 
                        title="Endereço" 
                        icon={MapPin}
                        isEditing={editingSection === 'address'}
                        isSaving={isSaving}
                        onEdit={() => setEditingSection('address')}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                    >
                        {editingSection === 'address' ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div className="col-span-2 space-y-2"><Label htmlFor='addressStreet'>Rua</Label><Input name='addressStreet' id='addressStreet' value={formState.addressStreet || ''} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor='addressNumber'>Número</Label><Input name='addressNumber' id='addressNumber' value={formState.addressNumber || ''} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor='addressComplement'>Comp.</Label><Input name='addressComplement' id='addressComplement' value={formState.addressComplement || ''} onChange={handleInputChange}/></div>
                            <div className="col-span-2 space-y-2"><Label htmlFor='addressDistrict'>Bairro</Label><Input name='addressDistrict' id='addressDistrict' value={formState.addressDistrict || ''} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor='addressCity'>Cidade</Label><Input name='addressCity' id='addressCity' value={formState.addressCity || ''} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor='addressState'>Estado</Label><Input name='addressState' id='addressState' value={formState.addressState || ''} onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor='addressZipCode'>CEP</Label><Input name='addressZipCode' id='addressZipCode' value={formState.addressZipCode || ''} onChange={handleInputChange}/></div>
                        </div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                <p>{`${contact.addressStreet || 'Rua não informada'}, ${contact.addressNumber || 'S/N'}`}</p>
                                <p>{contact.addressDistrict || 'Bairro não informado'}</p>
                                <p>{`${contact.addressCity || 'Cidade não informada'} - ${contact.addressState || 'UF'}`}</p>
                                <p>CEP: {contact.addressZipCode || '-'}</p>
                            </div>
                        )}
                    </EditableCardSection>

                    <EditableCardSection 
                        title="Segmentação" 
                        icon={TagIcon}
                        isEditing={editingSection === 'segmentation'}
                        isSaving={isSaving}
                        onEdit={() => setEditingSection('segmentation')}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                    >
                      <div className="space-y-4">
                          <div>
                              <Label>Tags</Label>
                              {editingSection === 'segmentation' ? (
                                <MultiSelectCreatable
                                    selected={selectedTagIds}
                                    onChange={setSelectedTagIds}
                                    placeholder="Selecione as tags..."
                                    createEndpoint="tags"
                                    createResourceType="tag"
                                />
                              ) : (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {contact.tags?.map(tag => ( <Badge key={tag.id} style={{backgroundColor: tag.color, color: '#fff'}}>{tag.name}</Badge> ))}
                                    {(!contact.tags || contact.tags.length === 0) && ( <p className="text-sm text-muted-foreground">Nenhuma tag.</p> )}
                                </div>
                              )}
                          </div>
                          <div>
                              <Label>Listas</Label>
                              {editingSection === 'segmentation' ? (
                                <MultiSelectCreatable
                                    selected={selectedListIds}
                                    onChange={setSelectedListIds}
                                    placeholder="Selecione as listas..."
                                    createEndpoint='lists'
                                    createResourceType='list'
                                />
                              ) : (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {contact.lists?.map(list => ( <Badge key={list.id} variant="secondary">{list.name}</Badge> ))}
                                    {(!contact.lists || contact.lists.length === 0) && ( <p className="text-sm text-muted-foreground">Nenhuma lista.</p> )}
                                </div>
                              )}
                          </div>
                      </div>
                    </EditableCardSection>
                </div>
            )}
            
            <div className="lg:col-span-2 space-y-6">
                <EditableCardSection 
                    title="Notas Internas" 
                    icon={StickyNote}
                    isEditing={editingSection === 'notes'}
                    isSaving={isSaving}
                    onEdit={() => setEditingSection('notes')}
                    onSave={handleSave}
                    onCancel={handleCancelEdit}
                >
                    {editingSection === 'notes' ? (
                    <Textarea placeholder="Adicione uma nota sobre este contato..." value={formState.notes || ''} name="notes" onChange={handleInputChange}/>
                    ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact?.notes || 'Nenhuma nota registrada.'}</p>
                    )}
                </EditableCardSection>

                 <Card>
                    <CardHeader>
                        <CardTitle>Timeline de Atividades</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Placeholder para a timeline */}
                        <div className="text-center text-muted-foreground py-8">
                            A timeline de atividades será implementada aqui.
                        </div>
                    </CardContent>
                 </Card>
            </div>
        </div>
      )}
    </div>
  )
}
