import { PrismaClient, TestRun } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Define the expected shape of the POST request body
interface PostRequestBody {
  result: string;
  logs: string;
}

// POST handler
export async function POST(request: Request): Promise<Response> {
  try {
    const body: PostRequestBody = await request.json();

    const testRun: TestRun = await prisma.testRun.create({
      data: {
        result: body.result,
        logs: body.logs,
      },
    });

    return new Response(JSON.stringify(testRun), { status: 201 });
  } catch (error) {
    const errorMessage = (error as Error).message;
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}

// GET handler
export async function GET(request: Request): Promise<Response> {
  try {
    const testRuns: TestRun[] = await prisma.testRun.findMany({
      orderBy: { timestamp: 'desc' },
    });

    return new Response(JSON.stringify(testRuns), { status: 200 });
  } catch (error) {
    const errorMessage = (error as Error).message;
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
