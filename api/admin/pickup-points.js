import { supabaseAdmin, authenticateAdmin } from '../_lib/supabase-admin.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Authenticate admin
    authenticateAdmin(req);

    const { method, query, body } = req;
    const { id } = query;

    switch (method) {
      case 'GET':
        return await handleGet(res, id);
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
    return res.status(statusCode).json({
      error: error.message || 'Internal server error'
    });
  }
}

async function handleGet(res, id) {
  if (id) {
    // Get single pickup point
    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return res.json(mapFromDB(data));
  } else {
    // Get all pickup points
    const { data, error } = await supabaseAdmin
      .from('pickup_points')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return res.json(data.map(mapFromDB));
  }
}

async function handleCreate(res, body) {
  const dbData = {
    courier_service: body.courierService,
    state: body.state,
    city: body.city,
    address: body.address,
    working_hours: body.workingHours,
    phone: body.phone,
    active: body.active !== undefined ? body.active : true
  };

  const { data, error } = await supabaseAdmin
    .from('pickup_points')
    .insert([dbData])
    .select()
    .single();

  if (error) throw error;
  return res.json(mapFromDB(data));
}

async function handleUpdate(res, id, body) {
  const dbUpdates = {};
  if (body.courierService !== undefined) dbUpdates.courier_service = body.courierService;
  if (body.state !== undefined) dbUpdates.state = body.state;
  if (body.city !== undefined) dbUpdates.city = body.city;
  if (body.address !== undefined) dbUpdates.address = body.address;
  if (body.workingHours !== undefined) dbUpdates.working_hours = body.workingHours;
  if (body.phone !== undefined) dbUpdates.phone = body.phone;
  if (body.active !== undefined) dbUpdates.active = body.active;

  const { data, error } = await supabaseAdmin
    .from('pickup_points')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return res.json(mapFromDB(data));
}

async function handleDelete(res, id) {
  const { error } = await supabaseAdmin
    .from('pickup_points')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return res.json({ success: true });
}

// Map database fields to camelCase
function mapFromDB(data) {
  return {
    id: data.id,
    courierService: data.courier_service,
    state: data.state,
    city: data.city,
    address: data.address,
    workingHours: data.working_hours,
    phone: data.phone,
    active: data.active,
    createdAt: data.created_at,
    displayOrder: data.display_order
  };
}
