import { proxyGetToMlService } from "@/lib/ml-proxy";

export async function GET() {
  return proxyGetToMlService("/graph");
}
