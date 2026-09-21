import { product } from '../src/product.mjs';
import {
  ai,
  db,
  error,
  json,
  requireAuth,
  router,
  storage,
} from '@appdeploy/sdk';

type Source = { title: string; url: string; snippet?: string };
type Conversation = { title: string; createdAt: number; updatedAt: number; deleting?: boolean; recentMessageIds?: string[] };
type StoredMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  sources?: Source[];
};
type Preferences = { autoResearch: boolean; saveSearchHistory: boolean };

// Warm-instance admission control. Distributed atomic limits require platform support.
const requestWindows = new Map<string, {start:number;count:number}>();
function limitRequests(max:number) {
  return (ctx: {user?: {userId:string}}) => {
    const now=Date.now(), key=ctx.user!.userId+':'+max;
    for(const [id,value] of requestWindows) if(now-value.start>=60000)requestWindows.delete(id);
    const window=requestWindows.get(key)||{start:now,count:0};
    window.count++;requestWindows.set(key,window);
    if(window.count>max)return error('طلبات كتير. استنى دقيقة وجرب تاني.',429);
  };
}
function validId(value:unknown): value is string {
  return typeof value==='string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
}
function safeUrl(value:string) {
  try { const u=new URL(value); return ['https:','http:'].includes(u.protocol)?u.href:''; } catch { return ''; }
}
const allowedTypes = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
  'text/plain',
]);
const defaultPreferences: Preferences = product.preferences;

function conversationTable(userId: string) {
  return 'conversations:' + userId;
}
function messageTable(userId: string, conversationId: string) {
  return 'messages:' + userId + ':' + conversationId;
}
function settingsTable(userId: string) {
  return 'settings:' + userId;
}
function searchTable(userId: string) {
  return 'search-history:' + userId;
}

function cleanText(value: unknown, max = 4000) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

function needsResearch(text: string) {
  return (
    /(آخر|احدث|أحدث|اليوم|دلوقتي|حاليا|حالياً|سعر|اخبار|أخبار|موعد|نزل|صدر|تحديث|نتيجة|مين|متى|امتى|كام|كم|latest|today|current|news|price|release|update)/i.test(
      text
    ) || /[؟?]$/.test(text)
  );
}

async function getPreferences(userId: string): Promise<Preferences> {
  const { items } = await db.list<Preferences>(settingsTable(userId), {
    limit: 1,
  });
  if (!items[0]) return defaultPreferences;
  return {
    autoResearch: items[0].autoResearch !== false,
    saveSearchHistory: items[0].saveSearchHistory !== false,
  };
}

async function liveResearch(query: string): Promise<Source[]> {
  const out: Source[] = [];
  try {
    const ddg = await fetch(
      'https://api.duckduckgo.com/?q=' +
        encodeURIComponent(query) +
        '&format=json&no_html=1&skip_disambig=1',
      { headers: { 'User-Agent': 'DAI-AI/1.0' }, signal: AbortSignal.timeout(7000) }
    );
    if (ddg.ok) {
      const data = (await ddg.json()) as {
        AbstractText?: string;
        AbstractURL?: string;
        Heading?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      };
      if (data.AbstractText && data.AbstractURL)
        out.push({
          title: data.Heading || 'DuckDuckGo',
          url: data.AbstractURL,
          snippet: data.AbstractText.slice(0, 900),
        });
      for (const item of data.RelatedTopics || []) {
        if (item.Text && item.FirstURL && out.length < 3)
          out.push({
            title: item.Text.slice(0, 90),
            url: item.FirstURL,
            snippet: item.Text.slice(0, 500),
          });
      }
    }
  } catch (err) {
    console.warn('DuckDuckGo research failed', err);
  }

  try {
    const wiki = await fetch(
      'https://en.wikipedia.org/w/api.php?action=opensearch&search=' +
        encodeURIComponent(query) +
        '&limit=3&namespace=0&format=json&origin=*',
      { headers: { 'User-Agent': 'DAI-AI/1.0' }, signal: AbortSignal.timeout(7000) }
    );
    if (wiki.ok) {
      const data = (await wiki.json()) as [
        string,
        string[],
        string[],
        string[],
      ];
      const titles = data[1] || [];
      const descriptions = data[2] || [];
      const urls = data[3] || [];
      for (let i = 0; i < titles.length && out.length < 5; i++) {
        if (urls[i] && !out.some(s => s.url === urls[i]))
          out.push({
            title: titles[i],
            url: urls[i],
            snippet: descriptions[i] || '',
          });
      }
    }
  } catch (err) {
    console.warn('Wikipedia research failed', err);
  }
  return out.map(source => ({...source,url:safeUrl(source.url)})).filter(source=>source.url).slice(0,5);
}

