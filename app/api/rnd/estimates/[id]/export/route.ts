import { NextResponse } from 'next/server'
import { exportEstimate } from '@/app/rnd/_actions/estimates'

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  try {
    const data = await exportEstimate(id)
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="launch_estimate_${id}.json"`,
      },
    })
  } catch (error) {
    const err = error as Error
    console.error('Export estimate failed', err)
    return NextResponse.json(
      { error: err.message ?? 'Unable to export estimate' },
      { status: 500 },
    )
  }
}
