from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import resume, questions   # UPDATED

app = FastAPI(title="Campus Interview Prep Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://hireready-ai-interview.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(questions.router)   # NEW

@app.get("/")
def read_root():
    return {"status": "Backend is running", "project": "Interview Prep Bot"}

@app.get("/health")
def health_check():
    return {"status": "ok"}