'use server';

import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// =====================================================
// SCHEMAS
// =====================================================

const articleSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(100),
  title: z.string().min(1),
  body: z.string(),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(true),
});

const createTicketSchema = z.object({
  subject: z.string().min(1),
  category: z.enum(['AR', 'AP', 'Tax', 'Reconciliation', 'Reporting', 'Other']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  description: z.string().optional(),
  attachments: z.array(z.string()).default([]),
});

const updateTicketSchema = z.object({
  ticketId: z.string().uuid(),
  subject: z.string().optional(),
  category: z.enum(['AR', 'AP', 'Tax', 'Reconciliation', 'Reporting', 'Other']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
  assignedTo: z.string().uuid().optional(),
});

const addCommentSchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().min(1),
  isInternal: z.boolean().default(false),
});

const listTicketsSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
  category: z.enum(['AR', 'AP', 'Tax', 'Reconciliation', 'Reporting', 'Other']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
});

const listArticlesSchema = z.object({
  query: z.string().optional(),
  tag: z.string().optional(),
  publishedOnly: z.boolean().default(true),
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getTenantAndRole(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const tenantId = user.user_metadata?.tenant_id || user.id;
  const role = user.user_metadata?.role;

  return { userId: user.id, tenantId, role };
}

function checkFinanceRole(role: string) {
  if (!['admin', 'finance'].includes(role)) {
    throw new Error('Access denied: Admin or Finance role required');
  }
}

async function logActivity(
  supabase: any,
  tenantId: string,
  userId: string,
  entity: string,
  entityId: string | null,
  action: string,
  diff: any = null
) {
  await supabase.from('activity_log').insert({
    tenant_id: tenantId,
    actor_user_id: userId,
    entity,
    entity_id: entityId,
    action,
    diff,
  });
}

// =====================================================
// ARTICLE ACTIONS
// =====================================================

export async function listArticles(input?: z.infer<typeof listArticlesSchema>) {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const validated = input ? listArticlesSchema.parse(input) : { publishedOnly: true };

  let query = supabase
    .from('support_articles')
    .select('*')
    .eq('tenant_id', tenantId);

  if (validated.publishedOnly) {
    query = query.eq('is_published', true);
  }

  if (validated.query) {
    query = query.or(`title.ilike.%${validated.query}%,body.ilike.%${validated.query}%`);
  }

  if (validated.tag) {
    query = query.contains('tags', [validated.tag]);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getArticle(slug: string) {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const { data, error } = await supabase
    .from('support_articles')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data;
}

export async function upsertArticle(input: z.infer<typeof articleSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const validated = articleSchema.parse(input);

  if (validated.id) {
    // Update
    const { data: existing } = await supabase
      .from('support_articles')
      .select('*')
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .single();

    const { data, error } = await supabase
      .from('support_articles')
      .update({
        slug: validated.slug,
        title: validated.title,
        body: validated.body,
        tags: validated.tags,
        is_published: validated.isPublished,
      })
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'support_articles', data.id, 'updated', {
      before: existing,
      after: data,
    });

    revalidatePath('/finance/support');
    return data;
  } else {
    // Create
    const { data, error } = await supabase
      .from('support_articles')
      .insert({
        tenant_id: tenantId,
        slug: validated.slug,
        title: validated.title,
        body: validated.body,
        tags: validated.tags,
        is_published: validated.isPublished,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(supabase, tenantId, userId, 'support_articles', data.id, 'created');

    revalidatePath('/finance/support');
    return data;
  }
}

export async function toggleArticle(slug: string, isPublished: boolean) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const { data, error } = await supabase
    .from('support_articles')
    .update({ is_published: isPublished })
    .eq('slug', slug)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'support_articles', data.id, 'toggled', {
    is_published: isPublished,
  });

  revalidatePath('/finance/support');
  return data;
}

export async function deleteArticle(slug: string) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const { data, error } = await supabase
    .from('support_articles')
    .delete()
    .eq('slug', slug)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'support_articles', data.id, 'deleted');

  revalidatePath('/finance/support');
}

// =====================================================
// TICKET ACTIONS
// =====================================================

export async function createTicket(input: z.infer<typeof createTicketSchema>) {
  const supabase = await createClient();
  const { userId, tenantId } = await getTenantAndRole(supabase);

  const validated = createTicketSchema.parse(input);

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      tenant_id: tenantId,
      created_by: userId,
      subject: validated.subject,
      category: validated.category,
      priority: validated.priority,
      description: validated.description,
      attachments: validated.attachments,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'support_tickets', data.id, 'created');

  // TODO: Send notification email

  revalidatePath('/finance/support');
  return data;
}

