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
    courier: data.courier,
    state: data.state,
    firstKg: data.first_kg,
    additionalKg: data.additional_kg,
    paymentType: data.payment_type || 'prepaid',
  };
}

export async function GET(request) {
  try {
    authenticateAdmin(request);
    const supabaseAdmin = createServerSupabaseClient();

    const { data, error } = await supabaseAdmin
      .from('shipping_rates')
      .select('*')
      .order('courier', { ascending: true });

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

    const dbData = {
      courier: body.courier,
      state: body.state,
      first_kg: body.firstKg,
      additional_kg: body.additionalKg,
      payment_type: body.paymentType || 'prepaid',
    };

    const { data, error } = await supabaseAdmin.from('shipping_rates').insert([dbData]).select().single();
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
    if (body.courier !== undefined) dbUpdates.courier = body.courier;
    if (body.state !== undefined) dbUpdates.state = body.state;
    if (body.firstKg !== undefined) dbUpdates.first_kg = body.firstKg;
    if (body.additionalKg !== undefined) dbUpdates.additional_kg = body.additionalKg;
    if (body.paymentType !== undefined) dbUpdates.payment_type = body.paymentType;

    const { data, error } = await supabaseAdmin.from('shipping_rates').update(dbUpdates).eq('id', id).select().single();
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

    const { error } = await supabaseAdmin.from('shipping_rates').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
