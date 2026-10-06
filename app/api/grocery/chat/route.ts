import { handleChat } from "@/lib/api/handlers";

export const POST = (request: Request) => handleChat("grocery", request);
