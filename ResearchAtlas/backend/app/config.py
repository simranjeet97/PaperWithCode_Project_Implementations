import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "ResearchAtlas API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Server
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    DEBUG: bool = True
    
    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")  # ollama | gemini | openai | mock
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
    
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    
    # Pipeline Limits
    MAX_CANDIDATE_PAPERS: int = int(os.getenv("MAX_CANDIDATE_PAPERS", "30"))
    TOP_SYNTHESIS_PAPERS: int = int(os.getenv("TOP_SYNTHESIS_PAPERS", "10"))
    
    # Reranking Model
    CROSS_ENCODER_MODEL: str = os.getenv("CROSS_ENCODER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
    
    # Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "research_atlas.db")
    TASK_STORE_PATH: str = os.getenv("TASK_STORE_PATH", "research_atlas_store.json")


settings = Settings()

