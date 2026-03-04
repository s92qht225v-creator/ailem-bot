import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../src/lib/supabase-server';

function authenticateAdmin(request) {
  const adminPassword = request.headers.get('x-admin-password');
  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envPassword) throw new Error('ADMIN_PASSWORD not configured');
  if (adminPassword !== envPassword) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
}

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
    displayOrder: data.display_order,
  };
}

export async function GET(request) {
  try {
    authenticateAdmin(request);
    const supabaseAdmin = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const { data, error } = await supabaseAdmin.from('pickup_points').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json(mapFromDB(data));
    }

    const { data, error } = await supabaseAdmin.from('pickup_points').select('*').order('display_order', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data.map(mapFromDB));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function POST(request) {
  try {
    authenticateAdmin(request);
    const supabaseAdmin = createServerSupabaseClient();
    const body = await request.json();

    const { data: maxData } = await supabaseAdmin
      .from('pickup_points')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextDisplayOrder = (maxData?.display_order || 0) + 1;

    const dbData = {
      courier_service: body.courierService,
      state: body.state,
      city: body.city,
      address: body.address,
      working_hours: body.workingHours,
      phone: body.phone,
      active: body.active !== undefined ? body.active : true,
      display_order: nextDisplayOrder,
    };

    const { data, error } = await supabaseAdmin.from('pickup_points').insert([dbData]).select().single();
    if (error) throw error;
    return NextResponse.json(mapFromDB(data));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function PUT(request) {
  try {
    authenticateAdmin(request);
    const supabaseAdmin = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    const dbUpdates = {};
    if (body.courierService !== undefined) dbUpdates.courier_service = body.courierService;
    if (body.state !== undefined) dbUpdates.state = body.state;
    if (body.city !== undefined) dbUpdates.city = body.city;
    if (body.address !== undefined) dbUpdates.address = body.address;
    if (body.workingHours !== undefined) dbUpdates.working_hours = body.workingHours;
    if (body.phone !== undefined) dbUpdates.phone = body.phone;
    if (body.active !== undefined) dbUpdates.active = body.active;

    const { data, error } = await supabaseAdmin.from('pickup_points').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json(mapFromDB(data));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function DELETE(request) {
  try {
    authenticateAdmin(request);
    const supabaseAdmin = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { error } = await supabaseAdmin.from('pickup_points').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
