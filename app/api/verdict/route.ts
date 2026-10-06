import { handleVerdict } from "@/lib/api/handlers";

export const POST = (request: Request) => handleVerdict("tech", request);
