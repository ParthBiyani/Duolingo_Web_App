from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(
        title="Duolingo Web App API",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    @app.get("/api/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
