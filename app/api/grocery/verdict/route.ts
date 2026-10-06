import { handleVerdict } from "@/lib/api/handlers";

export const POST = (request: Request) => handleVerdict("grocery", request);
