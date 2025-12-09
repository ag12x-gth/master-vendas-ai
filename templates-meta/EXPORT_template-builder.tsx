'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
}

interface TemplateData {
  name: string;
  displayName?: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: TemplateComponent[];
}

interface TemplateBuilderProps {
  onSave: (template: TemplateData) => Promise<void>;
  initialData?: Partial<TemplateData>;
  connectionId: string;
}

export function TemplateBuilder({
  onSave,
  initialData,
  _connectionId,
}: TemplateBuilderProps) {
  const [template, setTemplate] = useState<TemplateData>({
    name: initialData?.name || '',
    displayName: initialData?.displayName || '',
    category: initialData?.category || 'MARKETING',
    language: initialData?.language || 'pt_BR',
    components: initialData?.components || [],
  });

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateName = (name: string): boolean => {
    const regex = /^[a-z0-9_]+$/;
    if (!regex.test(name)) {
      setErrors((prev) => ({
        ...prev,
        name: 'Nome deve conter apenas letras minúsculas, números e underscore',
      }));
      return false;
    }
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.name;
      return newErrors;
    });
    return true;
  };

  const validateHeaderText = (text: string, componentIndex: number): boolean => {
    // Regex COMPLETA para detectar TODOS os emojis usando Unicode property escapes
    // Detecta: emojis, flags, keycaps, pictográficos, ZWJ sequences, variation selectors
    const emojiRegex = /[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Component}]/gu;
    
    // Caracteres inválidos: quebras de linha e asteriscos
    const invalidChars = /[\n\r*]/;
    
    const errorKey = `header_${componentIndex}`;
    
    if (emojiRegex.test(text)) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: '⚠️ HEADER não pode conter emojis (regra da Meta Cloud API)',
      }));
      return false;
    }
    
    if (invalidChars.test(text)) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: '⚠️ HEADER não pode conter quebras de linha ou asteriscos (*)',
      }));
      return false;
    }
    
    if (text.length > 60) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: '⚠️ HEADER deve ter no máximo 60 caracteres',
      }));
      return false;
    }
    
    // Remove erro se validação passou
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });
    return true;
  };

  const addComponent = (type: TemplateComponent['type']) => {
    const newComponent: TemplateComponent = {
      type,
      ...(type === 'HEADER' && { format: 'TEXT' as const, text: '' }),
      ...(type === 'BODY' && { text: '' }),
      ...(type === 'FOOTER' && { text: '' }),
      ...(type === 'BUTTONS' && { buttons: [] }),
    };

    setTemplate((prev) => ({
      ...prev,
      components: [...prev.components, newComponent],
    }));
  };

  const removeComponent = (index: number) => {
    setTemplate((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  const updateComponent = (
    index: number,
    updates: Partial<TemplateComponent>
  ) => {
    setTemplate((prev) => ({
      ...prev,
      components: prev.components.map((comp, i) =>
        i === index ? { ...comp, ...updates } : comp
      ),
    }));
  };

  const addButton = (componentIndex: number) => {
    const component = template.components[componentIndex];
    if (component && component.type === 'BUTTONS') {
      const newButton = {
        type: 'QUICK_REPLY' as const,
        text: '',
      };
      updateComponent(componentIndex, {
        buttons: [...(component.buttons || []), newButton],
      });
    }
  };

  const updateButton = (
    componentIndex: number,
    buttonIndex: number,
    updates: any
  ) => {
    const component = template.components[componentIndex];
    if (component && component.type === 'BUTTONS' && component.buttons) {
      const newButtons = component.buttons.map((btn, i) =>
        i === buttonIndex ? { ...btn, ...updates } : btn
      );
      updateComponent(componentIndex, { buttons: newButtons });
    }
  };

  const removeButton = (componentIndex: number, buttonIndex: number) => {
    const component = template.components[componentIndex];
    if (component && component.type === 'BUTTONS' && component.buttons) {
      updateComponent(componentIndex, {
        buttons: component.buttons.filter((_, i) => i !== buttonIndex),
      });
    }
  };

  const handleSave = async () => {
    if (!validateName(template.name)) {
      return;
    }

    if (template.components.length === 0) {
      setErrors((prev) => ({
        ...prev,
        components: 'Adicione pelo menos um componente',
      }));
      return;
    }

    // Validar HEADER antes de salvar
    const headerIndex = template.components.findIndex(c => c.type === 'HEADER');
    if (headerIndex !== -1) {
      const headerComponent = template.components[headerIndex];
      if (headerComponent && headerComponent.text && !validateHeaderText(headerComponent.text, headerIndex)) {
        return; // Para o salvamento se HEADER inválido
      }
    }

    try {
      await onSave(template);
    } catch (error) {
      console.error('Erro ao salvar template:', error);
    }
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\d+)\}\}/g;
    const matches = text.matchAll(regex);
    return Array.from(matches, (m) => m[1]).filter((v): v is string => v !== undefined);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">
              Nome do Template <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={template.name}
              onChange={(e) => {
                setTemplate((prev) => ({ ...prev, name: e.target.value }));
                validateName(e.target.value);
              }}
              placeholder="ex: boas_vindas_2024"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="displayName">Nome de Exibição</Label>
            <Input
              id="displayName"
              value={template.displayName || ''}
              onChange={(e) =>
                setTemplate((prev) => ({
                  ...prev,
                  displayName: e.target.value,
                }))
              }
              placeholder="Boas-Vindas 2024"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">
                Categoria <span className="text-red-500">*</span>
              </Label>
              <Select
                value={template.category}
                onValueChange={(value: TemplateData['category']) =>
                  setTemplate((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utilidade</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language">Idioma</Label>
              <Select
                value={template.language}
                onValueChange={(value) =>
                  setTemplate((prev) => ({ ...prev, language: value }))
                }
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">Português (BR)</SelectItem>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="es_ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Componentes do Template</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addComponent('HEADER')}
                disabled={template.components.some((c) => c.type === 'HEADER')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Cabeçalho
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addComponent('BODY')}
                disabled={template.components.some((c) => c.type === 'BODY')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Corpo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addComponent('FOOTER')}
                disabled={template.components.some((c) => c.type === 'FOOTER')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Rodapé
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addComponent('BUTTONS')}
                disabled={template.components.some((c) => c.type === 'BUTTONS')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Botões
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {template.components.length === 0 ? (
            <Alert>
              <AlertDescription>
                Adicione componentes ao seu template usando os botões acima
              </AlertDescription>
            </Alert>
          ) : (
            template.components.map((component, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>{component.type}</Badge>
                      {component.type === 'HEADER' && component.format && (
                        <Badge variant="outline">{component.format}</Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeComponent(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(component.type === 'HEADER' ||
                    component.type === 'BODY' ||
                    component.type === 'FOOTER') && (
                    <div>
                      <Label>Texto</Label>
                      <Textarea
                        value={component.text || ''}
                        onChange={(e) => {
                          const newText = e.target.value;
                          updateComponent(index, { text: newText });
                          
                          // Validar apenas para HEADER
                          if (component.type === 'HEADER') {
                            validateHeaderText(newText, index);
                          }
                        }}
                        placeholder={`Digite o texto do ${component.type.toLowerCase()}. Use {{1}}, {{2}} para variáveis`}
                        rows={3}
                        className={errors[`header_${index}`] ? 'border-red-500' : ''}
                      />
                      {errors[`header_${index}`] && (
                        <p className="text-sm text-red-500 mt-1 font-medium">
                          {errors[`header_${index}`]}
                        </p>
                      )}
                      {component.text && extractVariables(component.text).length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Variáveis detectadas:{' '}
                          {extractVariables(component.text).join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {component.type === 'BUTTONS' && (
                    <div className="space-y-3">
                      {component.buttons?.map((button, btnIndex) => (
                        <Card key={btnIndex}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-3">
                                <Select
                                  value={button.type}
                                  onValueChange={(value) =>
                                    updateButton(index, btnIndex, {
                                      type: value as any,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="QUICK_REPLY">
                                      Resposta Rápida
                                    </SelectItem>
                                    <SelectItem value="URL">URL</SelectItem>
                                    <SelectItem value="PHONE_NUMBER">
                                      Telefone
                                    </SelectItem>
                                  </SelectContent>
                                </Select>

                                <Input
                                  value={button.text}
                                  onChange={(e) =>
                                    updateButton(index, btnIndex, {
                                      text: e.target.value,
                                    })
                                  }
                                  placeholder="Texto do botão"
                                  maxLength={20}
                                />

                                {button.type === 'URL' && (
                                  <Input
                                    value={button.url || ''}
                                    onChange={(e) =>
                                      updateButton(index, btnIndex, {
                                        url: e.target.value,
                                      })
                                    }
                                    placeholder="https://exemplo.com"
                                  />
                                )}

                                {button.type === 'PHONE_NUMBER' && (
                                  <Input
                                    value={button.phone_number || ''}
                                    onChange={(e) =>
                                      updateButton(index, btnIndex, {
                                        phone_number: e.target.value,
                                      })
                                    }
                                    placeholder="+5511999999999"
                                  />
                                )}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeButton(index, btnIndex)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addButton(index)}
                        disabled={(component.buttons?.length || 0) >= 3}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Botão (max 3)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? 'Ocultar' : 'Mostrar'} Preview
        </Button>

        <Button onClick={handleSave}>Salvar Template</Button>
      </div>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview do Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              {template.components.map((comp, idx) => (
                <div key={idx}>
                  {comp.type === 'HEADER' && (
                    <div className="font-bold text-lg">{comp.text}</div>
                  )}
                  {comp.type === 'BODY' && (
                    <div className="whitespace-pre-wrap">{comp.text}</div>
                  )}
                  {comp.type === 'FOOTER' && (
                    <div className="text-sm text-muted-foreground">
                      {comp.text}
                    </div>
                  )}
                  {comp.type === 'BUTTONS' && (
                    <div className="flex flex-col gap-2 mt-2">
                      {comp.buttons?.map((btn, btnIdx) => (
                        <Button key={btnIdx} variant="outline" size="sm">
                          {btn.text}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
