
// src/app/(marketing)/login/page.tsx
'use client';

import { Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { BotMessageSquare, Eye, EyeOff, Loader2, AlertTriangle, Quote } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '@/components/landing/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import VersionBadge from '@/components/version-badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay"


const errorMessages: Record<string, { title: string; description: string }> = {
  token_expirado: {
    title: 'Sessão Expirada',
    description: 'Sua sessão expirou. Por favor, faça login novamente para continuar.',
  },
  token_invalido: {
    title: 'Sessão Inválida',
    description: 'Houve um problema com sua sessão. Por favor, faça login novamente.',
  },
  usuario_nao_encontrado: {
    title: 'Utilizador Não Encontrado',
    description: 'A sua conta não foi encontrada no banco de dados. O utilizador pode ter sido removido.',
  },
  token_nao_encontrado: {
    title: 'Sessão Não Encontrada',
    description: 'Você precisa fazer login para aceder a esta página.',
  },
  erro_banco_dados: {
    title: 'Erro de Servidor',
    description: 'Não foi possível conectar ao banco de dados para validar sua sessão. Tente novamente mais tarde.',
  },
   dados_usuario_ausentes: {
    title: 'Erro de Sessão',
    description: 'Os dados do utilizador não foram encontrados na sessão. Por favor, tente fazer login novamente.',
  },
};

const marketingQuotes = [
    {
        quote: "O objetivo do marketing é conhecer e entender o cliente tão bem que o produto ou serviço se vende sozinho.",
        author: "Peter Drucker"
    },
    {
        quote: "Marketing não é sobre as coisas que você faz, mas sobre as histórias que você conta.",
        author: "Seth Godin"
    },
    {
        quote: "As pessoas não compram o que você faz, elas compram o porquê você faz.",
        author: "Simon Sinek"
    },
    {
        quote: "A melhor publicidade é a que os clientes satisfeitos fazem.",
        author: "Philip Kotler"
    },
    {
        quote: "O ótimo marketing faz o cliente se sentir inteligente.",
        author: "Joe Chernov"
    }
];


function LoginError() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get('error');

  if (!errorKey || !errorMessages[errorKey]) {
    return null;
  }
  
  const errorDetails = errorMessages[errorKey];

  return (
    <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{errorDetails.title}</AlertTitle>
        <AlertDescription>{errorDetails.description}</AlertDescription>
    </Alert>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const plugin = useRef(
    Autoplay({ delay: 7000, stopOnInteraction: false, stopOnMouseEnter: true })
  )


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Falha no login.');
        }

        toast({ title: "Login bem-sucedido!", description: "A redirecionar para o painel de controlo..." });
        router.push('/dashboard');

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
        toast({
            variant: 'destructive',
            title: 'Erro de Login',
            description: errorMessage,
        })
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-muted/40 p-10 text-center space-y-6">
        <div className="flex items-center gap-4 text-primary">
          <BotMessageSquare className="h-12 w-12" />
          <h1 className="text-4xl font-bold text-foreground">Master IA</h1>
        </div>
        <Carousel
            opts={{
                loop: true,
                align: "start",
            }}
            plugins={[plugin.current]}
            className="w-full max-w-lg"
        >
          <CarouselContent>
            {marketingQuotes.map((item, index) => (
              <CarouselItem key={index}>
                <div className="p-1 text-center">
                    <Quote className="h-8 w-8 text-muted-foreground mb-4 mx-auto" />
                    <p className="text-xl font-medium text-foreground">&quot;{item.quote}&quot;</p>
                    <p className="text-sm text-muted-foreground mt-4">- {item.author}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-4 right-4">
            <VersionBadge prefix="v"/>
        </div>
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-center">Bem-vindo de volta!</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
                Acesse sua conta para continuar.
            </p>
          </div>

          <Suspense fallback={null}>
            <LoginError />
          </Suspense>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                        Esqueceu sua senha?
                    </Link>
                </div>
                <div className="relative">
                    <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required placeholder="password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
              </div>
            </div>
            
            <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>
          </form>
          
          <p className="text-sm text-center text-muted-foreground">
              Ainda não tem uma conta?{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Cadastre-se
              </Link>
          </p>
        </div>
      </div>
    </div>
    <ThemeToggle />
    </>
  );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <LoginPageContent />
        </Suspense>
    )
}
