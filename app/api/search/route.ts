import { handleSearch } from "@/lib/api/handlers";

export const POST = (request: Request) => handleSearch("tech", request);
