'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Building, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Company {
  id: string;
  name: string;
  email?: string;
  createdAt?: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/v1/admin/companies');
        if (!response.ok) throw new Error('Falha ao carregar empresas');
        const data = await response.json();
        setCompanies(data.companies || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Gerenciamento de Empresas" description="Visualize e gerencie todas as empresas do sistema" />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Total de Empresas: {companies.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : companies.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhuma empresa encontrada</TableCell></TableRow>
                ) : (
                  companies.map(company => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="font-mono text-sm">{company.email || '—'}</TableCell>
                      <TableCell className="text-center"><Button variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
