// src/lib/rag/prompt-parser.ts
import OpenAI from 'openai';
import { z } from 'zod';
import type { Language } from '../prompt-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimiter.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export const ParsedSectionSchema = z.object({
  sectionName: z.string().min(1).max(100),
  content: z.string().min(1),
  language: z.enum(['pt', 'es', 'en', 'all']),
  priority: z.number().int().min(1).max(100),
  tags: z.array(z.string()).optional(),
});

export type ParsedSection = z.infer<typeof ParsedSectionSchema>;

const ParsedSectionsResponseSchema = z.object({
  sections: z.array(ParsedSectionSchema),
});

const PARSER_SYSTEM_PROMPT = `Você é um especialista em análise de prompts de IA. Sua tarefa é analisar um prompt completo e dividi-lo em seções lógicas e bem estruturadas.

**REGRAS OBRIGATÓRIAS:**
1. Mantenha o conteúdo INTACTO - não modifique, resuma ou parafraseie o texto original
2. Identifique seções lógicas naturais (identidade, regras, produtos, gatilhos, exemplos, etc)
3. Atribua prioridades: mais importantes = maior prioridade (100 = máxima, 1 = mínima)
4. Use tags descritivas para cada seção
5. Detecte o idioma predominante do prompt (pt, es, en ou 'all' se multilíngue)
6. Crie no mínimo 3 seções e no máximo 15 seções
7. Seções de identidade/papel sempre têm prioridade 100
8. Seções de regras gerais têm prioridade 80-90
9. Seções de exemplos/fluxos têm prioridade 50-70

**FORMATO DE SAÍDA (JSON):**
{
  "sections": [
    {
      "sectionName": "nome_descritivo_curto",
      "content": "conteúdo original exato da seção",
      "language": "pt|es|en|all",
      "priority": 100,
      "tags": ["tag1", "tag2"]
    }
  ]
}

**EXEMPLO DE DIVISÃO:**
Se o prompt diz:
"Você é João, vendedor da empresa X. Sempre use tom profissional. Produtos: A, B, C."

Divida em:
- Seção 1: "identidade" (priority 100) → "Você é João, vendedor da empresa X."
- Seção 2: "regras_comunicacao" (priority 90) → "Sempre use tom profissional."
- Seção 3: "catalogo_produtos" (priority 80) → "Produtos: A, B, C."`;

export interface PromptParserOptions {
  useAI?: boolean;
  defaultLanguage?: Language;
  minSections?: number;
  maxSections?: number;
}

export async function parsePromptIntoSections(
  systemPrompt: string,
  options: PromptParserOptions = {},
  rateLimitIdentifier: string = 'global'
): Promise<ParsedSection[]> {
  const {
    useAI = true,
    defaultLanguage = 'pt',
    minSections = 3,
    maxSections = 15,
  } = options;

  if (!systemPrompt || systemPrompt.trim().length === 0) {
    throw new Error('Prompt vazio ou inválido');
  }

  if (useAI && !checkRateLimit(rateLimitIdentifier)) {
    console.warn(`[PromptParser] Rate limit excedido para ${rateLimitIdentifier}, usando fallback heurístico`);
    return parseWithHeuristics(systemPrompt, defaultLanguage);
  }

  if (useAI) {
    try {
      return await parseWithAI(systemPrompt, defaultLanguage, minSections, maxSections);
    } catch (error) {
      console.error('[PromptParser] Erro ao usar IA, usando fallback heurístico:', error);
      return parseWithHeuristics(systemPrompt, defaultLanguage);
    }
  }

  return parseWithHeuristics(systemPrompt, defaultLanguage);
}

async function parseWithAI(
  systemPrompt: string,
  defaultLanguage: Language,
  minSections: number,
  maxSections: number
): Promise<ParsedSection[]> {
  const userPrompt = `Analise o seguinte prompt de IA e divida-o em seções lógicas:

${systemPrompt}

Lembre-se:
- Mínimo de ${minSections} seções, máximo de ${maxSections}
- Mantenha o conteúdo EXATAMENTE como está (sem modificações)
- Idioma padrão: ${defaultLanguage}
- Retorne apenas o JSON válido conforme o formato especificado`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: PARSER_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const responseContent = completion.choices[0]?.message?.content;
  
  if (!responseContent) {
    throw new Error('Resposta vazia da API OpenAI');
  }

  const parsed = JSON.parse(responseContent);
  const validated = ParsedSectionsResponseSchema.parse(parsed);

  if (validated.sections.length < minSections) {
    console.warn(`[PromptParser] IA retornou menos seções que o mínimo (${validated.sections.length} < ${minSections}), usando fallback`);
    return parseWithHeuristics(systemPrompt, defaultLanguage);
  }

  if (validated.sections.length > maxSections) {
    console.warn(`[PromptParser] IA retornou mais seções que o máximo (${validated.sections.length} > ${maxSections}), truncando`);
    return validated.sections.slice(0, maxSections);
  }

  console.log(`[PromptParser] ✅ IA gerou ${validated.sections.length} seções com sucesso`);
  return validated.sections;
}

