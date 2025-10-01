-- Script SQL para criar/atualizar usuário de teste
-- Primeiro vamos verificar se o usuário existe e atualizá-lo ou criá-lo

-- Obter o ID de uma empresa existente
DO $$
DECLARE
    company_id_var UUID;
    user_id_var UUID;
BEGIN
    -- Buscar primeira empresa disponível
    SELECT id INTO company_id_var FROM companies LIMIT 1;
    
    IF company_id_var IS NULL THEN
        RAISE EXCEPTION 'Nenhuma empresa encontrada no banco';
    END IF;
    
    -- Verificar se usuário já existe
    SELECT id INTO user_id_var FROM users 
    WHERE email = 'jeferson@masteriaoficial.com.br';
    
    IF user_id_var IS NOT NULL THEN
        -- Atualizar usuário existente
        UPDATE users 
        SET 
            password = '$2a$10$8KqPXGpB4tGXJ.yV8vH0VuQhSKGJdJpXqRxRBPOj5dVHBzMPkGzZS', -- Hash para Test@123456
            email_verified = true,
            role = 'ADMIN'
        WHERE id = user_id_var;
        
        RAISE NOTICE 'Usuário atualizado com sucesso! ID: %', user_id_var;
    ELSE
        -- Criar novo usuário
        INSERT INTO users (
            email, 
            password, 
            company_id, 
            email_verified,
            role,
            name
        ) VALUES (
            'jeferson@masteriaoficial.com.br',
            '$2a$10$8KqPXGpB4tGXJ.yV8vH0VuQhSKGJdJpXqRxRBPOj5dVHBzMPkGzZS', -- Hash para Test@123456
            company_id_var,
            true,
            'ADMIN',
            'Jeferson Teste'
        ) RETURNING id INTO user_id_var;
        
        RAISE NOTICE 'Novo usuário criado com sucesso! ID: %', user_id_var;
    END IF;
    
    RAISE NOTICE 'Credenciais do usuário de teste:';
    RAISE NOTICE 'Email: jeferson@masteriaoficial.com.br';
    RAISE NOTICE 'Senha: Test@123456';
    RAISE NOTICE 'Company ID: %', company_id_var;
END $$;