export async function listTickets(input?: z.infer<typeof listTicketsSchema>) {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const validated = input ? listTicketsSchema.parse(input) : {};

  let query = supabase
    .from('support_tickets')
    .select('*')
    .eq('tenant_id', tenantId);

  if (validated.status) {
    query = query.eq('status', validated.status);
  }

  if (validated.category) {
    query = query.eq('category', validated.category);
  }

  if (validated.priority) {
    query = query.eq('priority', validated.priority);
  }

  if (validated.assignedTo) {
    query = query.eq('assigned_to', validated.assignedTo);
  }

  if (validated.createdBy) {
    query = query.eq('created_by', validated.createdBy);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTicket(ticketId: string) {
  const supabase = await createClient();
  const { tenantId, role } = await getTenantAndRole(supabase);

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('tenant_id', tenantId)
    .single();

  if (ticketError) throw ticketError;

  // Get comments
  let commentsQuery = supabase
    .from('support_comments')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('tenant_id', tenantId);

  // Hide internal comments from non-finance users
  if (!['admin', 'finance'].includes(role)) {
    commentsQuery = commentsQuery.eq('is_internal', false);
  }

  const { data: comments, error: commentsError } = await commentsQuery.order('created_at');

  if (commentsError) throw commentsError;

  return {
    ...ticket,
    comments: comments || [],
  };
}

export async function updateTicket(input: z.infer<typeof updateTicketSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);

  const validated = updateTicketSchema.parse(input);

  // Check permissions
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('created_by')
    .eq('id', validated.ticketId)
    .eq('tenant_id', tenantId)
    .single();

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const isOwner = ticket.created_by === userId;
  const isFinance = ['admin', 'finance'].includes(role);

  if (!isOwner && !isFinance) {
    throw new Error('Access denied');
  }

  const { data: existing } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', validated.ticketId)
    .single();

  const updates: any = {};
  if (validated.subject) updates.subject = validated.subject;
  if (validated.category) updates.category = validated.category;
  if (validated.priority) updates.priority = validated.priority;
  if (validated.status) updates.status = validated.status;
  if (validated.assignedTo !== undefined) updates.assigned_to = validated.assignedTo;

  const { data, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', validated.ticketId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'support_tickets', data.id, 'updated', {
    before: existing,
    after: data,
  });

  revalidatePath('/finance/support');
  return data;
}

export async function addComment(input: z.infer<typeof addCommentSchema>) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);

  const validated = addCommentSchema.parse(input);

  // Verify ticket exists and user has access
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('id', validated.ticketId)
    .eq('tenant_id', tenantId)
    .single();

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  // Only finance can add internal notes
  if (validated.isInternal && !['admin', 'finance'].includes(role)) {
    throw new Error('Access denied: Cannot create internal notes');
  }

  const { data, error } = await supabase
    .from('support_comments')
    .insert({
      tenant_id: tenantId,
      ticket_id: validated.ticketId,
      author_id: userId,
      body: validated.body,
      is_internal: validated.isInternal,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'support_comments', data.id, 'created');

  // TODO: Send notification email

  revalidatePath('/finance/support');
  return data;
}

export async function assignTicket(ticketId: string, userId: string | null) {
  const supabase = await createClient();
  const { userId: currentUserId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const { data, error } = await supabase
    .from('support_tickets')
    .update({ assigned_to: userId })
    .eq('id', ticketId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, currentUserId, 'support_tickets', ticketId, 'assigned', {
    assigned_to: userId,
  });

  revalidatePath('/finance/support');
  return data;
}

export async function closeTicket(ticketId: string) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);

  // Check permissions
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('created_by')
    .eq('id', ticketId)
    .eq('tenant_id', tenantId)
    .single();

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const isOwner = ticket.created_by === userId;
  const isFinance = ['admin', 'finance'].includes(role);

  if (!isOwner && !isFinance) {
    throw new Error('Access denied');
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status: 'closed' })
    .eq('id', ticketId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'support_tickets', ticketId, 'closed');

  revalidatePath('/finance/support');
  return data;
}

export async function attachFiles(ticketId: string, files: string[]) {
  const supabase = await createClient();
  const { userId, tenantId } = await getTenantAndRole(supabase);

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('attachments')
    .eq('id', ticketId)
    .eq('tenant_id', tenantId)
    .single();

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const newAttachments = [...(ticket.attachments || []), ...files];

  const { data, error } = await supabase
    .from('support_tickets')
    .update({ attachments: newAttachments })
    .eq('id', ticketId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'support_tickets', ticketId, 'files_attached', {
    files,
  });

  revalidatePath('/finance/support');
  return data;
}

// =====================================================
// SUPPORT PREFERENCES
// =====================================================

export async function getSupportPrefs() {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const { data, error } = await supabase
    .from('support_prefs')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateSupportPrefs(input: any) {
  const supabase = await createClient();
  const { userId, tenantId, role } = await getTenantAndRole(supabase);
  checkFinanceRole(role);

  const { data, error } = await supabase
    .from('support_prefs')
    .upsert({
      tenant_id: tenantId,
      ...input,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, tenantId, userId, 'support_prefs', data.id, 'updated');

  revalidatePath('/finance/support');
  return data;
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getSupportStats() {
  const supabase = await createClient();
  const { tenantId } = await getTenantAndRole(supabase);

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('status, priority')
    .eq('tenant_id', tenantId);

  const stats = {
    total: tickets?.length || 0,
    open: tickets?.filter(t => t.status === 'open').length || 0,
    inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
    urgent: tickets?.filter(t => t.priority === 'urgent').length || 0,
  };

  return stats;
}
