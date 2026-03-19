// CORS Headers configuration

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export function handleOptions(): Response {
    return new Response(null, {
        status: 200,
        headers: {
            ...corsHeaders,
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