function parseWithHeuristics(
  systemPrompt: string,
  defaultLanguage: Language
): ParsedSection[] {
  console.log('[PromptParser] Usando parser heurístico (fallback)');

  const sections: ParsedSection[] = [];
  const lines = systemPrompt.split('\n');
  
  let currentSection: { name: string; content: string[]; priority: number; tags: string[] } | null = null;
  let sectionCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    
    if (!line) continue;

    const isHeader = 
      line.startsWith('**') && line.endsWith('**') ||
      line.startsWith('##') ||
      line.startsWith('#') ||
      line.match(/^[A-Z\s]{3,}:$/);

    if (isHeader) {
      if (currentSection && currentSection.content.length > 0) {
        sections.push({
          sectionName: currentSection.name,
          content: currentSection.content.join('\n'),
          language: defaultLanguage,
          priority: currentSection.priority,
          tags: currentSection.tags,
        });
      }

      sectionCounter++;
      const sectionName = line
        .replace(/^#+\s*/, '')
        .replace(/^\*\*/, '')
        .replace(/\*\*$/, '')
        .replace(/:$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50) || `secao_${sectionCounter}`;

      const priority = inferPriority(sectionName, sectionCounter);
      const tags = inferTags(sectionName);

      currentSection = {
        name: sectionName,
        content: [line],
        priority,
        tags,
      };
    } else {
      if (!currentSection) {
        currentSection = {
          name: `secao_${++sectionCounter}`,
          content: [],
          priority: 100,
          tags: ['core'],
        };
      }
      currentSection.content.push(line);
    }
  }

  if (currentSection && currentSection.content.length > 0) {
    sections.push({
      sectionName: currentSection.name,
      content: currentSection.content.join('\n'),
      language: defaultLanguage,
      priority: currentSection.priority,
      tags: currentSection.tags,
    });
  }

  if (sections.length === 0) {
    sections.push({
      sectionName: 'prompt_completo',
      content: systemPrompt,
      language: defaultLanguage,
      priority: 100,
      tags: ['core', 'fallback'],
    });
  }

  console.log(`[PromptParser] ✅ Parser heurístico gerou ${sections.length} seções`);
  return sections;
}

function inferPriority(sectionName: string, position: number): number {
  const name = sectionName.toLowerCase();
  
  if (name.includes('identidade') || name.includes('identity') || name.includes('voce_e') || name.includes('papel')) {
    return 100;
  }
  
  if (name.includes('missao') || name.includes('mission') || name.includes('objetivo')) {
    return 95;
  }
  
  if (name.includes('regra') || name.includes('instruc') || name.includes('rule') || name.includes('guideline')) {
    return 90;
  }
  
  if (name.includes('produto') || name.includes('servico') || name.includes('catalogo') || name.includes('product')) {
    return 85;
  }
  
  if (name.includes('gatilho') || name.includes('conversao') || name.includes('trigger')) {
    return 80;
  }
  
  if (name.includes('qualifica') || name.includes('pergunta') || name.includes('qualification')) {
    return 75;
  }
  
  if (name.includes('exemplo') || name.includes('fluxo') || name.includes('example') || name.includes('flow')) {
    return 60;
  }
  
  if (name.includes('observacao') || name.includes('nota') || name.includes('note')) {
    return 50;
  }
  
  return Math.max(100 - (position * 5), 40);
}

function inferTags(sectionName: string): string[] {
  const name = sectionName.toLowerCase();
  const tags: string[] = [];
  
  if (name.includes('identidade') || name.includes('identity') || name.includes('papel')) {
    tags.push('identity', 'core');
  }
  
  if (name.includes('missao') || name.includes('mission')) {
    tags.push('mission', 'core');
  }
  
  if (name.includes('regra') || name.includes('rule') || name.includes('instruc')) {
    tags.push('rules', 'guidelines');
  }
  
  if (name.includes('produto') || name.includes('product') || name.includes('catalogo')) {
    tags.push('products', 'catalog');
  }
  
  if (name.includes('gatilho') || name.includes('trigger') || name.includes('conversao')) {
    tags.push('conversion', 'triggers');
  }
  
  if (name.includes('exemplo') || name.includes('example') || name.includes('fluxo')) {
    tags.push('examples', 'flow');
  }
  
  if (name.includes('qualifica') || name.includes('qualification')) {
    tags.push('qualification');
  }
  
  if (tags.length === 0) {
    tags.push('general');
  }
  
  return tags;
}
