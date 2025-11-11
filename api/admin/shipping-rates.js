import { supabaseAdmin, authenticateAdmin } from '../_lib/supabase-admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    authenticateAdmin(req);

    const { method, query, body } = req;
    const { id } = query;

    switch (method) {
      case 'GET':
        return await handleGet(res);
      case 'POST':
        return await handleCreate(res, body);
      case 'PUT':
        return await handleUpdate(res, id, body);
      case 'DELETE':
        return await handleDelete(res, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

async function handleGet(res) {
  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .select('*')
    .order('courier', { ascending: true });

  if (error) throw error;
  return res.json(data.map(mapFromDB));
}

async function handleCreate(res, body) {
  const dbData = {
    courier: body.courier,
    state: body.state,
    first_kg: body.firstKg,
    additional_kg: body.additionalKg,
    payment_type: body.paymentType || 'prepaid'
  };

  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .insert([dbData])
    .select()
    .single();

  if (error) throw error;
  return res.json(mapFromDB(data));
}

async function handleUpdate(res, id, body) {
  const dbUpdates = {};
  if (body.courier !== undefined) dbUpdates.courier = body.courier;
  if (body.state !== undefined) dbUpdates.state = body.state;
  if (body.firstKg !== undefined) dbUpdates.first_kg = body.firstKg;
  if (body.additionalKg !== undefined) dbUpdates.additional_kg = body.additionalKg;
  if (body.paymentType !== undefined) dbUpdates.payment_type = body.paymentType;

  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return res.json(mapFromDB(data));
}

async function handleDelete(res, id) {
  const { error } = await supabaseAdmin
    .from('shipping_rates')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return res.json({ success: true });
}

function mapFromDB(data) {
  return {
    id: data.id,
    courier: data.courier,
    state: data.state,
    firstKg: data.first_kg,
    additionalKg: data.additional_kg,
    paymentType: data.payment_type || 'prepaid'
  };
}