async function ensureConversation(
  userId: string,
  conversationId: unknown,
  seed: string
): Promise<Conversation & {id:string}> {
  const table = conversationTable(userId);
  if (typeof conversationId === 'string' && conversationId) {
    const [existing] = await db.get<Conversation>(table, [conversationId]);
    if (existing && !existing.deleting) return { id: conversationId, ...existing };
    throw new Error('conversation_not_found');
  }
  const now = Date.now();
  const title = seed.replace(/\s+/g, ' ').slice(0, 45) || 'محادثة جديدة';
  const [id] = await db.add(table, [{ title, createdAt: now, updatedAt: now }]);
  if (!id) throw new Error('conversation_create_failed');
  return { id, title, createdAt: now, updatedAt: now };
}

async function touchConversation(
  userId: string,
  conversation: Conversation & { id: string }
) {
  const next = {
    ...conversation,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: Date.now(),
  };
  const [ok] = await db.update(conversationTable(userId), [
    { id: conversation.id, record: next },
  ]);
  if(!ok) throw new Error('conversation_update_failed');
  return { id: conversation.id, ...next };
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ ok: true })],

  'GET /api/conversations': [
    requireAuth(),
    async ctx => {
      const { items, nextToken } = await db.list<Conversation>(
        conversationTable(ctx.user!.userId),
        { limit: 50, nextToken: ctx.query.cursor || undefined }
      );
      const conversations = items.sort((a, b) => b.updatedAt - a.updatedAt);
      return json({ conversations, nextToken });
    },
  ],

  'POST /api/conversations': [
    requireAuth(), limitRequests(30),
    async ctx => {
      const body = ctx.body as { title?: unknown };
      const title = cleanText(body?.title, 80) || 'محادثة جديدة';
      const now = Date.now();
      const [id] = await db.add(conversationTable(ctx.user!.userId), [
        { title, createdAt: now, updatedAt: now },
      ]);
      if (!id) return error('تعذر إنشاء المحادثة', 500);
      return json(
        { conversation: { id, title, createdAt: now, updatedAt: now } },
        201
      );
    },
  ],

  'DELETE /api/conversations/:id': [
    requireAuth(),
    async ctx => {
      const userId = ctx.user!.userId;
      const id = ctx.params.id;
      const [existing] = await db.get<Conversation>(conversationTable(userId), [
        id,
      ]);
      if (!existing) return error('المحادثة غير موجودة', 404);
      const [marked] = await db.update(conversationTable(userId), [{id,record:{...existing,deleting:true}}]);
      if(!marked) return error('تعذر بدء الحذف',500);
      const { items, nextToken } = await db.list<StoredMessage>(messageTable(userId,id), {limit:100});
      if(items.length) {
        const deleted=await db.delete(messageTable(userId,id),items.map(m=>m.id));
        if(!deleted.every(Boolean))return error('تعذر حذف بعض الرسائل. جرّب تاني.',500);
      }
      if(nextToken)return json({deleted:false,remaining:true});
      const [deleted]=await db.delete(conversationTable(userId),[id]);
      if(!deleted)return error('تعذر إكمال الحذف',500);
      return json({ deleted: true });
    },
  ],

  'GET /api/conversations/:id/messages': [
    requireAuth(),
    async ctx => {
      const userId = ctx.user!.userId;
      const id = ctx.params.id;
      const [existing] = await db.get<Conversation>(conversationTable(userId), [
        id,
      ]);
      if (!existing || existing.deleting) return error('المحادثة غير موجودة', 404);
      const { items, nextToken } = await db.list<StoredMessage>(messageTable(userId, id), {
        limit: 100, nextToken:ctx.query.cursor || undefined,
      });
      const recentIds = !ctx.query.cursor ? existing.recentMessageIds || [] : [];
      const recent = recentIds.length ? await db.get<StoredMessage>(messageTable(userId,id),recentIds) : [];
      const merged = new Map(items.map(item=>[item.id,item]));
      recent.forEach((item,index)=>{if(item)merged.set(recentIds[index],{...item,id:recentIds[index]});});
      return json({
        nextToken,
        messages: [...merged.values()].sort((a,b)=>a.createdAt-b.createdAt),
      });
    },
  ],

  'GET /api/settings': [
    requireAuth(),
    async ctx => json({ preferences: await getPreferences(ctx.user!.userId) }),
  ],

  'PUT /api/settings': [
    requireAuth(),
    async ctx => {
      const userId = ctx.user!.userId;
      const body = ctx.body as Partial<Preferences>;
      if(!body || typeof body.autoResearch !== 'boolean' || typeof body.saveSearchHistory !== 'boolean')return error('إعدادات غير صالحة',400);
      const next: Preferences = {
        autoResearch: body.autoResearch !== false,
        saveSearchHistory: body.saveSearchHistory !== false,
      };
      const table = settingsTable(userId);
      const { items } = await db.list<Preferences>(table, { limit: 1 });
      if (items[0]) {
        const [ok]=await db.update(table,[{id:items[0].id,record:next}]);
        if(!ok)return error('تعذر حفظ الإعدادات',500);
      } else {
        const [id]=await db.add(table,[next]);
        if(!id)return error('تعذر حفظ الإعدادات',500);
      }
      return json({ preferences: next });
    },
  ],

  'POST /api/files': [
    requireAuth(), limitRequests(10),
    async ctx => {
      const body = ctx.body as {
        name?: unknown;
        contentType?: unknown;
        base64?: unknown;
      };
      const name = cleanText(body?.name, 120).replace(
        /[^\p{L}\p{N}._ -]/gu,
        '_'
      );
      const contentType =
        typeof body?.contentType === 'string' ? body.contentType : '';
      const base64 = typeof body?.base64 === 'string' ? body.base64 : '';
      if (!name || !allowedTypes.has(contentType) || !base64)
        return error('نوع ملف غير مسموح', 400);
      if(base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64))return error('ملف غير صالح',400);
      const estimatedBytes = Math.floor(base64.length * .75) - (base64.endsWith('==')?2:base64.endsWith('=')?1:0);
      if (estimatedBytes > 2 * 1024 * 1024)
        return error('الملف أكبر من الحد المسموح', 413);
      const bytes=Buffer.from(base64,'base64');
      const signatureOk=contentType==='image/png' ? bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'
        : contentType==='image/jpeg' ? bytes.subarray(0,3).toString('hex')==='ffd8ff'
        : contentType==='application/pdf' ? bytes.subarray(0,5).toString()==='%PDF-'
        : !bytes.includes(0) && !bytes.toString('utf8').includes('\uFFFD');
      if(!signatureOk)return error('محتوى الملف لا يطابق نوعه',400);
      const path =
        'users/' + ctx.user!.userId + '/uploads/' + crypto.randomUUID() + '-' + name;
      const [ok] = await storage.write([
        { path, content: base64, contentType },
      ]);
      if (!ok) return error('تعذر حفظ الملف', 500);
      const [{ url }] = await storage.url([path]);
      return json({ file: { name, contentType, url } }, 201);
    },
  ],

  'POST /api/chat': [
    requireAuth(), limitRequests(12),
    async ctx => {
      const body = ctx.body as {
        conversationId?: unknown;
        message?: unknown;
        autoResearch?: unknown;
      };
      if(typeof body?.message!=='string' || body.message.length>4000)return error('الرسالة غير صالحة أو طويلة جدًا',400);
      if(body.conversationId != null && !validId(body.conversationId))return error('معرّف محادثة غير صالح',400);
      const message = cleanText(body?.message, 4000);
      if (!message) return error('اكتب رسالة أولًا', 400);
      const userId = ctx.user!.userId;
      const preferences = await getPreferences(userId);
      if(body.conversationId) {
        const [owned]=await db.get<Conversation>(conversationTable(userId),[body.conversationId as string]);
        if(!owned || owned.deleting)return error('المحادثة غير موجودة',404);
      }
      const conversation = await ensureConversation(
        userId,
        body.conversationId,
        message
      );
      const msgTable = messageTable(userId, conversation.id);
      const now = Date.now();
      const [userMessageId] = await db.add(msgTable, [
        { role: 'user', content: message, createdAt: now },
      ]);
      if (!userMessageId) return error('تعذر حفظ الرسالة', 500);

      const doResearch =
        body.autoResearch !== false &&
        preferences.autoResearch &&
        needsResearch(message);
      const sources = doResearch ? await liveResearch(message) : [];
      if (sources.length && preferences.saveSearchHistory) {
        await db.add(searchTable(userId), [
          { query: message, sources, conversationId:conversation.id, createdAt: now },
        ]);
      }

      const oldIds=conversation.recentMessageIds || [];
      const items = oldIds.length
        ? (await db.get<StoredMessage>(msgTable,[...oldIds,userMessageId])).filter((item):item is StoredMessage=>!!item)
        : (await db.list<StoredMessage>(msgTable,{limit:30})).items;
      if(!oldIds.length) conversation.recentMessageIds = (items as Array<StoredMessage & {id?:string}>).map(item=>item.id).filter((id):id is string=>!!id);
      if(!items.some(m=>m.role==='user' && m.createdAt===now))items.push({role:'user',content:message,createdAt:now});
      const history = items
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-16)
        .map(m => ({ role: m.role, content: m.content }));
      const researchContext = sources.length
        ? '\n\nمصادر بحث فعلية متاحة لهذه الرسالة:\n' +
          sources
            .map(
              (s, i) =>
                '[' +
                (i + 1) +
                '] ' +
                s.title +
                '\n' +
                (s.snippet || '') +
                '\n' +
                s.url
            )
            .join('\n\n')
        : doResearch
          ? '\n\nتمت محاولة البحث الخارجي لكن لم يتم العثور على مصادر مفيدة. لا تدّعي أنك بحثت أو أن معلوماتك آنية.'
          : '';

      const generated = await ai.generate({
        messages: history,
        system:
          product.systemPrompt +
          researchContext,
        maxTokens: 1200,
        temperature: 0.5,
        thinkingMode: 'FAST',
      });

      const answer =
        cleanText(generated.text, 12000) ||
        'مش قادرة أصيغ رد مناسب دلوقتي. جرّب تاني.';
      const answerRecord: StoredMessage = {
        role: 'assistant',
        content: answer,
        createdAt: Date.now(),
        sources,
      };
      const [assistantId] = await db.add(msgTable, [answerRecord]);
      if (!assistantId) return error('تعذر حفظ الرد', 500);
      const [stillPresent]=await db.get<Conversation>(conversationTable(userId),[conversation.id]);
      if(!stillPresent || stillPresent.deleting) {
        await db.delete(msgTable,[userMessageId,assistantId]);
        return error('المحادثة اتحذفت أثناء تجهيز الرد',409);
      }
      const updatedConversation = await touchConversation(userId, {
        ...conversation, ...stillPresent,
        recentMessageIds:[...new Set([...(stillPresent.recentMessageIds || conversation.recentMessageIds || []),userMessageId,assistantId])].slice(-30)
      });
      return json({
        conversation: updatedConversation,
        userMessageId,
        message: { id: assistantId, ...answerRecord },
      });
    },
  ],
});
