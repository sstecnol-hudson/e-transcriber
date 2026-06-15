-- ============================================================
-- E-TRANSCRIBER — ATUALIZAÇÃO DO BANCO SUPABASE (Google Auth)
-- Execute este SQL no: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Cria a trigger para criar o perfil do médico automaticamente ao registrar via Google Auth
-- O CRM inicia como NULL e será atualizado quando preencherem os Dados do Consultório.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.medicos (user_id, name, crm, is_admin)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'full_name', 
      new.email
    ),
    NULL, -- CRM inicia vazio
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove a trigger anterior (se existir) e cria a nova
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Limpeza/Ajuste de tabelas existentes (opcional)
-- Desativa a coluna anterior de troca de senha se já tiver sido criada
ALTER TABLE public.medicos DROP COLUMN IF EXISTS requires_password_change;
