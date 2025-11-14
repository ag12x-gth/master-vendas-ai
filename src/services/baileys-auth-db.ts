import { db } from '@/lib/db';
import { baileysAuthState } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { proto } from '@whiskeysockets/baileys';
import { initAuthCreds } from '@whiskeysockets/baileys';

export async function useDatabaseAuthState(connectionId: string) {
  const writeData = async (data: any, key: string) => {
    try {
      const existingAuth = await db.query.baileysAuthState.findFirst({
        where: eq(baileysAuthState.connectionId, connectionId),
      });

      if (existingAuth) {
        if (key === 'creds') {
          await db
            .update(baileysAuthState)
            .set({ creds: data, updatedAt: new Date() })
            .where(eq(baileysAuthState.connectionId, connectionId));
        } else {
          const currentKeys = (existingAuth.keys as any) || {};
          currentKeys[key] = data;
          
          await db
            .update(baileysAuthState)
            .set({ keys: currentKeys, updatedAt: new Date() })
            .where(eq(baileysAuthState.connectionId, connectionId));
        }
      } else {
        const newAuth: any = {
          connectionId,
          creds: key === 'creds' ? data : null,
          keys: key !== 'creds' ? { [key]: data } : {},
          updatedAt: new Date(),
        };
        await db.insert(baileysAuthState).values(newAuth);
      }
    } catch (error) {
      console.error('Error writing auth data:', error);
    }
  };

  const readData = async (key: string) => {
    try {
      const authState = await db.query.baileysAuthState.findFirst({
        where: eq(baileysAuthState.connectionId, connectionId),
      });

      if (!authState) return null;

      if (key === 'creds') {
        return authState.creds;
      }

      const keys = authState.keys as any;
      return keys?.[key] || null;
    } catch (error) {
      console.error('Error reading auth data:', error);
      return null;
    }
  };

  const removeData = async (key: string) => {
    try {
      const authState = await db.query.baileysAuthState.findFirst({
        where: eq(baileysAuthState.connectionId, connectionId),
      });

      if (!authState) return;

      if (key === 'creds') {
        await db
          .update(baileysAuthState)
          .set({ creds: null, updatedAt: new Date() })
          .where(eq(baileysAuthState.connectionId, connectionId));
      } else {
        const currentKeys = (authState.keys as any) || {};
        delete currentKeys[key];
        
        await db
          .update(baileysAuthState)
          .set({ keys: currentKeys, updatedAt: new Date() })
          .where(eq(baileysAuthState.connectionId, connectionId));
      }
    } catch (error) {
      console.error('Error removing auth data:', error);
    }
  };

  const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
          const data: any = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data: any) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData(creds, 'creds');
    },
  };
}

export async function clearAuthState(connectionId: string) {
  try {
    await db
      .delete(baileysAuthState)
      .where(eq(baileysAuthState.connectionId, connectionId));
    console.log(`[Baileys Auth] Cleared auth state for connection ${connectionId}`);
  } catch (error) {
    console.error('[Baileys Auth] Error clearing auth state:', error);
  }
}
